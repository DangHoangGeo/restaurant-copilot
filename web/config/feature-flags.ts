export interface FeatureFlags {
  payments: boolean;
  aiAssistant: boolean;
  onlineReviews: boolean;
  lowStockAlerts: boolean;
  tableBooking: boolean;
}
export const FEATURE_FLAGS: FeatureFlags = {
  payments: process.env.NEXT_PUBLIC_FEATURE_PAYMENTS === "true",
  aiAssistant: process.env.NEXT_PUBLIC_FEATURE_AI === "true",
  onlineReviews: process.env.NEXT_PUBLIC_FEATURE_REVIEWS === "true",
  lowStockAlerts: process.env.NEXT_PUBLIC_FEATURE_LOWSTOCK === "true",
  tableBooking: process.env.NEXT_PUBLIC_FEATURE_TABLEBOOKING === "true",
};
