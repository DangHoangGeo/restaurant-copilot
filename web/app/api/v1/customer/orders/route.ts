import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getUserFromRequest } from "@/lib/server/getUserFromRequest";
import { z } from "zod";

const orderItemSchema = z.object({
  menu_item_id: z.string().uuid(),
  quantity: z.number().int().positive(),
  notes: z.string().nullable().optional(),
});

const createOrderSchema = z.object({
  table_id: z.string().uuid(),
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

    const { table_id, order_items } = validatedData.data;

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

      total_amount += menuItem.price * item.quantity;
    }

    // Create the order
    const { data: newOrder, error: orderError } = await supabaseAdmin
      .from("orders")
      .insert({
        restaurant_id: user.restaurantId,
        table_id,
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
    const orderItemsToInsert = order_items.map(item => ({
      order_id: newOrder.id,
      menu_item_id: item.menu_item_id,
      quantity: item.quantity,
      notes: item.notes || null,
      status: "new" as const,
    }));

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

export async function GET() {
  try {
    const user = await getUserFromRequest();
    
    if (!user?.restaurantId) {
      return NextResponse.json(
        { error: "Restaurant ID not found" },
        { status: 401 }
      );
    }

    // Get today's date range for filtering
    const today = new Date();
    const startOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      0,
      0,
      0,
      0
    ).toISOString();

    // Fetch all data in parallel for better performance
    const [ordersResult, tablesResult, categoriesResult, restaurantResult] = await Promise.all([
      // Fetch orders with order items
      supabaseAdmin
        .from("orders")
        .select(`
          id, table_id, status, total_amount, created_at, 
          order_items(
            id, quantity, notes, status, created_at, 
            menu_items(id, name_en, name_ja, name_vi, category_id, price, 
              categories(id, name_en, name_ja, name_vi)
            )
          ), 
          tables(id, name)
        `)
        .eq("restaurant_id", user.restaurantId)
        .gte("created_at", startOfDay)
        .order("created_at", { ascending: false }),

      // Fetch available tables
      supabaseAdmin
        .from("tables")
        .select("id, name, status")
        .eq("restaurant_id", user.restaurantId)
        .order("name"),

      // Fetch menu categories and items
      supabaseAdmin
        .from("categories")
        .select(`
          id, name_en, name_ja, name_vi,
          menu_items(id, name_en, name_ja, name_vi, price, available)
        `)
        .eq("restaurant_id", user.restaurantId)
        .order("position"),

      // Fetch restaurant info
      supabaseAdmin
        .from("restaurants")
        .select("id, name, logo_url")
        .eq("id", user.restaurantId)
        .single()
    ]);

    // Check for errors
    if (ordersResult.error) throw ordersResult.error;
    if (tablesResult.error) throw tablesResult.error;
    if (categoriesResult.error) throw categoriesResult.error;
    if (restaurantResult.error) throw restaurantResult.error;

    // Return structured data
    return NextResponse.json({
      orders: ordersResult.data || [],
      tables: tablesResult.data || [],
      categories: categoriesResult.data || [],
      restaurant: {
        id: restaurantResult.data.id,
        name: restaurantResult.data.name,
        logoUrl: restaurantResult.data.logo_url,
      },
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