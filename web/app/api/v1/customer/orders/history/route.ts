import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: NextRequest) {
  try {
    const sessionId = req.nextUrl.searchParams.get("sessionId");
    const restaurantId = req.nextUrl.searchParams.get("restaurantId");

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: "Session ID is required" },
        { status: 400 }
      );
    }

    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: "Restaurant ID is required" },
        { status: 400 }
      );
    }

    // Fetch session information with table details
    const { data: sessionInfo, error: sessionError } = await supabaseAdmin
      .from("order_sessions")
      .select(`
        id,
        passcode,
        guest_count,
        table_id,
        created_at,
        status,
        tables (
          id,
          name
        )
      `)
      .eq("id", sessionId)
      .eq("restaurant_id", restaurantId)
      .single();

    if (sessionError || !sessionInfo) {
      return NextResponse.json(
        { success: false, error: "Session not found" },
        { status: 404 }
      );
    }

    // Fetch all orders for this session
    const { data: orders, error: ordersError } = await supabaseAdmin
      .from("orders")
      .select(`
        id,
        status,
        total_amount,
        created_at,
        updated_at,
        order_items (
          id,
          quantity,
          notes,
          status,
          price_at_order,
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
          ),
          topping_ids
        )
      `)
      .eq("session_id", sessionId)
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false });

    if (ordersError) {
      return NextResponse.json(
        { success: false, error: "Failed to fetch orders" },
        { status: 500 }
      );
    }

    // Process orders with toppings
    const ordersWithToppings = await Promise.all(
      (orders || []).map(async (order) => {
        const itemsWithToppings = await Promise.all(
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

        return {
          ...order,
          order_items: itemsWithToppings
        };
      })
    );

    // Calculate session totals
    const totalAmount = ordersWithToppings.reduce((sum, order) => sum + (order.total_amount || 0), 0);
    const totalItems = ordersWithToppings.reduce((sum, order) => sum + (order.order_items?.length || 0), 0);

    return NextResponse.json({
      success: true,
      session: {
        id: sessionInfo.id,
        passcode: sessionInfo.passcode,
        guestCount: sessionInfo.guest_count,
        tableId: sessionInfo.table_id,
        tableName: sessionInfo.tables[0]?.name || "Unknown Table",
        createdAt: sessionInfo.created_at,
        status: sessionInfo.status,
        totalAmount,
        totalItems
      },
      orders: ordersWithToppings.map(order => ({
        id: order.id,
        status: order.status,
        totalAmount: order.total_amount,
        createdAt: order.created_at,
        updatedAt: order.updated_at,
        items: (order.order_items || []).map(item => ({
          id: item.id,
          quantity: item.quantity,
          notes: item.notes,
          status: item.status,
          priceAtOrder: item.price_at_order,
          createdAt: item.created_at,
          menuItem: item.menu_items ? {
            id: item.menu_items[0].id,
            name_en: item.menu_items[0].name_en,
            name_ja: item.menu_items[0].name_ja,
            name_vi: item.menu_items[0].name_vi,
            description_en: item.menu_items[0].description_en,
            description_ja: item.menu_items[0].description_ja,
            description_vi: item.menu_items[0].description_vi,
            price: item.menu_items[0].price,
            imageUrl: item.menu_items[0].image_url,
            category: item.menu_items[0].categories ? {
              id: item.menu_items[0].categories[0].id,
              name_en: item.menu_items[0].categories[0].name_en,
              name_ja: item.menu_items[0].categories[0].name_ja,
              name_vi: item.menu_items[0].categories[0].name_vi
            } : null
          } : null,
          selectedSize: item.menu_item_sizes ? {
            id: item.menu_item_sizes[0].id,
            sizeKey: item.menu_item_sizes[0].size_key,
            name_en: item.menu_item_sizes[0].name_en,
            name_ja: item.menu_item_sizes[0].name_ja,
            name_vi: item.menu_item_sizes[0].name_vi,
            price: item.menu_item_sizes[0].price
          } : null,
          selectedToppings: item.toppings || []
        }))
      }))
    });

  } catch (error) {
    console.error("Error fetching order history:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
