import { headers } from "next/headers";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { getSubdomainFromHost } from "@/lib/utils";
import { getUserFromRequest } from "@/lib/server/getUserFromRequest";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { OrdersClientContent } from "./orders-client-content";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

export interface OrderItem {
  id: string;
  quantity: number;
  notes?: string | null;
  status: "ordered" | "preparing" | "ready" | "served";
  created_at: string;
  menu_items: {
    id: string;
    name_en: string;
    name_ja: string;
    name_vi: string;
    category_id: string;
    categories?: {
      id: string;
      name_en: string;
      name_ja: string;
      name_vi: string;
    }[];
  }[];
}

export interface Order {
  id: string;
  table_id: string;
  status: "new" | "preparing" | "ready" | "completed" | "canceled";
  total_amount: number | null;
  created_at: string;
  order_items: OrderItem[];
  tables: { name: string }[] | null;
}

export default async function OrdersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "AdminOrders" });

  const host = (await headers()).get("host") || "";
  const subdomain = getSubdomainFromHost(host);

  const user = await getUserFromRequest();
  let restaurantId: string | null = null;
  let errorGettingId: string | null = null;

  if (user && user.subdomain !== subdomain) {
    errorGettingId = t("errors.noSubdomainDetected");
  }
  restaurantId = user?.restaurantId || null;

  let initialOrders: Order[] | null = null;
  let fetchError: string | null = null;
  let restaurantSettings: { name: string; logoUrl: string | null } | null =
    null;

  if (user && user.restaurantId) {
    try {
      const { data: restaurantData, error: restaurantError } =
        await supabaseAdmin
          .from("restaurants")
          .select("name, logo_url")
          .eq("id", user.restaurantId)
          .single();

      if (restaurantError) throw restaurantError;
      if (restaurantData) {
        restaurantSettings = {
          name: restaurantData.name || "Restaurant",
          logoUrl: restaurantData.logo_url,
        };
      }

      const today = new Date();
      const start = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
      ).toISOString();

      const { data: ordersData, error: ordersError } = await supabaseAdmin
        .from("orders")
        .select(
          `id, table_id, status, total_amount, created_at, order_items(id, quantity, notes, status, created_at, menu_items(id, name_en, name_ja, name_vi, category_id, categories(id, name_en, name_ja, name_vi))), tables(name)`,
        )
        .eq("restaurant_id", user.restaurantId)
        .gte("created_at", start)
        .order("created_at", { ascending: true });

      if (ordersError) throw ordersError;

      initialOrders = ordersData as Order[];
    } catch (error) {
      console.error("Error fetching orders:", error);
      fetchError =
        error instanceof Error ? error.message : "Failed to fetch orders";
    }
  }

  return (
    <div className="container mx-auto py-10 px-4 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold leading-tight text-gray-900 dark:text-gray-100">
          {t("title")}
        </h1>
      </header>

      {errorGettingId && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>
            {t("Settings.Page.errors.noRestaurantIdTitle")}
          </AlertTitle>
          <AlertDescription>{errorGettingId}</AlertDescription>
        </Alert>
      )}

      {!errorGettingId && !restaurantId && !fetchError && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>
            {t("Settings.Page.errors.noRestaurantIdTitle")}
          </AlertTitle>
          <AlertDescription>
            {t("errors.noRestaurantIdMessage")}
          </AlertDescription>
        </Alert>
      )}

      {restaurantId && fetchError && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t("Settings.Page.errors.fetchErrorTitle")}</AlertTitle>
          <AlertDescription>{fetchError}</AlertDescription>
        </Alert>
      )}

      {restaurantId && initialOrders && !fetchError && restaurantSettings && (
        <OrdersClientContent
          initialOrders={initialOrders}
          restaurantId={restaurantId}
        />
      )}

      {restaurantId && !initialOrders && !fetchError && restaurantSettings && (
        <Alert variant="warning" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>
            {t("Settings.Page.errors.noSettingsFoundTitle")}
          </AlertTitle>
          <AlertDescription>{t("no_orders")}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
