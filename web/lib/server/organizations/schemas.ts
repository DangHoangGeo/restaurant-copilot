// Organization domain: Zod validation schemas for API input
import { z } from "zod";

export const orgMemberRoleSchema = z.enum([
  "founder_full_control",
  "founder_operations",
  "founder_finance",
  "accountant_readonly",
  "branch_general_manager",
]);

export const shopScopeSchema = z.enum(["all_shops", "selected_shops"]);

export const inviteOrgMemberSchema = z
  .object({
    email: z.string().email("Valid email required"),
    role: orgMemberRoleSchema,
    shop_scope: shopScopeSchema,
    selected_restaurant_ids: z.array(z.string().uuid()).optional(),
  })
  .refine(
    (data) =>
      data.shop_scope !== "selected_shops" ||
      (data.selected_restaurant_ids && data.selected_restaurant_ids.length > 0),
    {
      message:
        "selected_restaurant_ids must be provided when shop_scope is selected_shops",
      path: ["selected_restaurant_ids"],
    },
  );

const phoneSchema = z
  .string()
  .max(50)
  .regex(/^\+?[\d\s\-().]{7,50}$/, "Invalid phone number format")
  .nullable()
  .optional();

export const updateOrgSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  country: z.string().length(2).optional(),
  timezone: z.string().optional(),
  currency: z.string().length(3).optional(),
  // Branding (migration 043)
  logo_url: z.string().url("Invalid logo URL").nullable().optional(),
  brand_color: z
    .string()
    .regex(/^#([0-9A-Fa-f]{6})$/, "Must be a valid hex color")
    .nullable()
    .optional(),
  description_en: z.string().max(1000).nullable().optional(),
  description_ja: z.string().max(1000).nullable().optional(),
  description_vi: z.string().max(1000).nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  phone: phoneSchema,
  email: z.string().email("Invalid email").max(100).nullable().optional(),
});

const openingHoursDaySchema = z.object({
  isOpen: z.boolean(),
  openTime: z.string().optional(),
  closeTime: z.string().optional(),
  isClosed: z.boolean().optional(),
});

const openingHoursSchema = z.record(z.string(), openingHoursDaySchema);

// Schema for creating a pending invite (invite by email, user need not exist yet)
export const createPendingInviteSchema = z
  .object({
    email: z.string().email("Valid email required"),
    role: orgMemberRoleSchema,
    shop_scope: shopScopeSchema,
    selected_restaurant_ids: z.array(z.string().uuid()).optional(),
  })
  .refine(
    (data) =>
      data.shop_scope !== "selected_shops" ||
      (data.selected_restaurant_ids && data.selected_restaurant_ids.length > 0),
    {
      message:
        "selected_restaurant_ids must be provided when shop_scope is selected_shops",
      path: ["selected_restaurant_ids"],
    },
  );

// Schema for updating a member's role and/or shop scope
export const updateMemberSchema = z
  .object({
    role: orgMemberRoleSchema.optional(),
    shop_scope: shopScopeSchema.optional(),
    selected_restaurant_ids: z.array(z.string().uuid()).optional(),
  })
  .refine(
    (data) =>
      data.shop_scope !== "selected_shops" ||
      (data.selected_restaurant_ids && data.selected_restaurant_ids.length > 0),
    {
      message:
        "selected_restaurant_ids must be provided when shop_scope is selected_shops",
      path: ["selected_restaurant_ids"],
    },
  );

