// Organization domain: Zod validation schemas for API input
import { z } from 'zod';

export const orgMemberRoleSchema = z.enum([
  'founder_full_control',
  'founder_operations',
  'founder_finance',
  'accountant_readonly',
  'branch_general_manager',
]);

export const shopScopeSchema = z.enum(['all_shops', 'selected_shops']);

export const inviteOrgMemberSchema = z.object({
  email: z.string().email('Valid email required'),
  role: orgMemberRoleSchema,
  shop_scope: shopScopeSchema,
  selected_restaurant_ids: z.array(z.string().uuid()).optional(),
}).refine(
  (data) =>
    data.shop_scope !== 'selected_shops' ||
    (data.selected_restaurant_ids && data.selected_restaurant_ids.length > 0),
  {
    message: 'selected_restaurant_ids must be provided when shop_scope is selected_shops',
    path: ['selected_restaurant_ids'],
  }
);

export const updateOrgSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  timezone: z.string().optional(),
  currency: z.string().length(3).optional(),
});

// Schema for creating a pending invite (invite by email, user need not exist yet)
export const createPendingInviteSchema = z.object({
  email: z.string().email('Valid email required'),
  role: orgMemberRoleSchema,
  shop_scope: shopScopeSchema,
  selected_restaurant_ids: z.array(z.string().uuid()).optional(),
}).refine(
  (data) =>
    data.shop_scope !== 'selected_shops' ||
    (data.selected_restaurant_ids && data.selected_restaurant_ids.length > 0),
  {
    message: 'selected_restaurant_ids must be provided when shop_scope is selected_shops',
    path: ['selected_restaurant_ids'],
  }
);

// Schema for updating a member's role and/or shop scope
export const updateMemberSchema = z.object({
  role: orgMemberRoleSchema.optional(),
  shop_scope: shopScopeSchema.optional(),
  selected_restaurant_ids: z.array(z.string().uuid()).optional(),
}).refine(
  (data) =>
    data.shop_scope !== 'selected_shops' ||
    (data.selected_restaurant_ids && data.selected_restaurant_ids.length > 0),
  {
    message: 'selected_restaurant_ids must be provided when shop_scope is selected_shops',
    path: ['selected_restaurant_ids'],
  }
);

// Schema for accepting a pending invite
export const acceptInviteSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  // Optional fields for users who do not yet have an account
  name: z.string().min(1).max(100).optional(),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
});

// Schema for setting the active branch
export const setActiveBranchSchema = z.object({
  restaurant_id: z.string().uuid('Valid restaurant ID required'),
});

export type InviteOrgMemberInput = z.infer<typeof inviteOrgMemberSchema>;
export type UpdateOrgInput = z.infer<typeof updateOrgSchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
export type CreatePendingInviteInput = z.infer<typeof createPendingInviteSchema>;
export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;
export type SetActiveBranchInput = z.infer<typeof setActiveBranchSchema>;
