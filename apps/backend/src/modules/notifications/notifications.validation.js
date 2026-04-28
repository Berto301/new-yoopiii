import { z } from "zod";

export const pushSubscriptionSchema = z.object({
  body: z.object({
    endpoint: z.string().url(),
    expirationTime: z.string().datetime().optional().nullable().or(z.literal("")).default(null),
    keys: z.object({
      p256dh: z.string().min(1),
      auth: z.string().min(1)
    })
  }),
  params: z.object({}).default({}),
  query: z.object({}).default({})
});

export const deletePushSubscriptionSchema = z.object({
  body: z.object({
    endpoint: z.string().url()
  }),
  params: z.object({}).default({}),
  query: z.object({}).default({})
});
