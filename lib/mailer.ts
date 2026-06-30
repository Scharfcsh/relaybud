import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

declare global {
  // eslint-disable-next-line no-var
  var _mailerTransporter: Transporter | null;
}

export function getTransporter(): Transporter {
  if (!global._mailerTransporter) {
    global._mailerTransporter = nodemailer.createTransport({
      host: "smtp.hostinger.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.NODEMAILER_USER,
        pass: process.env.NODEMAILER_PASS,
      },
    });
  }
  return global._mailerTransporter;
}

export function resetTransporter(): void {
  global._mailerTransporter = null;
}
