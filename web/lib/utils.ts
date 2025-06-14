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

export   const getLocalizedText = (obj: { [key: string]: string | undefined }, locale: string) => {
  return obj[`name_${locale}`] || obj[`name_en`] || '';
};

// Helper to get subdomain, this should be robust
export function getSubdomainFromHost(host: string): string | null {
  if (!host) return null;

  const hostname = host.split(':')[0]; // Remove port
  console.log('Subdomain detection - hostname:', hostname);

  // Handle localhost
  if (hostname.includes('localhost')) {
    const parts = hostname.split('.');
    console.log('Localhost parts:', parts);
    if (parts.length > 1 && parts[0] !== 'localhost') { // e.g., sub.localhost
      console.log('Detected localhost subdomain:', parts[0]);
      return parts[0];
    }
    console.log('No localhost subdomain detected');
    return null; // Just 'localhost' or invalid
  }

  // Handle production domain
  const rootDomain = process.env.NEXT_PUBLIC_PRODUCTION_URL || 'coorder.ai'; // Consistent root domain
  console.log('Root domain:', rootDomain);
  
  if (hostname === rootDomain || hostname === `www.${rootDomain}`) {
    console.log('Hostname matches root domain, no subdomain');
    return null;
  }

  const parts = hostname.split('.');
  console.log('Production hostname parts:', parts);
  console.log('Root domain parts:', rootDomain.split('.'));
  
  if (parts.length > rootDomain.split('.').length) {
    // Check if the end of the hostname matches the rootDomain
    // e.g., if host is sub.example.com, parts = [sub, example, com]
    // and rootDomain is example.com
    const rootDomainParts = rootDomain.split('.').length;
    const potentialSubdomain = parts.slice(0, parts.length - rootDomainParts).join('.');
    const reconstructedDomain = parts.slice(parts.length - rootDomainParts).join('.');

    console.log('Potential subdomain:', potentialSubdomain);
    console.log('Reconstructed domain:', reconstructedDomain);

    if (reconstructedDomain === rootDomain && potentialSubdomain) {
      console.log('Detected production subdomain:', potentialSubdomain);
      return potentialSubdomain;
    }
  }

  console.log('No subdomain detected for hostname:', hostname);
  return null;
}