// Schema for accepting a pending invite
export const acceptInviteSchema = z.object({
  token: z.string().min(1, "Token is required"),
  // Optional fields for users who do not yet have an account
  name: z.string().min(1).max(100).optional(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .optional(),
});

// Schema for setting the active branch
export const setActiveBranchSchema = z.object({
  restaurant_id: z.string().uuid("Valid restaurant ID required"),
});

// Schema for adding a new branch/restaurant to an org
export const addBranchSchema = z.object({
  name: z.string().min(1, "Restaurant name is required").max(100),
  subdomain: z
    .string()
    .min(3, "Subdomain must be at least 3 characters")
    .max(50, "Subdomain must be less than 50 characters")
    .regex(
      /^[a-z0-9-]+$/,
      "Subdomain can only contain lowercase letters, numbers, and hyphens",
    ),
  default_language: z.enum(["en", "ja", "vi"]),
  brand_color: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i, "Invalid hex color")
    .optional(),
  tax: z.number().min(0).max(1).optional(),
  address: z.string().max(500).optional(),
  phone: z
    .string()
    .max(50)
    .regex(/^\+?[\d\s\-().]{7,50}$/, "Invalid phone number format")
    .optional()
    .or(z.literal("")),
  email: z
    .string()
    .email("Invalid email")
    .max(100)
    .optional()
    .or(z.literal("")),
  website: z.string().url("Invalid URL").max(200).optional().or(z.literal("")),
});

export const organizationSharedMenuCategorySchema = z.object({
  name_en: z.string().min(1, "Category name is required").max(100),
  name_ja: z.string().max(100).optional().or(z.literal("")),
  name_vi: z.string().max(100).optional().or(z.literal("")),
  position: z.number().int().min(0).optional(),
});

export const organizationSharedMenuCategoryUpdateSchema =
  organizationSharedMenuCategorySchema.partial().extend({
    is_active: z.boolean().optional(),
  });

const organizationSharedMenuItemSizeSchema = z.object({
  size_key: z.enum(["S", "M", "L", "XL"]),
  name_en: z.string().min(1, "Size name is required").max(100),
  name_ja: z.string().max(100).optional().or(z.literal("")),
  name_vi: z.string().max(100).optional().or(z.literal("")),
  price: z.number().min(0),
  position: z.number().int().min(0).optional(),
});

const organizationSharedMenuItemToppingSchema = z.object({
  name_en: z.string().min(1, "Topping name is required").max(100),
  name_ja: z.string().max(100).optional().or(z.literal("")),
  name_vi: z.string().max(100).optional().or(z.literal("")),
  price: z.number().min(0),
  position: z.number().int().min(0).optional(),
});

const onboardingSharedMenuCategorySchema = z.object({
  name_en: z.string().min(1, "Category name is required").max(100),
  name_ja: z.string().max(100).nullable().optional(),
  name_vi: z.string().max(100).nullable().optional(),
});

export const organizationSharedMenuItemSchema = z.object({
  category_id: z.string().uuid("Valid category ID required"),
  name_en: z.string().min(1, "Item name is required").max(100),
  name_ja: z.string().max(100).optional().or(z.literal("")),
  name_vi: z.string().max(100).optional().or(z.literal("")),
  description_en: z.string().max(500).optional().or(z.literal("")),
  description_ja: z.string().max(500).optional().or(z.literal("")),
  description_vi: z.string().max(500).optional().or(z.literal("")),
  price: z.number().min(0),
  image_url: z.string().url("Invalid image URL").nullable().optional(),
  available: z.boolean().optional(),
  position: z.number().int().min(0).optional(),
  sizes: z.array(organizationSharedMenuItemSizeSchema).optional(),
  toppings: z.array(organizationSharedMenuItemToppingSchema).optional(),
});

export const organizationSharedMenuItemUpdateSchema =
  organizationSharedMenuItemSchema.partial();

