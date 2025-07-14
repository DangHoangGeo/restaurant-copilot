import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getUserFromRequest } from "@/lib/server/getUserFromRequest";
import { z } from "zod";
import { randomUUID } from "crypto";

// Define types for the database response
interface OrderItem {
  id: string;
  restaurant_id: string;
  order_id: string;
  menu_item_id: string;
  quantity: number;
  notes: string | null;
  status: string;
  price_at_order?: number;
  topping_ids?: string[];
  menu_item_size_id?: string;
  created_at: string;
  menu_items: Array<{
    id: string;
    restaurant_id: string;
    category_id: string;
    name_en: string;
    name_ja: string;
    name_vi: string;
    code: string;
    description_en?: string;
    description_ja?: string;
    description_vi?: string;
    price: number;
    updated_at: string;
  }>;
  menu_item_sizes: Array<{
    id: string;
    size_key: string;
    name_en: string;
    name_ja: string;
    name_vi: string;
    price: number;
  }>;
  toppings?: Array<{
    id: string;
    name_en: string;
    name_ja: string;
    name_vi: string;
    price: number;
  }>;
}

interface OrderWithItems {
  id: string;
  restaurant_id: string;
  table_id: string;
  session_id: string;
  guest_count: number;
  status: string;
  total_amount: number;
  created_at: string;
  updated_at: string;
  tables: {
    id: string;
    name: string;
    capacity: number;
  };
  order_items: OrderItem[];
}

// Interface for raw Supabase response (may have tables as array)
interface SupabaseOrderResponse {
  id: string;
  restaurant_id: string;
  table_id: string;
  session_id: string;
  guest_count: number;
  status: string;
  total_amount: number;
  created_at: string;
  updated_at: string;
  tables: {
    id: string;
    name: string;
    capacity: number;
  } | {
    id: string;
    name: string;
    capacity: number;
  }[];
  order_items: OrderItem[];
}

const orderItemSchema = z.object({
  menu_item_id: z.string().uuid(),
  quantity: z.number().int().positive(),
  notes: z.string().nullable().optional(),
  menu_item_size_id: z.string().uuid().optional(),
  topping_ids: z.array(z.string().uuid()).optional(),
});

