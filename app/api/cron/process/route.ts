import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getRedis } from "@/lib/redis";
import { getTransporter, resetTransporter } from "@/lib/mailer";
import { renderTemplate } from "@/lib/handlebars";
import { Template } from "@/models/Template";
import { NotificationLog } from "@/models/NotificationLog";

const BATCH_SIZE = parseInt(process.env.CRON_BATCH_SIZE ?? "50", 10);

interface QueuedEvent {
  email: string;
  type: string;
  metadata: Record<string, unknown>;
  queuedAt: string;
  campaignId?: string;
}

export async function GET() {
  let processed = 0;
  let failed = 0;

  try {
    const redis = getRedis();
    await connectDB();
    console.log("[Cron] Connected to MongoDB and Redis, starting processing...");

    const transporter = getTransporter();
    try {
      await transporter.verify();
      console.log("[Cron] SMTP connection verified OK");
    } catch (verifyErr) {
      resetTransporter();
      const msg = verifyErr instanceof Error ? verifyErr.message : String(verifyErr);
      console.error("[Cron] SMTP verify failed — resetting transporter:", msg);
      return NextResponse.json(
        { error: "SMTP connection failed", processed: 0, failed: 0 },
        { status: 503 }
      );
    }

    for (let i = 0; i < BATCH_SIZE; i++) {
      let raw: string | null;
      try {
        raw = await redis.lpop("notifications");
      } catch (redisErr: unknown) {
        const msg = redisErr instanceof Error ? redisErr.message : "Redis error";
        console.error("[Cron] Redis LPOP error:", msg);
        break;
      }

      if (!raw) break;

      let event: QueuedEvent;
      try {
        event = JSON.parse(raw) as QueuedEvent;
      } catch {
        console.error("[Cron] Failed to parse queued event:", raw);
        continue;
      }

      const { email, type, metadata } = event;

      const template = await Template.findOne({
        event: type,
        isActive: true,
      }).lean();

      if (!template) {
        await NotificationLog.create({
          email,
          event: type,
          status: "failed",
          errorMessage: `No active template found for event "${type}"`,
          metadata,
        });
        failed++;
        console.error(`[Cron] No template for event "${type}", email: ${email}`);
        continue;
      }

      const renderedSubject = renderTemplate(template.subject, metadata);
      const renderedBody = renderTemplate(template.body, metadata);

      let status: "sent" | "failed" = "sent";
      let errorMessage: string | undefined;
      let sentAt: Date | undefined;

      try {
        const info = await transporter.sendMail({
          from: process.env.NODEMAILER_FROM,
          to: email,
          subject: renderedSubject,
          html: renderedBody,
        });
        console.log("[Cron] SMTP info:", JSON.stringify(info, null, 2));
        console.log("[Cron] Email sent:", {
          from: process.env.NODEMAILER_FROM,
          to: email,
          subject: renderedSubject,
          htmlLength: renderedBody.length,
        });

        console.log(
          `[Cron] SMTP response for "${type}" → ${email}: ${info.response} | messageId: ${info.messageId} | accepted: [${info.accepted}] | rejected: [${info.rejected}]`
        );

        if (info.rejected.length > 0) {
          throw new Error(`SMTP rejected recipients: ${info.rejected.join(", ")}`);
        }

        sentAt = new Date();
        processed++;
        console.log(`[Cron] Sent "${type}" to ${email}`);
      } catch (mailErr: unknown) {
        resetTransporter();
        status = "failed";
        errorMessage =
          mailErr instanceof Error ? mailErr.message : "Mail send failed";
        failed++;
        console.error(`[Cron] Failed to send "${type}" to ${email}:`, errorMessage);
      }

      await NotificationLog.create({
        email,
        event: type,
        templateId: template._id,
        status,
        errorMessage,
        sentAt,
        metadata,
      });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    console.error("[Cron] Unexpected error:", message);
    return NextResponse.json(
      { error: message, processed, failed },
      { status: 500 }
    );
  }

  console.log(`[Cron] Done — processed: ${processed}, failed: ${failed}`);
  return NextResponse.json({ success: true, processed, failed });
}
