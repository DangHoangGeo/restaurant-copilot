import { getRequestConfig } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { routing } from './routing';

const NAMESPACES = [
  // public
  'common',
  'landing',
  'auth',
  'legal',
  // service admin
  'serviceAdmin/home',
  'serviceAdmin/users',
  'serviceAdmin/orders',
  'serviceAdmin/settings',
  // restaurant owner
  'owner/dashboard',
  'owner/homepage',
  'owner/onboarding',
  'owner/menu',
  'owner/orders',
  'owner/tables',
  'owner/employees',
  'owner/bookings',
  'owner/reports',
  'owner/settings',
  'owner/profile',
  'owner/organization',
  'owner/branches',
  'owner/purchasing',
  'owner/finance',
  // customer
  'customer/home',
  'customer/menu',
  'customer/session',
  'customer/cart',
  'customer/checkout',
  'customer/orderHistory',
  'customer/booking'
] as const;

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  // Dynamically import each namespace file and create nested structure
  const messages: Record<string, unknown> = {};
  
  for (const ns of NAMESPACES) {
    try {
      const moduleImport = await import(`../messages/${locale}/${ns}.json`);
      const content = moduleImport.default;
      
      // Create nested structure based on namespace path
      const keys = ns.split('/');
      let current = messages;
      
      // Navigate/create nested objects for the namespace path
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {};
        }
        current = current[keys[i]] as Record<string, unknown>;
      }
      
      // Set the final content
      current[keys[keys.length - 1]] = content;
    } catch (error) {
      // Skip missing namespace files
      console.warn(`Missing translation namespace: ${ns} for locale: ${locale}`, error);
    }
  }

  return { locale, messages };
});