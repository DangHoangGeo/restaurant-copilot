import { z } from "zod";

export const signupSchema = z.object({
  name: z.string().min(1, "Restaurant name is required").max(100, "Restaurant name must be less than 100 characters"),
  subdomain: z.string().regex(/^[a-z0-9-]{3,30}$/, "Subdomain must be 3-30 lowercase letters, numbers, or hyphens"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Password must contain at least one uppercase letter, one lowercase letter, and one number"),
  confirmPassword: z.string().min(8).optional(),
  defaultLanguage: z.enum(["ja","en","vi"]),
  captchaToken: z.string().min(1).optional(),
  policyAgreement: z.boolean().refine(val => val === true, {
    message: "You must agree to the Terms of Service and Privacy Policy",
  }),
}).refine(data => !data.confirmPassword || data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export type SignupFormData = z.infer<typeof signupSchema>;
