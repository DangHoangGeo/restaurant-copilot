// web/lib/customerUtils.ts
import { useParams } from "next/navigation";

export function getCurrentLocale() {
  const params = useParams();
  return (params.locale as string) || "en";
}

export function getLocalizedText(obj: any, locale: string): string {
  if (!obj) return "";
  if (typeof obj === "string") return obj;
  // Check for specific localized name properties
  if (obj[`name_${locale}`]) return obj[`name_${locale}`];
  // Check for specific localized description properties
  if (obj[`description_${locale}`]) return obj[`description_${locale}`];
  // Fallback to direct locale key, then 'en', then 'name_en'
  return obj[locale] || obj.en || obj.name_en || "";
}
