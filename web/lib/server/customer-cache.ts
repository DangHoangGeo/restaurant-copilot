import "server-only";

import { revalidatePath } from "next/cache";
import { del } from "@/lib/server/cache";
import {
  invalidateMenuCache as invalidateMemoryMenuCache,
  invalidateRestaurantCache as invalidateMemoryRestaurantCache,
} from "@/lib/server/request-context";

export const CUSTOMER_MENU_TTL_SECONDS = 300;
export const CUSTOMER_RESTAURANT_META_TTL_SECONDS = 60;
const CUSTOMER_LOCALES = ["en", "ja", "vi"] as const;

export function customerMenuCacheKey(params: {
  restaurantId: string;
  lite: boolean;
}): string {
  return `menu:${params.restaurantId}:categories:${params.lite ? "lite" : "full"}`;
}

export function customerSignatureDishesCacheKey(restaurantId: string): string {
  return `menu:${restaurantId}:signature-dishes`;
}

export function customerRestaurantMetaCacheKey(restaurantId: string): string {
  return `restaurant:${restaurantId}:meta`;
}

export function customerRestaurantHomepageCacheKey(restaurantId: string): string {
  return `restaurant:${restaurantId}:homepage-data`;
}

export function customerMenuCacheKeys(restaurantId: string): string[] {
  return [
    customerMenuCacheKey({ restaurantId, lite: true }),
    customerMenuCacheKey({ restaurantId, lite: false }),
    customerSignatureDishesCacheKey(restaurantId),
    customerRestaurantHomepageCacheKey(restaurantId),
  ];
}

export function customerRestaurantCacheKeys(restaurantId: string): string[] {
  return [
    customerRestaurantMetaCacheKey(restaurantId),
    customerRestaurantHomepageCacheKey(restaurantId),
  ];
}

export async function invalidateCustomerMenuCache(
  restaurantId: string,
): Promise<void> {
  invalidateMemoryMenuCache(restaurantId);
  revalidateCustomerMenuPaths();
  await del(customerMenuCacheKeys(restaurantId));
}

export async function invalidateCustomerRestaurantCache(
  restaurantId: string,
): Promise<void> {
  invalidateMemoryRestaurantCache(restaurantId);
  revalidateCustomerPublicPaths();
  await del(customerRestaurantCacheKeys(restaurantId));
}

export async function invalidateCustomerPublicCache(
  restaurantId: string,
): Promise<void> {
  invalidateMemoryMenuCache(restaurantId);
  invalidateMemoryRestaurantCache(restaurantId);
  revalidateCustomerPublicPaths();
  await del(
    Array.from(
      new Set([
        ...customerMenuCacheKeys(restaurantId),
        ...customerRestaurantCacheKeys(restaurantId),
      ]),
    ),
  );
}

function revalidateCustomerMenuPaths(): void {
  for (const locale of CUSTOMER_LOCALES) {
    revalidatePath(`/${locale}/menu`);
  }
}

function revalidateCustomerPublicPaths(): void {
  for (const locale of CUSTOMER_LOCALES) {
    revalidatePath(`/${locale}`);
    revalidatePath(`/${locale}/menu`);
  }
}
