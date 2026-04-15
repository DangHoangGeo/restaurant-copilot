import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getUserFromRequest } from "@/lib/server/getUserFromRequest";
import { randomUUID } from "crypto";
import { createApiSuccess, handleApiError } from "@/lib/server/apiError";

interface CustomerData {
  customer_name: string;
  order_count: number;
  total_spent: number;
  last_visit: string;
  first_visit: string;
}

export async function GET(request: NextRequest) {
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

    // Query orders grouped by customer name to aggregate customer data
    const { data: customersData, error: queryError } = await supabaseAdmin
      .from("orders")
      .select("customer_name, id, total_amount, created_at")
      .eq("restaurant_id", user.restaurantId)
      .not("customer_name", "is", null)
      .order("created_at", { ascending: false });

    if (queryError) {
      throw new Error(`Failed to fetch customer data: ${queryError.message}`);
    }

    // Aggregate data by customer name
    const customerMap = new Map<
      string,
      {
        customer_name: string;
        order_count: number;
        total_spent: number;
        last_visit: string;
        first_visit: string;
      }
    >();

    customersData?.forEach((order: any) => {
      const customerName = order.customer_name || "Unknown Customer";
      const existing = customerMap.get(customerName) || {
        customer_name: customerName,
        order_count: 0,
        total_spent: 0,
        last_visit: order.created_at,
        first_visit: order.created_at,
      };

      existing.order_count += 1;
      existing.total_spent += order.total_amount || 0;
      existing.last_visit = new Date(order.created_at) > new Date(existing.last_visit)
        ? order.created_at
        : existing.last_visit;
      existing.first_visit = new Date(order.created_at) < new Date(existing.first_visit)
        ? order.created_at
        : existing.first_visit;

      customerMap.set(customerName, existing);
    });

    // Convert to array and sort by total spent
    const customers = Array.from(customerMap.values()).sort(
      (a, b) => b.total_spent - a.total_spent
    );

    // Calculate summary stats
    const totalCustomers = customers.length;
    const totalRevenue = customers.reduce((sum, c) => sum + c.total_spent, 0);
    const averageSpendPerCustomer = totalCustomers > 0 ? totalRevenue / totalCustomers : 0;
    const regularCustomers = customers.filter(c => c.order_count >= 3).length;
    const returningCustomers = customers.filter(c => c.order_count >= 2).length;

    const responseData = {
      customers,
      summary: {
        totalCustomers,
        totalRevenue,
        averageSpendPerCustomer,
        regularCustomers,
        returningCustomers,
      },
      message:
        customers.length === 0
          ? "No customer data yet. Orders will appear here once customers start ordering."
          : undefined,
    };

    return NextResponse.json(
      createApiSuccess(responseData, requestId),
      {
        status: 200,
        headers: {
          "Cache-Control": "private, max-age=60", // Short cache for customer data
        },
      }
    );
  } catch (error) {
    return await handleApiError(
      error,
      "customers-get",
      user?.restaurantId || undefined,
      user?.userId || undefined,
      requestId
    );
  }
}
