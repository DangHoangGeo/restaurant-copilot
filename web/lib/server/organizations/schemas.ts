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

export type InviteOrgMemberInput = z.infer<typeof inviteOrgMemberSchema>;
export type UpdateOrgInput = z.infer<typeof updateOrgSchema>;
