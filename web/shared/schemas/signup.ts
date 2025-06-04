import { z } from "zod";

export const signupSchema = z.object({
  name: z.string().min(1).max(100),
  subdomain: z.string().regex(/^[a-z0-9-]{3,30}$/),
  email: z.string().email(),
  password: z.string().min(8),
  confirmPassword: z.string().min(8).optional(),
  defaultLanguage: z.enum(["ja","en","vi"]),
  captchaToken: z.string().min(1).optional(),
}).refine(data => !data.confirmPassword || data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});
