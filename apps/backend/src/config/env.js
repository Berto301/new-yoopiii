import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(5000),
  CLIENT_URL: z.string().default("http://localhost:5173"),
  MONGODB_URI: z.string().default("mongodb://localhost:27017/yopii"),
  JWT_ACCESS_SECRET: z.string().min(10).default("change-me-access-secret"),
  JWT_REFRESH_SECRET: z.string().min(10).default("change-me-refresh-secret"),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_SECURE: z.enum(["true", "false"]).optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  CONTACT_RECIPIENT_EMAIL: z.string().optional(),
  PUSH_VAPID_PUBLIC_KEY: z.string().optional(),
  PUSH_VAPID_PRIVATE_KEY: z.string().optional(),
  PUSH_VAPID_SUBJECT: z.string().optional()
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = {
  nodeEnv: parsed.data.NODE_ENV,
  port: parsed.data.PORT,
  clientUrl: parsed.data.CLIENT_URL,
  mongodbUri: parsed.data.MONGODB_URI,
  jwtAccessSecret: parsed.data.JWT_ACCESS_SECRET,
  jwtRefreshSecret: parsed.data.JWT_REFRESH_SECRET,
  smtpHost: parsed.data.SMTP_HOST || "",
  smtpPort: parsed.data.SMTP_PORT || 587,
  smtpSecure: parsed.data.SMTP_SECURE === "true",
  smtpUser: parsed.data.SMTP_USER || "",
  smtpPass: parsed.data.SMTP_PASS || "",
  smtpFrom: parsed.data.SMTP_FROM || parsed.data.SMTP_USER || "",
  contactRecipientEmail: parsed.data.CONTACT_RECIPIENT_EMAIL || parsed.data.SMTP_USER || "",
  pushVapidPublicKey: parsed.data.PUSH_VAPID_PUBLIC_KEY || "",
  pushVapidPrivateKey: parsed.data.PUSH_VAPID_PRIVATE_KEY || "",
  pushVapidSubject: parsed.data.PUSH_VAPID_SUBJECT || "mailto:admin@yopii.local"
};
