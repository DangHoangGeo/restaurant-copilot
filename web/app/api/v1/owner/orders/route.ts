import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getUserFromRequest } from "@/lib/server/getUserFromRequest";
import { z } from "zod";
import { randomUUID } from "crypto";
import { ordersGetQuerySchema, createPaginationMeta, calculateDateRange } from "@/lib/utils/validation";
import { createApiSuccess, handleApiError } from "@/lib/server/apiError";
import { protectEndpoint, RATE_LIMIT_CONFIGS } from "@/lib/server/rateLimit";

// Define types for the database response
// Type for SQL function result
interface OrderCreationResult {
  order_id: string;
  total_amount: number;
  created_at: string;
}
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
  const requestId = randomUUID();
  let user: Awaited<ReturnType<typeof getUserFromRequest>> | null = null;
  
  // Apply rate limiting and CSRF protection
  const protectionResult = await protectEndpoint(
    req,
    RATE_LIMIT_CONFIGS.MUTATION,
    'orders-post'
  );
  
  if (protectionResult) {
    return protectionResult;
  }

  try {
    user = await getUserFromRequest();
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

    // Use the transactional database function to create the order atomically
    const { data: orderResult, error: createError } = await supabaseAdmin
      .rpc('create_order', {
        p_restaurant_id: user.restaurantId,
        p_table_id: table_id,
        p_guest_count: guest_count,
        p_items: JSON.stringify(order_items)
      })
      .single();

    if (createError || !orderResult) {
      throw new Error(createError?.message || 'Failed to create order');
    }

    return NextResponse.json(
      createApiSuccess({ 
        order_id: (orderResult as unknown as OrderCreationResult).order_id,
        total_amount: (orderResult as unknown as OrderCreationResult).total_amount,
        created_at: (orderResult as unknown as OrderCreationResult).created_at
      }, requestId),
      { status: 201 }
    );
    
  } catch (error) {
    return await handleApiError(
      error,
      'orders-post',
      user?.restaurantId || undefined,
      user?.userId || undefined,
      requestId
    );
  }
}

export async function GET(request: Request) {
  const requestId = randomUUID();
  let user: Awaited<ReturnType<typeof getUserFromRequest>> | null = null;
  
  try {
    user = await getUserFromRequest();
    
    if (!user?.restaurantId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse and validate query parameters
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams);
    
    const validationResult = ordersGetQuerySchema.safeParse(queryParams);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            requestId,
            details: validationResult.error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      );
    }

    const {
      fromDate,
      toDate,
      status: statusArray,
      period,
      page,
      pageSize,
    } = validationResult.data;

    // Calculate date range using validated inputs
    const { startDate, endDate } = calculateDateRange(period, fromDate, toDate);

    // Calculate pagination offset
    const offset = (page - 1) * pageSize;

    // Get total count for pagination
    const { count: totalCount, error: countError } = await supabaseAdmin
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('restaurant_id', user.restaurantId)
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .in('status', statusArray || ['new', 'serving']);

    if (countError) {
      throw new Error(`Failed to get orders count: ${countError.message}`);
    }

    // Execute paginated query with optimized select to reduce data transfer
    const { data: ordersData, error: ordersError } = await supabaseAdmin
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
      .in('status', statusArray || ['new', 'serving'])
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (ordersError) {
      throw new Error(`Failed to fetch orders: ${ordersError.message}`);
    }

    // Fetch toppings for orders that have them
    const allToppingIds = new Set<string>();
    const allMenuItemIds = new Set<string>();
    ordersData?.forEach((order: SupabaseOrderResponse) => {
      order.order_items?.forEach((item: OrderItem) => {
        allMenuItemIds.add(item.menu_item_id);
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

    // Fetch all available sizes and toppings for menu items in the orders
    const menuItemSizesMap = new Map();
    const menuItemToppingsMap = new Map();
    if (allMenuItemIds.size > 0) {
      // Fetch all sizes for menu items
      const { data: sizesData } = await supabaseAdmin
        .from('menu_item_sizes')
        .select('id, menu_item_id, size_key, name_en, name_ja, name_vi, price')
        .in('menu_item_id', Array.from(allMenuItemIds))
        .eq('restaurant_id', user.restaurantId)
        .order('position', { ascending: true });

      sizesData?.forEach(size => {
        if (!menuItemSizesMap.has(size.menu_item_id)) {
          menuItemSizesMap.set(size.menu_item_id, []);
        }
        menuItemSizesMap.get(size.menu_item_id).push(size);
      });

      // Fetch all toppings for menu items
      const { data: allToppingsData } = await supabaseAdmin
        .from('toppings')
        .select('id, menu_item_id, name_en, name_ja, name_vi, price')
        .in('menu_item_id', Array.from(allMenuItemIds))
        .eq('restaurant_id', user.restaurantId)
        .order('position', { ascending: true });

      allToppingsData?.forEach(topping => {
        if (!menuItemToppingsMap.has(topping.menu_item_id)) {
          menuItemToppingsMap.set(topping.menu_item_id, []);
        }
        menuItemToppingsMap.get(topping.menu_item_id).push(topping);
      });
    }

    // Transform data to include toppings and normalize tables structure
    const orders = ordersData?.map((order: SupabaseOrderResponse): OrderWithItems => ({
      ...order,
      // Normalize tables structure - Supabase may return as array or single object
      tables: Array.isArray(order.tables) ? order.tables[0] : order.tables,
      order_items: order.order_items?.map((item: OrderItem) => ({
        ...item,
        toppings: item.topping_ids?.map((id: string) => toppingsMap.get(id)).filter(Boolean) || [],
        availableSizes: menuItemSizesMap.get(item.menu_item_id) || [],
        availableToppings: menuItemToppingsMap.get(item.menu_item_id) || []
      }))
    })) || [];

    // Create pagination metadata
    const pagination = createPaginationMeta(page, pageSize, totalCount || 0);

    // Return structured data with pagination
    const responseData = {
      orders,
      pagination,
      filters: {
        dateRange: { from: startDate, to: endDate },
        status: statusArray || ['new', 'serving'],
      },
    };

    return NextResponse.json(
      createApiSuccess(responseData, requestId),
      { 
        status: 200,
        headers: {
          'Cache-Control': 'private, max-age=30', // Short cache for orders data
        },
      }
    );

  } catch (error) {
    return await handleApiError(
      error,
      'orders-get',
      user?.restaurantId || undefined,
      user?.userId || undefined,
      requestId
    );
  }
}