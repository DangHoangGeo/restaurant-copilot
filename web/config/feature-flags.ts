export interface FeatureFlags {
  payments: boolean;
  aiAssistant: boolean;
  onlineReviews: boolean;
  lowStockAlerts: boolean;
  tableBooking: boolean;
  onboarding: boolean;
}
export const FEATURE_FLAGS: FeatureFlags = {
  payments: process.env.NEXT_PUBLIC_FEATURE_PAYMENTS === "true",
  aiAssistant: process.env.NEXT_PUBLIC_FEATURE_AI !== "false", // Default to true
  onlineReviews: process.env.NEXT_PUBLIC_FEATURE_REVIEWS === "true",
  lowStockAlerts: process.env.NEXT_PUBLIC_FEATURE_LOWSTOCK === "true" || true, // Enabled by default
  tableBooking: process.env.NEXT_PUBLIC_FEATURE_TABLEBOOKING !== "false", // Default to true
  onboarding: process.env.NEXT_PUBLIC_FEATURE_ONBOARDING !== "false", // Default to true
};
