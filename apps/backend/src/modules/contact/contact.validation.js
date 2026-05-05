import { z } from "zod";

const optionalText = (max) => z.string().trim().max(max).optional().or(z.literal(""));

export const sendContactMessageSchema = z.object({
  body: z
    .object({
      fullName: optionalText(120),
      email: z.string().trim().email(),
      subject: optionalText(160),
      objet: optionalText(160),
      message: optionalText(4000),
      detail: optionalText(4000),
      source: optionalText(80)
    })
    .superRefine((value, ctx) => {
      const subject = value.subject || value.objet || "";
      const message = value.message || value.detail || "";

      if (subject.trim().length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["objet"],
          message: "Subject is required"
        });
      }

      if (message.trim().length < 10) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["detail"],
          message: "Message must contain at least 10 characters"
        });
      }
    }),
  params: z.object({}).default({}),
  query: z.object({}).default({})
});
