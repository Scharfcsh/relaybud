import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { getTransporter, resetTransporter } from "@/lib/mailer";
import { renderTemplate } from "@/lib/handlebars";
import { Template } from "@/models/Template";
import { NotificationLog } from "@/models/NotificationLog";

const MAX_RECIPIENTS = 500;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Recipient {
  email?: unknown;
  [key: string]: unknown;
}

interface SendResult {
  email: string;
  status: "sent" | "failed";
  error?: string;
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { templateId, recipients } = body as {
      templateId?: string;
      recipients?: Recipient[];
    };

    if (!templateId || !mongoose.isValidObjectId(templateId)) {
      return NextResponse.json(
        { error: "A valid templateId is required" },
        { status: 400 }
      );
    }

    if (!Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json(
        { error: "recipients must be a non-empty array" },
        { status: 400 }
      );
    }

    if (recipients.length > MAX_RECIPIENTS) {
      return NextResponse.json(
        {
          error: `Too many recipients (${recipients.length}). Max ${MAX_RECIPIENTS} per send.`,
        },
        { status: 400 }
      );
    }

    const template = await Template.findById(templateId).lean();
    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    const transporter = getTransporter();
    try {
      await transporter.verify();
    } catch (verifyErr) {
      resetTransporter();
      const msg =
        verifyErr instanceof Error ? verifyErr.message : String(verifyErr);
      console.error("[send-batch] SMTP verify failed:", msg);
      return NextResponse.json(
        { error: "SMTP connection failed" },
        { status: 503 }
      );
    }

    const results: SendResult[] = [];
    let sent = 0;
    let failed = 0;

    for (const recipient of recipients) {
      const email =
        typeof recipient.email === "string" ? recipient.email.trim() : "";

      if (!email || !EMAIL_RE.test(email)) {
        failed++;
        results.push({
          email: email || "(missing)",
          status: "failed",
          error: "Missing or invalid email address",
        });
        await NotificationLog.create({
          email: email || "(missing)",
          event: template.event,
          templateId: template._id,
          status: "failed",
          errorMessage: "Missing or invalid email address",
          metadata: recipient,
        });
        continue;
      }

      const renderedSubject = renderTemplate(template.subject, recipient);
      const renderedBody = renderTemplate(template.body, recipient);

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

        if (info.rejected.length > 0) {
          throw new Error(
            `SMTP rejected recipients: ${info.rejected.join(", ")}`
          );
        }

        sentAt = new Date();
        sent++;
      } catch (mailErr: unknown) {
        resetTransporter();
        status = "failed";
        errorMessage =
          mailErr instanceof Error ? mailErr.message : "Mail send failed";
        failed++;
        console.error(`[send-batch] Failed to send to ${email}:`, errorMessage);
      }

      results.push({
        email,
        status,
        ...(errorMessage ? { error: errorMessage } : {}),
      });

      await NotificationLog.create({
        email,
        event: template.event,
        templateId: template._id,
        status,
        errorMessage,
        sentAt,
        metadata: recipient,
      });
    }

    return NextResponse.json({ success: true, sent, failed, results });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[POST /api/send-batch]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
