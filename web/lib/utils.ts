import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
 
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(
  amount: number | null | undefined,
  currency: string = 'JPY', // Default currency
  locale: string = 'ja-JP' // Default locale for Japanese Yen
): string {
  if (amount === null || amount === undefined) {
    return 'N/A'; // Or some other placeholder
  }
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      // minimumFractionDigits: 0, // Optional: for currencies like JPY that don't use decimals
      // maximumFractionDigits: 0,
    }).format(amount);
  } catch (error) {
    console.error("Currency formatting error:", error);
    return `${currency} ${amount.toFixed(2)}`; // Fallback
  }
}
