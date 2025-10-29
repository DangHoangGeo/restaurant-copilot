import { z } from 'zod';
export * from './common';

// Schema for creating a category
export const categoryCreateSchema = z.object({
  name_en: z.string().trim().min(1, "English name is required").max(50),
  name_ja: z.string().trim().max(50).optional(),
  name_vi: z.string().trim().max(50).optional(),
  position: z.number().optional().nullable(),
});
export type CategoryCreateData = z.infer<typeof categoryCreateSchema>;

// Schema for updating a category
export const categoryUpdateSchema = z.object({
    name_en: z.string().trim().min(1, "English name is required").max(50).optional(),
    name_ja: z.string().trim().max(50).optional(),
    name_vi: z.string().trim().max(50).optional(),
    position: z.number().optional().nullable(),
  });
export type CategoryUpdateData = z.infer<typeof categoryUpdateSchema>;


// Schema for creating a table
export const tableCreateSchema = z.object({
    name: z.string().trim().min(1, "Table name is required").max(50),
    capacity: z.number().int().positive("Capacity must be a positive number").optional().nullable(),
});
export type TableCreateData = z.infer<typeof tableCreateSchema>;

// Schema for updating a table
export const tableUpdateSchema = z.object({
    name: z.string().trim().min(1, "Table name is required").max(50).optional(),
    capacity: z.number().int().positive("Capacity must be a positive number").optional().nullable(),
});
export type TableUpdateData = z.infer<typeof tableUpdateSchema>;
