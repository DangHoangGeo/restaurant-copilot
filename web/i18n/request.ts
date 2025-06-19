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
  'owner/menu',
  'owner/orders',
  'owner/tables',
  'owner/employees',
  'owner/bookings',
  'owner/reports',
  'owner/settings',
  'owner/profile',
  // customer
  'customer/home',
  'customer/menu',
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

  // Dynamically import each namespace file
  const loaded = await Promise.all(
    NAMESPACES.map(ns =>
      import(`../messages/${locale}/${ns}.json`)
        .then(mod => mod.default)
        .catch(() => ({}))
    )
  );

  // Merge all into one flat messages object
  const messages = Object.assign({}, ...loaded);

  return { locale, messages };
});