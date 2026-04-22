import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Types for Supabase query results
interface TableData {
  id: string;
  name: string;
}

interface CategoryData {
  id: string;
  name_en: string;
  name_ja: string;
  name_vi: string;
}

interface MenuItemData {
  id: string;
  name_en: string;
  name_ja: string;
  name_vi: string;
  description_en: string | null;
  description_ja: string | null;
  description_vi: string | null;
  price: number;
  image_url: string | null;
  categories: CategoryData | null;
}

interface MenuItemSizeData {
  id: string;
  size_key: string;
  name_en: string;
  name_ja: string;
  name_vi: string;
  price: number;
}

interface OrderItemData {
  id: string;
  quantity: number;
  notes: string | null;
  status: string;
  price_at_order: number;
  created_at: string;
  topping_ids: string[] | null;
  menu_items: MenuItemData | null;
  menu_item_sizes: MenuItemSizeData | null;
  toppings?: ToppingData[];
}

interface ToppingData {
  id: string;
  name_en: string;
  name_ja: string;
  name_vi: string;
  price: number;
}

interface OrderData {
  id: string;
  session_id: string | null;
  status: string;
  total_amount: number;
  guest_count: number;
  created_at: string;
  updated_at: string;
  table_id: string;
  tables: TableData | TableData[] | null;
  order_items: OrderItemData[] | null;
}

/**
 * Customer API: Get order details by orderId
 * Used for order confirmation page and order status tracking
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId} = await params;
    const restaurantId = req.nextUrl.searchParams.get("restaurantId");
    const sessionId = req.nextUrl.searchParams.get("sessionId");
    if (!orderId) {
      return NextResponse.json({
        success: false,
        error: "Order ID is required"
      }, { status: 400 });
    }

    if (!restaurantId) {
      return NextResponse.json({
        success: false,
        error: "Invalid restaurant"
      }, { status: 400 });
    }

    if (!sessionId) {
      return NextResponse.json({
        success: false,
        error: "Session ID is required"
      }, { status: 400 });
    }

    // Fetch order details with all related data
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select(`
        id,
        session_id,
        status,
        total_amount,
        guest_count,
        created_at,
        updated_at,
        table_id,
        tables (
          id,
          name
        ),
        order_items (
          id,
          quantity,
          notes,
          status,
          price_at_order,
          menu_item_size_id,
          topping_ids,
          created_at,
          menu_items (
            id,
            name_en,
            name_ja,
            name_vi,
            description_en,
            description_ja,
            description_vi,
            price,
            image_url,
            categories (
              id,
              name_en,
              name_ja,
              name_vi
            )
          ),
          menu_item_sizes (
            id,
            size_key,
            name_en,
            name_ja,
            name_vi,
            price
          )
        )
      `)
      .eq("id", orderId)
      .eq("session_id", sessionId)
      .eq("restaurant_id", restaurantId)
      .single() as { data: OrderData | null, error: Error | null };

    if (orderError || !order) {
      return NextResponse.json({
        success: false,
        error: "Order not found"
      }, { status: 404 });
    }

    // Fetch toppings for order items that have them
    const orderItemsWithToppings = await Promise.all(
      (order.order_items || []).map(async (item) => {
        if (item.topping_ids && item.topping_ids.length > 0) {
          const { data: toppings } = await supabaseAdmin
            .from("toppings")
            .select(`
              id,
              name_en,
              name_ja,
              name_vi,
              price
            `)
            .in("id", item.topping_ids);

          return {
            ...item,
            toppings: toppings || []
          };
        }
        return {
          ...item,
          toppings: []
        };
      })
    );

    // Helper function to get table name
    const getTableName = (tables: TableData | TableData[] | null, tableId: string): string => {
      if (!tables) return `Table ${tableId}`;
      if (Array.isArray(tables)) {
        return tables[0]?.name || `Table ${tableId}`;
      }
      return tables.name || `Table ${tableId}`;
    };

    // Format the response
    const formattedOrder = {
      id: order.id,
      sessionId: order.session_id,
      status: order.status,
      totalAmount: order.total_amount,
      guestCount: order.guest_count,
      createdAt: order.created_at,
      updatedAt: order.updated_at,
      table: {
        id: order.table_id,
        name: getTableName(order.tables, order.table_id)
      },
      items: orderItemsWithToppings.map(item => ({
        id: item.id,
        quantity: item.quantity,
        notes: item.notes,
        status: item.status,
        priceAtOrder: item.price_at_order,
        createdAt: item.created_at,
        menuItem: item.menu_items ? {
          id: item.menu_items.id,
          name_en: item.menu_items.name_en,
          name_ja: item.menu_items.name_ja,
          name_vi: item.menu_items.name_vi,
          description_en: item.menu_items.description_en,
          description_ja: item.menu_items.description_ja,
          description_vi: item.menu_items.description_vi,
          price: item.menu_items.price,
          imageUrl: item.menu_items.image_url,
          category: item.menu_items.categories ? {
            id: item.menu_items.categories.id,
            name_en: item.menu_items.categories.name_en,
            name_ja: item.menu_items.categories.name_ja,
            name_vi: item.menu_items.categories.name_vi
          } : null
        } : null,
        selectedSize: item.menu_item_sizes ? {
          id: item.menu_item_sizes.id,
          sizeKey: item.menu_item_sizes.size_key,
          name_en: item.menu_item_sizes.name_en,
          name_ja: item.menu_item_sizes.name_ja,
          name_vi: item.menu_item_sizes.name_vi,
          price: item.menu_item_sizes.price
        } : null,
        selectedToppings: item.toppings || []
      }))
    };

    return NextResponse.json({
      success: true,
      order: formattedOrder
    });

  } catch (error) {
    console.error("Error fetching order details:", error);
    return NextResponse.json({
      success: false,
      error: "Failed to fetch order details"
    }, { status: 500 });
  }
}