export const organizationOnboardingSchema = z.object({
  name: z.string().min(1).max(100),
  country: z.string().length(2),
  timezone: z.string().min(1),
  currency: z.string().length(3),
  logo_url: z.string().url("Invalid logo URL").nullable().optional(),
  brand_color: z
    .string()
    .regex(/^#([0-9A-Fa-f]{6})$/, "Must be a valid hex color"),
  address: z.string().max(500).nullable().optional(),
  phone: phoneSchema,
  email: z.string().email("Invalid email").max(100).nullable().optional(),
  description_en: z.string().max(1000).nullable().optional(),
  description_ja: z.string().max(1000).nullable().optional(),
  description_vi: z.string().max(1000).nullable().optional(),
  shared_menu_categories: z
    .array(onboardingSharedMenuCategorySchema)
    .optional(),
  primary_branch: z.object({
    id: z.string().uuid("Valid branch ID required"),
    name: z.string().min(1).max(100),
    branch_code: z
      .string()
      .min(2)
      .max(50)
      .regex(
        /^[a-z0-9-]+$/,
        "Branch code can only contain lowercase letters, numbers, and hyphens",
      ),
    default_language: z.enum(["en", "ja", "vi"]),
    tax: z.number().min(0).max(1),
    address: z.string().max(500).nullable().optional(),
    opening_hours: openingHoursSchema.optional(),
    phone: phoneSchema,
    email: z.string().email("Invalid email").max(100).nullable().optional(),
    logo_url: z.string().url("Invalid logo URL").nullable().optional(),
    hero_title_en: z.string().min(1, "English hero title is required").max(100),
    hero_title_ja: z.string().max(100).nullable().optional(),
    hero_title_vi: z.string().max(100).nullable().optional(),
    hero_subtitle_en: z.string().max(200).nullable().optional(),
    hero_subtitle_ja: z.string().max(200).nullable().optional(),
    hero_subtitle_vi: z.string().max(200).nullable().optional(),
    owner_story_en: z.string().max(1000).nullable().optional(),
    owner_story_ja: z.string().max(1000).nullable().optional(),
    owner_story_vi: z.string().max(1000).nullable().optional(),
    owner_photo_url: z
      .string()
      .url("Invalid owner photo URL")
      .nullable()
      .optional(),
    gallery_images: z.array(z.string().url("Invalid gallery URL")).optional(),
    signature_dishes: z
      .array(
        z.object({
          name_en: z.string().min(1).max(100),
          name_ja: z.string().max(100).nullable().optional(),
          name_vi: z.string().max(100).nullable().optional(),
          description_en: z.string().max(500).nullable().optional(),
          description_ja: z.string().max(500).nullable().optional(),
          description_vi: z.string().max(500).nullable().optional(),
          price: z.number().min(0),
        }),
      )
      .optional(),
  }),
});

// Schema for updating a member's individual permission overrides (B2)
export const updateMemberPermissionsSchema = z
  .object({
    // Partial record — only keys provided will be upserted.
    // To restore a permission to its role default, pass reset: true.
    permissions: z
      .record(
        z.enum([
          "reports",
          "finance_exports",
          "purchases",
          "promotions",
          "employees",
          "attendance_approvals",
          "restaurant_settings",
          "organization_settings",
          "billing",
        ]),
        z.boolean(),
      )
      .optional(),
    // When true, delete ALL override rows for this member (restores role defaults)
    reset: z.boolean().optional(),
  })
  .refine((data) => data.permissions !== undefined || data.reset === true, {
    message:
      "Provide permissions to update or set reset=true to clear all overrides",
  });

export type UpdateMemberPermissionsInput = z.infer<
  typeof updateMemberPermissionsSchema
>;

export type InviteOrgMemberInput = z.infer<typeof inviteOrgMemberSchema>;
export type UpdateOrgInput = z.infer<typeof updateOrgSchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
export type CreatePendingInviteInput = z.infer<
  typeof createPendingInviteSchema
>;
export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;
export type SetActiveBranchInput = z.infer<typeof setActiveBranchSchema>;
export type AddBranchSchemaInput = z.infer<typeof addBranchSchema>;
export type OrganizationSharedMenuCategoryInput = z.infer<
  typeof organizationSharedMenuCategorySchema
>;
export type OrganizationSharedMenuItemInput = z.infer<
  typeof organizationSharedMenuItemSchema
>;
export type OrganizationOnboardingInput = z.infer<
  typeof organizationOnboardingSchema
>;
