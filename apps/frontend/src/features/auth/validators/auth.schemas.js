import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Adresse e-mail invalide"),
  password: z.string().min(8, "Minimum 8 caracteres")
});

export const registerSchema = z.object({
  firstName: z.string().min(2, "Minimum 2 caracteres"),
  lastName: z.string().min(2, "Minimum 2 caracteres"),
  email: z.string().email("Adresse e-mail invalide"),
  phone: z.string().min(8, "Numero invalide"),
  password: z.string().min(8, "Minimum 8 caracteres"),
  companyName: z.string().optional(),
  role: z.enum(["user", "agency", "independent_agent"])
});
