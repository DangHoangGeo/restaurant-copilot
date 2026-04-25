// web/lib/customerUtils.ts
import { useParams } from "next/navigation";

/**
 * Format a monetary amount using the restaurant's configured currency.
 * Falls back to JPY (¥) when currency is unset, preserving existing behaviour.
 */
export function formatPrice(
  amount: number,
  currency: string | undefined,
  locale = "en",
): string {
  const cur = currency || "JPY";
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: cur,
      maximumFractionDigits: cur === "JPY" ? 0 : 2,
    }).format(amount);
  } catch {
    // Fallback if the currency code is invalid
    return `${amount}`;
  }
}

export function useGetCurrentLocale() {
  const params = useParams();
  return (params.locale as string) || "en";
}

export function getLocalizedText(obj: { [key: string]: string } | string | null, locale: string): string {
  if (!obj) return "";
  if (typeof obj === "string") return obj;
  // Check for specific localized name properties
  if (obj[`name_${locale}`]) return obj[`name_${locale}`];
  // Check for specific localized description properties
  if (obj[`description_${locale}`]) return obj[`description_${locale}`];
  // Fallback to direct locale key, then 'en', then 'name_en'
  return obj[locale] || obj.en || obj.name_en || "";
}