const createOrderSchema = z.object({
  table_id: z.string().uuid(),
  guest_count: z.number().int().positive().optional().default(1),
  order_items: z.array(orderItemSchema).min(1),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest();
    if (!user || !user.restaurantId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const validatedData = createOrderSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json(
        { success: false, error: "Invalid order data", details: validatedData.error.flatten() },
        { status: 400 }
      );
    }

    const { table_id, guest_count, order_items } = validatedData.data;

    // Verify table belongs to restaurant
    const { data: table, error: tableError } = await supabaseAdmin
      .from("tables")
      .select("id")
      .eq("id", table_id)
      .eq("restaurant_id", user.restaurantId)
      .single();

    if (tableError || !table) {
      return NextResponse.json(
        { success: false, error: "Table not found" },
        { status: 404 }
      );
    }

    // Verify menu items belong to restaurant and calculate total
    let total_amount = 0;
    const itemPrices = new Map<string, number>(); // Store calculated price for each item
    
    for (const item of order_items) {
      const { data: menuItem, error: menuError } = await supabaseAdmin
        .from("menu_items")
        .select("price")
        .eq("id", item.menu_item_id)
        .eq("restaurant_id", user.restaurantId)
        .single();

      if (menuError || !menuItem) {
        return NextResponse.json(
          { success: false, error: `Menu item ${item.menu_item_id} not found` },
          { status: 404 }
        );
      }

      let itemPrice = menuItem.price;

      // Add size price if specified
      if (item.menu_item_size_id) {
        const { data: sizeData, error: sizeError } = await supabaseAdmin
          .from("menu_item_sizes")
          .select("price")
          .eq("id", item.menu_item_size_id)
          .eq("restaurant_id", user.restaurantId)
          .single();

        if (sizeError || !sizeData) {
          return NextResponse.json(
            { success: false, error: `Menu item size ${item.menu_item_size_id} not found` },
            { status: 404 }
          );
        }

        itemPrice = sizeData.price; // Size price replaces base price
      }

      // Add toppings price if specified
      if (item.topping_ids && item.topping_ids.length > 0) {
        const { data: toppingsData, error: toppingsError } = await supabaseAdmin
          .from("toppings")
          .select("price")
          .in("id", item.topping_ids)
          .eq("restaurant_id", user.restaurantId);

        if (toppingsError || !toppingsData) {
          return NextResponse.json(
            { success: false, error: "Invalid toppings specified" },
            { status: 404 }
          );
        }

        // Validate all toppings exist
        if (toppingsData.length !== item.topping_ids.length) {
          return NextResponse.json(
            { success: false, error: "Some toppings not found" },
            { status: 404 }
          );
        }

        const toppingsPrice = toppingsData.reduce((sum, topping) => sum + topping.price, 0);
        itemPrice += toppingsPrice;
      }

      // Store the calculated price for this item
      const itemKey = `${item.menu_item_id}-${item.menu_item_size_id || 'no-size'}-${(item.topping_ids || []).sort().join(',')}`;
      itemPrices.set(itemKey, itemPrice);
      
      total_amount += itemPrice * item.quantity;
    }

    // Create the order
    const { data: newOrder, error: orderError } = await supabaseAdmin
      .from("orders")
      .insert({
        restaurant_id: user.restaurantId,
        table_id,
        session_id: randomUUID(),
        guest_count,
        status: "new",
        total_amount,
      })
      .select()
      .single();

    if (orderError || !newOrder) {
      console.error("Error creating order:", orderError);
      return NextResponse.json(
        { success: false, error: "Failed to create order" },
        { status: 500 }
      );
    }

    // Create order items
    const orderItemsToInsert = order_items.map(item => {
      // Generate the same key used during price calculation
      const itemKey = `${item.menu_item_id}-${item.menu_item_size_id || 'no-size'}-${(item.topping_ids || []).sort().join(',')}`;
      const priceAtOrder = itemPrices.get(itemKey) || 0;
      
      return {
        restaurant_id: user.restaurantId,
        order_id: newOrder.id,
        menu_item_id: item.menu_item_id,
        quantity: item.quantity,
        notes: item.notes || null,
        menu_item_size_id: item.menu_item_size_id || null,
        topping_ids: item.topping_ids || null,
        price_at_order: priceAtOrder,
        status: "new" as const,
      };
    });

    const { error: itemsError } = await supabaseAdmin
      .from("order_items")
      .insert(orderItemsToInsert);

    if (itemsError) {
      console.error("Error creating order items:", itemsError);
      // Rollback order creation
      await supabaseAdmin.from("orders").delete().eq("id", newOrder.id);
      return NextResponse.json(
        { success: false, error: "Failed to create order items" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, order_id: newOrder.id });
  } catch (error) {
    console.error("Error in order creation:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest();
    
    if (!user?.restaurantId) {
      return NextResponse.json(
        { error: "Restaurant ID not found" },
        { status: 401 }
      );
    }

    // Parse query parameters for filtering
    const url = new URL(request.url);
    const fromDate = url.searchParams.get('fromDate');
    const toDate = url.searchParams.get('toDate');
    const statusFilter = url.searchParams.get('status'); // Can be comma-separated list
    const period = url.searchParams.get('period'); // today, yesterday, thisWeek, etc.

    // Calculate date range
    let startDate: string;
    let endDate: string;

    if (fromDate && toDate) {
      // Use custom date range
      startDate = new Date(fromDate).toISOString();
      endDate = new Date(toDate + 'T23:59:59.999Z').toISOString();
    } else if (period) {
      // Use predefined period
      const now = new Date();
      switch (period) {
        case 'today':
          startDate = new Date(now.setHours(0, 0, 0, 0)).toISOString();
          endDate = new Date(now.setHours(23, 59, 59, 999)).toISOString();
          break;
        case 'yesterday':
          const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          startDate = new Date(yesterday.setHours(0, 0, 0, 0)).toISOString();
          endDate = new Date(yesterday.setHours(23, 59, 59, 999)).toISOString();
          break;
        case 'thisWeek':
          const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
          startDate = new Date(startOfWeek.setHours(0, 0, 0, 0)).toISOString();
          endDate = new Date().toISOString();
          break;
        case 'last7days':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
          endDate = new Date().toISOString();
          break;
        case 'last30days':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
          endDate = new Date().toISOString();
          break;
        default:
          // Default to today if no valid period
          startDate = new Date(now.setHours(0, 0, 0, 0)).toISOString();
          endDate = new Date(now.setHours(23, 59, 59, 999)).toISOString();
      }
    } else {
      // Default to today
      const now = new Date();
      startDate = new Date(now.setHours(0, 0, 0, 0)).toISOString();
      endDate = new Date(now.setHours(23, 59, 59, 999)).toISOString();
    }

    // Parse status filter
    const statusArray = statusFilter 
      ? statusFilter.split(',').map(s => s.trim())
      : ['new', 'serving']; // Default to active orders

    // Use manual query with date and status filtering since RPC function is limited
    const query = supabaseAdmin
      .from('orders')
      .select(`
        id,
        restaurant_id,
        table_id,
        session_id,
        guest_count,
        status,
        total_amount,
        created_at,
        updated_at,
        tables (
          id,
          name,
          capacity
        ),
        order_items (
          id,
          restaurant_id,
          order_id,
          menu_item_id,
          quantity,
          notes,
          status,
          price_at_order,
          topping_ids,
          menu_item_size_id,
          created_at,
          menu_items (
            id,
            restaurant_id,
            category_id,
            name_en,
            name_ja,
            name_vi,
            code,
            description_en,
            description_ja,
            description_vi,
            price,
            updated_at
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
      .eq('restaurant_id', user.restaurantId)
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .in('status', statusArray)
      .order('created_at', { ascending: false });

    const { data: ordersData, error: ordersError } = await query;

    if (ordersError) {
      console.error('Database error:', ordersError);
      return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
    }

    // Fetch toppings for orders that have them
    const allToppingIds = new Set<string>();
    ordersData?.forEach((order: SupabaseOrderResponse) => {
      order.order_items?.forEach((item: OrderItem) => {
        if (item.topping_ids && Array.isArray(item.topping_ids)) {
          item.topping_ids.forEach((id: string) => allToppingIds.add(id));
        }
      });
    });

    const toppingsMap = new Map();
    if (allToppingIds.size > 0) {
      const { data: toppingsData } = await supabaseAdmin
        .from('toppings')
        .select('id, name_en, name_ja, name_vi, price')
        .in('id', Array.from(allToppingIds))
        .eq('restaurant_id', user.restaurantId);

      toppingsData?.forEach(topping => {
        toppingsMap.set(topping.id, topping);
      });
    }

    // Transform data to include toppings and normalize tables structure
    const orders = ordersData?.map((order: SupabaseOrderResponse): OrderWithItems => ({
      ...order,
      // Normalize tables structure - Supabase may return as array or single object
      tables: Array.isArray(order.tables) ? order.tables[0] : order.tables,
      order_items: order.order_items?.map((item: OrderItem) => ({
        ...item,
        toppings: item.topping_ids?.map((id: string) => toppingsMap.get(id)).filter(Boolean) || []
      }))
    })) || [];

    // Fetch additional data that components may need
    const [tablesResult, categoriesResult] = await Promise.all([
      // Fetch available tables
      supabaseAdmin
        .from("tables")
        .select("id, name, status")
        .eq("restaurant_id", user.restaurantId)
        .order("name"),

      // Fetch menu categories and items with sizes and toppings
      supabaseAdmin
        .from("categories")
        .select(`
          id, name_en, name_ja, name_vi, position,
          menu_items(
            id, name_en, name_ja, name_vi, price, available, position,
            menu_item_sizes(id, size_key, name_en, name_ja, name_vi, price, position),
            toppings(id, name_en, name_ja, name_vi, price, position)
          )
        `)
        .eq("restaurant_id", user.restaurantId)
        .order("position")
    ]);

    // Check for errors
    if (tablesResult.error) throw tablesResult.error;
    if (categoriesResult.error) throw categoriesResult.error;

    // Return structured data
    return NextResponse.json({
      orders,
      tables: tablesResult.data || [],
      categories: categoriesResult.data || [],
      dateRange: { from: startDate, to: endDate },
      statusFilter: statusArray
    });

  } catch (error) {
    console.error("Error fetching orders data:", error);
    return NextResponse.json(
      { 
        error: "Failed to fetch orders data",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}