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
  } catch {
    // Fallback formatting if Intl fails
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export const getLocalizedText = (obj: { en?: string; ja?: string; vi?: string; name_en?: string; name_ja?: string; name_vi?: string; [key: string]: string | undefined }, locale: string) => {
  // First try the direct keys (en, ja, vi)
  if (obj[locale as keyof typeof obj]) {
    return obj[locale as keyof typeof obj] || '';
  }
  
  // Then try the name_* keys
  const nameKey = `name_${locale}` as keyof typeof obj;
  if (obj[nameKey]) {
    return obj[nameKey] || '';
  }
  
  // Fallback to English variants
  return obj.en || obj.name_en || obj.ja || obj.name_ja || obj.vi || obj.name_vi || '';
};

// Helper to get subdomain, this should be robust
export function getSubdomainFromHost(host: string): string | null {
  if (!host) return null;

  const hostname = host.split(':')[0]; // Remove port

  // Handle localhost
  if (hostname.includes('localhost')) {
    const parts = hostname.split('.');
    if (parts.length > 1 && parts[0] !== 'localhost') { // e.g., sub.localhost
      return parts[0];
    }
    return null; // Just 'localhost' or invalid
  }

  // Handle production domain
  const rootDomain = process.env.NEXT_PUBLIC_PRODUCTION_URL || 'coorder.ai'; // Consistent root domai
  
  if (hostname === rootDomain || hostname === `www.${rootDomain}`) {
    return null;
  }

  const parts = hostname.split('.');
  
  if (parts.length > rootDomain.split('.').length) {
    // Check if the end of the hostname matches the rootDomain
    // e.g., if host is sub.example.com, parts = [sub, example, com]
    // and rootDomain is example.com
    const rootDomainParts = rootDomain.split('.').length;
    const potentialSubdomain = parts.slice(0, parts.length - rootDomainParts).join('.');
    const reconstructedDomain = parts.slice(parts.length - rootDomainParts).join('.');

    if (reconstructedDomain === rootDomain && potentialSubdomain) {
      return potentialSubdomain;
    }
  }
  return null;
}