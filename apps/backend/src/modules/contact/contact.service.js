import nodemailer from "nodemailer";
import { StatusCodes } from "http-status-codes";
import { env } from "../../config/env.js";
import { AppError } from "../../core/errors/app-error.js";

const ensureMailConfiguration = () => {
  if (!env.smtpHost || !env.smtpUser || !env.smtpPass || !env.smtpFrom || !env.contactRecipientEmail) {
    throw new AppError("Contact email service is not configured", StatusCodes.SERVICE_UNAVAILABLE);
  }
};

const buildTransporter = () =>
  nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpSecure,
    auth: {
      user: env.smtpUser,
      pass: env.smtpPass
    }
  });

export const sendContactMessage = async ({ payload }) => {
  ensureMailConfiguration();

  const transporter = buildTransporter();
  const safeSubject = payload.subject.trim();
  const safeMessage = payload.message.trim();
  const safeFullName = payload.fullName.trim();
  const safeEmail = payload.email.trim().toLowerCase();

  await transporter.sendMail({
    from: env.smtpFrom,
    to: env.contactRecipientEmail,
    replyTo: safeEmail,
    subject: `[Yopii Contact] ${safeSubject}`,
    text: [
      `Nom: ${safeFullName}`,
      `Email: ${safeEmail}`,
      `Sujet: ${safeSubject}`,
      "",
      safeMessage
    ].join("\n"),
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
        <h2>Nouveau message de contact Yopii</h2>
        <p><strong>Nom:</strong> ${safeFullName}</p>
        <p><strong>Email:</strong> ${safeEmail}</p>
        <p><strong>Sujet:</strong> ${safeSubject}</p>
        <p><strong>Message:</strong></p>
        <p>${safeMessage.replace(/\n/g, "<br />")}</p>
      </div>
    `
  });

  return {
    delivered: true
  };
};
