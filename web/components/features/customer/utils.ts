export type LocalizedText = Record<string, string>;

export function getLocalizedText(obj: LocalizedText | string, locale: string) {
  if (typeof obj === "string") return obj;
  return obj?.[locale] || obj?.en || "";
}
