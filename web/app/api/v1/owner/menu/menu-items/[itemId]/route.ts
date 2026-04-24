import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserFromRequest, AuthUser } from "@/lib/server/getUserFromRequest";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { invalidateMenuCache } from "@/lib/server/request-context";
import { logger } from "@/lib/logger";
import { resolveScopedBranchRouteAccess } from "@/lib/server/organizations/branch-route";
import { hasPermission } from "@/lib/server/rolePermissions";

// Schema for toppings
const toppingSchema = z.object({
  name_en: z.string().min(1).max(100),
  name_ja: z.string().max(100).optional(),
  name_vi: z.string().max(100).optional(),
  price: z.number().min(0),
  position: z.number().optional(),
});

// Schema for menu item sizes
const menuItemSizeSchema = z.object({
  size_key: z.string().min(1).max(50),
  name_en: z.string().min(1).max(100),
  name_ja: z.string().max(100).optional(),
  name_vi: z.string().max(100).optional(),
  price: z.number().min(0),
  position: z.number().optional(),
});

// Schema for validating the request body when updating a menu item
const menuItemUpdateSchema = z.object({
  category_id: z.string().uuid().optional(),
  name_en: z.string().min(1).max(100).optional(),
  name_ja: z.string().max(100).optional(),
  name_vi: z.string().max(100).optional(),
  description_en: z.string().max(500).optional(),
  description_ja: z.string().max(500).optional(),
  description_vi: z.string().max(500).optional(),
  price: z.number().min(0).optional(),
  image_url: z.string().url().optional().nullable(),
  available: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  weekday_visibility: z.array(z.number().min(1).max(7)).optional(),
  stock_level: z.number().min(0).optional(),
  position: z.number().optional(),
  toppings: z.array(toppingSchema).optional(),
  sizes: z.array(menuItemSizeSchema).optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> },
) {
  const user: AuthUser | null = await getUserFromRequest();

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized: Missing user" },
      { status: 401 },
    );
  }

  if (!hasPermission(user, "menu_items", "UPDATE")) {
    return NextResponse.json(
      { error: "Forbidden: Insufficient menu permissions" },
      { status: 403 },
    );
  }

  const { itemId } = await params;
  const requestedBranchId =
    new URL(req.url).searchParams.get("branchId") ?? user.restaurantId;
  const branchAccess = requestedBranchId
    ? await resolveScopedBranchRouteAccess(requestedBranchId)
    : null;

  if (!branchAccess) {
    return NextResponse.json(
      { error: "Branch access denied" },
      { status: 403 },
    );
  }

  const restaurantId = branchAccess.branchId;

  // Validate UUID format
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(itemId)) {
    return NextResponse.json(
      { error: "Invalid menu item ID format" },
      { status: 400 },
    );
  }

  try {
    const body = await req.json();
    const validatedData = menuItemUpdateSchema.safeParse(body);

    if (!validatedData.success) {
      await logger.error(
        "menu-items-update",
        "Validation error",
        {
          error: validatedData.error.flatten().fieldErrors,
          itemId,
        },
        restaurantId,
        user.userId,
      );
      return NextResponse.json(
        { errors: validatedData.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const updateData = validatedData.data;
    const { toppings, sizes, ...menuItemUpdateData } = updateData;
    // If category_id is being updated, verify it belongs to the user's restaurant
    if (menuItemUpdateData.category_id) {
      const { data: category, error: categoryError } = await supabaseAdmin
        .from("categories")
        .select("restaurant_id")
        .eq("id", menuItemUpdateData.category_id)
        .single();

      if (
        categoryError ||
        !category ||
        category.restaurant_id !== restaurantId
      ) {
        return NextResponse.json(
          {
            error:
              "Invalid category or category does not belong to your restaurant",
          },
          { status: 400 },
        );
      }
    }

    // First verify the menu item exists and belongs to the user's restaurant
    const { data: existingItem, error: fetchError } = await supabaseAdmin
      .from("menu_items")
      .select("restaurant_id")
      .eq("id", itemId)
      .single();

    if (
      fetchError ||
      !existingItem ||
      existingItem.restaurant_id !== restaurantId
    ) {
      return NextResponse.json(
        { error: "Menu item not found or does not belong to your restaurant" },
        { status: 404 },
      );
    }

    // Update menu item basic data if provided
    if (Object.keys(menuItemUpdateData).length > 0) {
      const { error } = await supabaseAdmin
        .from("menu_items")
        .update(menuItemUpdateData)
        .eq("id", itemId)
        .eq("restaurant_id", restaurantId);

      if (error) {
        console.error("Error updating menu item:", error);
        return NextResponse.json(
          { message: "Error updating menu item", details: error.message },
          { status: 500 },
        );
      }
    }

    // Handle toppings update if provided
    if (toppings !== undefined) {
      // Delete existing toppings
      const { error: deleteError } = await supabaseAdmin
        .from("toppings")
        .delete()
        .eq("menu_item_id", itemId)
        .eq("restaurant_id", restaurantId);

      if (deleteError) {
        console.error("Error deleting existing toppings:", deleteError);
        return NextResponse.json(
          { message: "Error updating toppings", details: deleteError.message },
          { status: 500 },
        );
      }

      // Insert new toppings if any
      if (toppings.length > 0) {
        const toppingsData = toppings.map((topping, index) => ({
          restaurant_id: restaurantId,
          menu_item_id: itemId,
          name_en: topping.name_en,
          name_ja: topping.name_ja || topping.name_en,
          name_vi: topping.name_vi || topping.name_en,
          price: topping.price,
          position: topping.position ?? index,
        }));

        const { error: insertError } = await supabaseAdmin
          .from("toppings")
          .insert(toppingsData);

        if (insertError) {
          console.error("Error inserting new toppings:", insertError);
          return NextResponse.json(
            {
              message: "Error updating toppings",
              details: insertError.message,
            },
            { status: 500 },
          );
        }
      }
    }

    // Handle sizes update if provided
    if (sizes !== undefined) {
      // Delete existing sizes
      const { error: deleteError } = await supabaseAdmin
        .from("menu_item_sizes")
        .delete()
        .eq("menu_item_id", itemId)
        .eq("restaurant_id", restaurantId);

      if (deleteError) {
        console.error("Error deleting existing sizes:", deleteError);
        return NextResponse.json(
          { message: "Error updating sizes", details: deleteError.message },
          { status: 500 },
        );
      }

      // Insert new sizes if any
      if (sizes.length > 0) {
        const sizesData = sizes.map((size, index) => ({
          restaurant_id: restaurantId,
          menu_item_id: itemId,
          size_key: size.size_key,
          name_en: size.name_en,
          name_ja: size.name_ja || size.name_en,
          name_vi: size.name_vi || size.name_en,
          price: size.price,
          position: size.position ?? index,
        }));

        const { error: insertError } = await supabaseAdmin
          .from("menu_item_sizes")
          .insert(sizesData);

        if (insertError) {
          console.error("Error inserting new sizes:", insertError);
          return NextResponse.json(
            { message: "Error updating sizes", details: insertError.message },
            { status: 500 },
          );
        }
      }
    }

    // Fetch the complete updated menu item with toppings and sizes
    const { data: completeMenuItem, error: completeError } = await supabaseAdmin
      .from("menu_items")
      .select(
        `
        *,
        toppings (*),
        menu_item_sizes (*)
      `,
      )
      .eq("id", itemId)
      .single();

    if (completeError) {
      await logger.error(
        "menu-items-update",
        "Error fetching complete menu item",
        {
          error: completeError.message,
          itemId,
        },
        restaurantId,
        user.userId,
      );
      return NextResponse.json(
        {
          message: "Menu item updated but error fetching complete data",
          details: completeError.message,
        },
        { status: 500 },
      );
    }

    // Invalidate menu cache since we updated a menu item
    invalidateMenuCache(restaurantId);

    return NextResponse.json(
      { message: "Menu item updated successfully", menuItem: completeMenuItem },
      { status: 200 },
    );
  } catch (error) {
    await logger.error(
      "menu-items-update",
      "API Error in PUT menu item",
      {
        error: error instanceof Error ? error.message : "Unknown error",
        itemId,
      },
      restaurantId,
      user?.userId,
    );
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Validation error", errors: error.flatten().fieldErrors },
        { status: 400 },
      );
    }
    return NextResponse.json(
      {
        message: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error!",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ itemId: string }> },
) {
  const user: AuthUser | null = await getUserFromRequest();

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized: Missing user" },
      { status: 401 },
    );
  }

  if (!hasPermission(user, "menu_items", "DELETE")) {
    return NextResponse.json(
      { error: "Forbidden: Insufficient menu permissions" },
      { status: 403 },
    );
  }

  const { itemId } = await params;
  const requestedBranchId =
    new URL(_req.url).searchParams.get("branchId") ?? user.restaurantId;
  const branchAccess = requestedBranchId
    ? await resolveScopedBranchRouteAccess(requestedBranchId)
    : null;

  if (!branchAccess) {
    return NextResponse.json(
      { error: "Branch access denied" },
      { status: 403 },
    );
  }

  const restaurantId = branchAccess.branchId;

  // Validate UUID format
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(itemId)) {
    return NextResponse.json(
      { error: "Invalid menu item ID format" },
      { status: 400 },
    );
  }

  try {
    // First verify the menu item exists and belongs to the user's restaurant
    const { data: existingItem, error: fetchError } = await supabaseAdmin
      .from("menu_items")
      .select("restaurant_id")
      .eq("id", itemId)
      .single();

    if (
      fetchError ||
      !existingItem ||
      existingItem.restaurant_id !== restaurantId
    ) {
      return NextResponse.json(
        { error: "Menu item not found or does not belong to your restaurant" },
        { status: 404 },
      );
    }

    const { error } = await supabaseAdmin
      .from("menu_items")
      .delete()
      .eq("id", itemId)
      .eq("restaurant_id", restaurantId);

    if (error) {
      await logger.error(
        "menu-items-delete",
        "Error deleting menu item",
        {
          error: error.message,
          itemId,
        },
        restaurantId,
        user.userId,
      );
      return NextResponse.json(
        { message: "Error deleting menu item", details: error.message },
        { status: 500 },
      );
    }

    // Invalidate menu cache since we deleted a menu item
    invalidateMenuCache(restaurantId);

    return NextResponse.json(
      { message: "Menu item deleted successfully" },
      { status: 200 },
    );
  } catch (error) {
    await logger.error(
      "menu-items-delete",
      "API Error in DELETE menu item",
      {
        error: error instanceof Error ? error.message : "Unknown error",
        itemId,
      },
      restaurantId,
      user?.userId,
    );
    return NextResponse.json(
      {
        message: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error!",
      },
      { status: 500 },
    );
  }
}
