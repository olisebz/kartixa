import nodemailer from "nodemailer";
import { config } from "@/server/config";
import { logger } from "@/server/logger";

interface SendSecurityEmailInput {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!config.mail.enabled) {
    return null;
  }

  if (transporter) {
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host: config.mail.host,
    port: config.mail.port,
    secure: config.mail.secure,
    auth:
      config.mail.user && config.mail.password
        ? {
            user: config.mail.user,
            pass: config.mail.password,
          }
        : undefined,
  });

  return transporter;
}

export async function sendSecurityEmail(input: SendSecurityEmailInput): Promise<void> {
  const transport = getTransporter();

  if (!transport) {
    logger.warn("SMTP not configured; security email logged for development", {
      to: input.to,
      subject: input.subject,
      text: input.text,
    });
    return;
  }

  await transport.sendMail({
    from: config.mail.from,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
  });
}
