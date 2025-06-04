import { z } from "zod";

export const signupSchema = z
  .object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters long"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export const bookingSchema = z.object({
  restaurantId: z.string().uuid("Invalid restaurant ID"),
  userId: z.string().uuid("Invalid user ID"),
  tableNumber: z
    .number()
    .int()
    .positive("Table number must be a positive integer"),
  numberOfGuests: z.number().int().min(1, "Must have at least 1 guest"),
  bookingTime: z.string().datetime("Invalid booking time"),
  notes: z.string().optional(),
});
