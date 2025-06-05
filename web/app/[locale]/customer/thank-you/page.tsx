import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { orders, orderItems, menuItems } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getRestaurantSettingsFromSubdomain } from "@/data/restaurant";
import ThankYouClientContent from "./thank-you-client-content";
import { NextIntlClientProvider, useMessages } from 'next-intl';
import { pick } from 'lodash';
import { z } from 'zod';

// Define structure for the fetched order and its items
// This should align with your actual data structures and what ThankYouClientContent expects
interface FetchedMenuItem {
  id: string;
  name: Record<string, string>; // Assuming name_en, name_ja, name_vi etc. are flattened into this structure
  // other fields...
}

interface FetchedOrderItem {
  menuItem: FetchedMenuItem;
  quantity: number;
}

interface FetchedOrder {
  id: string;
  orderItems: FetchedOrderItem[];
  totalAmount: number;
  tableId?: string | null;
  restaurantId: string; // For validation
  // currencyCode: string; // This will come from restaurantSettings
}

const orderIdSchema = z.string().uuid("Invalid order ID format.");

async function getOrderDetails(orderId: string, restaurantId: string): Promise<FetchedOrder | null> {
  try {
    const result = await db.query.orders.findFirst({
      where: and(eq(orders.id, orderId), eq(orders.restaurantId, restaurantId)),
      with: {
        orderItems: {
          with: {
            menuItem: {
              columns: {
                id: true,
                // Assuming your menuItems table has localized names like name_en, name_ja, name_vi
                // Adjust these to your actual column names
                name_en: true,
                name_ja: true,
                name_vi: true,
                // Add other fields if needed by ThankYouClientContent, e.g., imageUrl_en
              },
            },
          },
          columns: {
            quantity: true,
            // unitPrice: true, // if needed
          },
        },
      },
      columns: {
        id: true,
        totalAmount: true,
        tableId: true,
        restaurantId: true,
      }
    });

    if (!result) {
      return null;
    }

    // Transform the data to fit ThankYouClientContentProps.order
    const transformedOrderItems: FetchedOrderItem[] = result.orderItems.map(oi => {
        const menuItemNames: Record<string, string> = {};
        if (oi.menuItem.name_en) menuItemNames['en'] = oi.menuItem.name_en;
        if (oi.menuItem.name_ja) menuItemNames['ja'] = oi.menuItem.name_ja;
        if (oi.menuItem.name_vi) menuItemNames['vi'] = oi.menuItem.name_vi;

        return {
            menuItem: {
                id: oi.menuItem.id,
                name: menuItemNames,
            },
            quantity: oi.quantity,
        }
    });


    return {
      id: result.id,
      orderItems: transformedOrderItems,
      totalAmount: result.totalAmount,
      tableId: result.tableId,
      restaurantId: result.restaurantId,
    };

  } catch (error) {
    console.error("Error fetching order details:", error);
    return null; // Or throw to be caught by a higher error boundary
  }
}


export default async function ThankYouPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string };
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const orderIdValidation = orderIdSchema.safeParse(searchParams?.orderId);

  if (!orderIdValidation.success) {
    console.warn("Thank You Page: Invalid or missing orderId in searchParams.");
    return notFound(); // Or redirect to an error page or menu
  }
  const orderId = orderIdValidation.data;

  const headersList = headers();
  const host = headersList.get("host");
  const subdomain = host?.split(".")[0] || null;
  const effectiveSubdomain = (subdomain === 'localhost' || subdomain === null || subdomain === 'app')
    ? process.env.NEXT_PUBLIC_DEFAULT_RESTAURANT_SUBDOMAIN || "default"
    : subdomain;

  const restaurantSettings = await getRestaurantSettingsFromSubdomain(effectiveSubdomain);

  if (!restaurantSettings) {
    console.warn(`Thank You Page: Restaurant settings not found for subdomain: ${effectiveSubdomain}`);
    return notFound();
  }

  const order = await getOrderDetails(orderId, restaurantSettings.id);

  if (!order || order.restaurantId !== restaurantSettings.id) {
    console.warn(`Thank You Page: Order ${orderId} not found or does not belong to restaurant ${restaurantSettings.id}.`);
    return notFound(); // Ensure order belongs to the current restaurant context
  }

  const messages = useMessages();

  return (
    <NextIntlClientProvider locale={locale} messages={pick(messages, 'ThankYouPage', 'Common')}>
      <div className="container py-8 md:py-16">
        <ThankYouClientContent
          order={order}
          restaurantSettings={restaurantSettings}
          locale={locale}
        />
      </div>
    </NextIntlClientProvider>
  );
}
