export type LocalizedText = Record<string, string>;

export function getLocalizedText(obj: Record<string, unknown> | string, locale: string): string {
  if (typeof obj === "string") return obj
  return (
    (obj[`name_${locale}`] as string | undefined) ||
    (obj[`description_${locale}`] as string | undefined) ||
    (obj[locale] as string | undefined) ||
    (obj.en as string | undefined) ||
    (obj.name_en as string | undefined) ||
    ""
  )
}
