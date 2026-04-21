import { z } from "zod";

export const sendContactMessageSchema = z.object({
  body: z.object({
    fullName: z.string().trim().min(2).max(120),
    email: z.string().trim().email(),
    subject: z.string().trim().min(2).max(160),
    message: z.string().trim().min(10).max(4000)
  }),
  params: z.object({}).default({}),
  query: z.object({}).default({})
});
