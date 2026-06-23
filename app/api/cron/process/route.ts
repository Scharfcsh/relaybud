import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getRedis } from "@/lib/redis";
import { getTransporter } from "@/lib/mailer";
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
        const transporter = getTransporter();
        await transporter.sendMail({
          from: process.env.NODEMAILER_FROM,
          to: email,
          subject: renderedSubject,
          html: renderedBody,
        });
        sentAt = new Date();
        processed++;
        console.log(`[Cron] Sent "${type}" to ${email}`);
      } catch (mailErr: unknown) {
        status = "failed";
        errorMessage =
          mailErr instanceof Error ? mailErr.message : "Mail send failed";
        failed++;
        console.error(`[Cron] Failed to send to ${email}:`, errorMessage);
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
