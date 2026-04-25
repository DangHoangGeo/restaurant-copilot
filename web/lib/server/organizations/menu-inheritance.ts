import { supabaseAdmin } from "@/lib/supabaseAdmin";

export interface BranchWorkspaceSize {
  id?: string;
  size_key: string;
  name_en: string;
  name_ja: string | null;
  name_vi: string | null;
  price: number;
  position: number;
}

export interface BranchWorkspaceTopping {
  id?: string;
  name_en: string;
  name_ja: string | null;
  name_vi: string | null;
  price: number;
  position: number;
}

export interface BranchWorkspaceItem {
  id: string;
  category_id: string;
  organization_menu_item_id: string | null;
  source: "organization" | "branch";
  name_en: string;
  name_ja: string | null;
  name_vi: string | null;
  description_en: string | null;
  description_ja: string | null;
  description_vi: string | null;
  price: number;
  image_url: string | null;
  available: boolean;
  weekday_visibility: number[];
  stock_level: number | null;
  position: number;
  sizes: BranchWorkspaceSize[];
  toppings: BranchWorkspaceTopping[];
}

export interface BranchWorkspaceCategory {
  id: string;
  organization_menu_category_id: string | null;
  source: "organization" | "branch";
  name_en: string;
  name_ja: string | null;
  name_vi: string | null;
  position: number;
  menu_items: BranchWorkspaceItem[];
}

export interface BranchMenuWorkspaceSummary {
  totalCategories: number;
  totalItems: number;
  inheritedCategories: number;
  inheritedItems: number;
  localCategories: number;
  localItems: number;
}

export interface BranchMenuWorkspaceData {
  categories: BranchWorkspaceCategory[];
  summary: BranchMenuWorkspaceSummary;
}

function defaultWeekdayVisibility() {
  return [1, 2, 3, 4, 5, 6, 7];
}

function isMissingInheritanceColumnError(
  error: { message?: string } | null | undefined,
) {
  const message = error?.message ?? "";
  return (
    message.includes("organization_menu_category_id") ||
    message.includes("organization_menu_item_id")
  );
}

async function menuInheritanceColumnsAvailable(): Promise<boolean> {
  const [categoryCheck, itemCheck] = await Promise.all([
    supabaseAdmin
      .from("categories")
      .select("organization_menu_category_id")
      .limit(1),
    supabaseAdmin
      .from("menu_items")
      .select("organization_menu_item_id")
      .limit(1),
  ]);

  return (
    !isMissingInheritanceColumnError(categoryCheck.error) &&
    !isMissingInheritanceColumnError(itemCheck.error)
  );
}

async function loadSharedMenuForSync(organizationId: string) {
  const { data, error } = await supabaseAdmin
    .from("organization_menu_categories")
    .select(
      `
      id,
      name_en,
      name_ja,
      name_vi,
      is_active,
      position,
      organization_menu_items(
        id,
        category_id,
        name_en,
        name_ja,
        name_vi,
        description_en,
        description_ja,
        description_vi,
        price,
        image_url,
        available,
        position,
        organization_menu_item_sizes(
          id,
          size_key,
          name_en,
          name_ja,
          name_vi,
          price,
          position
        ),
        organization_menu_item_toppings(
          id,
          name_en,
          name_ja,
          name_vi,
          price,
          position
        )
      )
    `,
    )
    .eq("organization_id", organizationId)
    .eq("is_active", true)
    .order("position", { ascending: true })
    .order("position", {
      foreignTable: "organization_menu_items",
      ascending: true,
    });

  if (error || !data) {
    throw new Error(
      error?.message ?? "Failed to load organization shared menu",
    );
  }

  return data.map((category) => ({
    id: category.id,
    name_en: category.name_en,
    name_ja: category.name_ja,
    name_vi: category.name_vi,
    position: category.position,
    items: (category.organization_menu_items ?? []).map((item) => ({
      id: item.id,
      category_id: item.category_id,
      name_en: item.name_en,
      name_ja: item.name_ja,
      name_vi: item.name_vi,
      description_en: item.description_en,
      description_ja: item.description_ja,
      description_vi: item.description_vi,
      price: Number(item.price ?? 0),
      image_url: item.image_url,
      available: item.available,
      position: item.position,
      sizes: (item.organization_menu_item_sizes ?? []).map((size) => ({
        size_key: size.size_key,
        name_en: size.name_en,
        name_ja: size.name_ja,
        name_vi: size.name_vi,
        price: Number(size.price ?? 0),
        position: size.position,
      })),
      toppings: (item.organization_menu_item_toppings ?? []).map((topping) => ({
        name_en: topping.name_en,
        name_ja: topping.name_ja,
        name_vi: topping.name_vi,
        price: Number(topping.price ?? 0),
        position: topping.position,
      })),
    })),
  }));
}

async function syncInheritedMenuItemOptions(params: {
  restaurantId: string;
  menuItemId: string;
  sizes: Array<{
    size_key: string;
    name_en: string;
    name_ja: string | null;
    name_vi: string | null;
    price: number;
    position: number;
  }>;
  toppings: Array<{
    name_en: string;
    name_ja: string | null;
    name_vi: string | null;
    price: number;
    position: number;
  }>;
}) {
  const { restaurantId, menuItemId, sizes, toppings } = params;

  const [{ error: deleteSizesError }, { error: deleteToppingsError }] =
    await Promise.all([
      supabaseAdmin
        .from("menu_item_sizes")
        .delete()
        .eq("restaurant_id", restaurantId)
        .eq("menu_item_id", menuItemId),
      supabaseAdmin
        .from("toppings")
        .delete()
        .eq("restaurant_id", restaurantId)
        .eq("menu_item_id", menuItemId),
    ]);

  if (deleteSizesError) {
    throw new Error(deleteSizesError.message);
  }

  if (deleteToppingsError) {
    throw new Error(deleteToppingsError.message);
  }

  if (sizes.length > 0) {
    const { error } = await supabaseAdmin.from("menu_item_sizes").insert(
      sizes.map((size, index) => ({
        restaurant_id: restaurantId,
        menu_item_id: menuItemId,
        size_key: size.size_key,
        name_en: size.name_en,
        name_ja: size.name_ja ?? size.name_en,
        name_vi: size.name_vi ?? size.name_en,
        price: size.price,
        position: size.position ?? index,
      })),
    );

    if (error) {
      throw new Error(error.message);
    }
  }

  if (toppings.length > 0) {
    const { error } = await supabaseAdmin.from("toppings").insert(
      toppings.map((topping, index) => ({
        restaurant_id: restaurantId,
        menu_item_id: menuItemId,
        name_en: topping.name_en,
        name_ja: topping.name_ja ?? topping.name_en,
        name_vi: topping.name_vi ?? topping.name_en,
        price: topping.price,
        position: topping.position ?? index,
      })),
    );

    if (error) {
      throw new Error(error.message);
    }
  }
}

async function getLegacyBranchMenuWorkspace(
  restaurantId: string,
): Promise<BranchMenuWorkspaceData> {
  const { data: categories, error } = await supabaseAdmin
    .from("categories")
    .select(
      `
      id,
      name_en,
      name_ja,
      name_vi,
      position,
      menu_items(
        id,
        category_id,
        name_en,
        name_ja,
        name_vi,
        description_en,
        description_ja,
        description_vi,
        price,
        image_url,
        available,
        weekday_visibility,
        stock_level,
        position,
        menu_item_sizes(
          id,
          size_key,
          name_en,
          name_ja,
          name_vi,
          price,
          position
        ),
        toppings(
          id,
          name_en,
          name_ja,
          name_vi,
          price,
          position
        )
      )
    `,
    )
    .eq("restaurant_id", restaurantId)
    .order("position", { ascending: true })
    .order("position", { foreignTable: "menu_items", ascending: true })
    .order("position", {
      foreignTable: "menu_items.menu_item_sizes",
      ascending: true,
    })
    .order("position", {
      foreignTable: "menu_items.toppings",
      ascending: true,
    });

  if (error || !categories) {
    throw new Error(
      error?.message ?? "Failed to load legacy branch menu workspace",
    );
  }

  const mappedCategories = categories.map((category) => ({
    id: category.id,
    organization_menu_category_id: null,
    source: "branch" as const,
    name_en: category.name_en,
    name_ja: category.name_ja,
    name_vi: category.name_vi,
    position: category.position,
    menu_items: (category.menu_items ?? []).map((item) => ({
      id: item.id,
      category_id: item.category_id,
      organization_menu_item_id: null,
      source: "branch" as const,
      name_en: item.name_en,
      name_ja: item.name_ja,
      name_vi: item.name_vi,
      description_en: item.description_en,
      description_ja: item.description_ja,
      description_vi: item.description_vi,
      price: Number(item.price ?? 0),
      image_url: item.image_url,
      available: item.available,
      weekday_visibility: item.weekday_visibility ?? defaultWeekdayVisibility(),
      stock_level: item.stock_level ?? null,
      position: item.position,
      sizes: (item.menu_item_sizes ?? []).map((size) => ({
        id: size.id,
        size_key: size.size_key,
        name_en: size.name_en,
        name_ja: size.name_ja,
        name_vi: size.name_vi,
        price: Number(size.price ?? 0),
        position: size.position,
      })),
      toppings: (item.toppings ?? []).map((topping) => ({
        id: topping.id,
        name_en: topping.name_en,
        name_ja: topping.name_ja,
        name_vi: topping.name_vi,
        price: Number(topping.price ?? 0),
        position: topping.position ?? 0,
      })),
    })),
  })) satisfies BranchWorkspaceCategory[];

  const totalItems = mappedCategories.reduce(
    (sum, category) => sum + category.menu_items.length,
    0,
  );

  return {
    categories: mappedCategories,
    summary: {
      totalCategories: mappedCategories.length,
      totalItems,
      inheritedCategories: 0,
      inheritedItems: 0,
      localCategories: mappedCategories.length,
      localItems: totalItems,
    },
  };
}

export async function syncOrganizationSharedMenuToBranches(params: {
  organizationId: string;
  restaurantIds?: string[];
}): Promise<void> {
  const { organizationId, restaurantIds } = params;

  if (!(await menuInheritanceColumnsAvailable())) {
    return;
  }

  const sharedCategories = await loadSharedMenuForSync(organizationId);

  const restaurantQuery = supabaseAdmin
    .from("organization_restaurants")
    .select("restaurant_id")
    .eq("organization_id", organizationId);

  if (restaurantIds && restaurantIds.length > 0) {
    restaurantQuery.in("restaurant_id", restaurantIds);
  }

  const { data: linkedRestaurants, error: linkedRestaurantsError } =
    await restaurantQuery;

  if (linkedRestaurantsError) {
    throw new Error(linkedRestaurantsError.message);
  }

  for (const link of linkedRestaurants ?? []) {
    const restaurantId = link.restaurant_id as string;

    const { data: existingCategories, error: existingCategoriesError } =
      await supabaseAdmin
        .from("categories")
        .select("id, organization_menu_category_id, position")
        .eq("restaurant_id", restaurantId);

    if (existingCategoriesError) {
      throw new Error(existingCategoriesError.message);
    }

    const categoryIdByOrgId = new Map<string, string>();
    const usedCategoryPositions = new Set<number>();
    let nextCategoryPosition = 0;
    for (const category of existingCategories ?? []) {
      const position = Number(category.position ?? 0);
      usedCategoryPositions.add(position);
      nextCategoryPosition = Math.max(nextCategoryPosition, position + 1);
      if (category.organization_menu_category_id) {
        categoryIdByOrgId.set(
          category.organization_menu_category_id,
          category.id,
        );
      }
    }

    const claimNextCategoryPosition = () => {
      while (usedCategoryPositions.has(nextCategoryPosition)) {
        nextCategoryPosition += 1;
      }
      const position = nextCategoryPosition;
      usedCategoryPositions.add(position);
      nextCategoryPosition += 1;
      return position;
    };

    for (const sharedCategory of sharedCategories) {
      const existingCategoryId = categoryIdByOrgId.get(sharedCategory.id);
      if (existingCategoryId) {
        const { error } = await supabaseAdmin
          .from("categories")
          .update({
            name_en: sharedCategory.name_en,
            name_ja: sharedCategory.name_ja,
            name_vi: sharedCategory.name_vi,
          })
          .eq("id", existingCategoryId)
          .eq("restaurant_id", restaurantId);

        if (error) {
          throw new Error(error.message);
        }
      } else {
        const { data, error } = await supabaseAdmin
          .from("categories")
          .insert({
            restaurant_id: restaurantId,
            organization_menu_category_id: sharedCategory.id,
            name_en: sharedCategory.name_en,
            name_ja: sharedCategory.name_ja,
            name_vi: sharedCategory.name_vi,
            position: claimNextCategoryPosition(),
          })
          .select("id")
          .single();

        if (error || !data) {
          throw new Error(
            error?.message ?? "Failed to create inherited category",
          );
        }

        categoryIdByOrgId.set(sharedCategory.id, data.id);
      }
    }

    const { data: existingItems, error: existingItemsError } =
      await supabaseAdmin
        .from("menu_items")
        .select("id, organization_menu_item_id, weekday_visibility")
        .eq("restaurant_id", restaurantId);

    if (existingItemsError) {
      throw new Error(existingItemsError.message);
    }

    const itemIdByOrgId = new Map<
      string,
      { id: string; weekday_visibility: number[] | null }
    >();
    for (const item of existingItems ?? []) {
      if (item.organization_menu_item_id) {
        itemIdByOrgId.set(item.organization_menu_item_id, {
          id: item.id,
          weekday_visibility: item.weekday_visibility ?? null,
        });
      }
    }

    for (const sharedCategory of sharedCategories) {
      const branchCategoryId = categoryIdByOrgId.get(sharedCategory.id);
      if (!branchCategoryId) continue;

      for (const sharedItem of sharedCategory.items) {
        const existingItem = itemIdByOrgId.get(sharedItem.id);
        const payload = {
          category_id: branchCategoryId,
          name_en: sharedItem.name_en,
          name_ja: sharedItem.name_ja,
          name_vi: sharedItem.name_vi,
          description_en: sharedItem.description_en,
          description_ja: sharedItem.description_ja,
          description_vi: sharedItem.description_vi,
          price: sharedItem.price,
          image_url: sharedItem.image_url,
          available: sharedItem.available,
          weekday_visibility:
            existingItem?.weekday_visibility ?? defaultWeekdayVisibility(),
          position: sharedItem.position,
        };

        if (existingItem) {
          const { error } = await supabaseAdmin
            .from("menu_items")
            .update(payload)
            .eq("id", existingItem.id)
            .eq("restaurant_id", restaurantId);

          if (error) {
            throw new Error(error.message);
          }

          await syncInheritedMenuItemOptions({
            restaurantId,
            menuItemId: existingItem.id,
            sizes: sharedItem.sizes,
            toppings: sharedItem.toppings,
          });
        } else {
          const { data, error } = await supabaseAdmin
            .from("menu_items")
            .insert({
              restaurant_id: restaurantId,
              organization_menu_item_id: sharedItem.id,
              ...payload,
            })
            .select("id")
            .single();

          if (error || !data) {
            throw new Error(
              error?.message ?? "Failed to create inherited item",
            );
          }

          itemIdByOrgId.set(sharedItem.id, {
            id: data.id,
            weekday_visibility: payload.weekday_visibility,
          });

          await syncInheritedMenuItemOptions({
            restaurantId,
            menuItemId: data.id,
            sizes: sharedItem.sizes,
            toppings: sharedItem.toppings,
          });
        }
      }
    }

    const sharedCategoryIds = new Set(
      sharedCategories.map((category) => category.id),
    );
    const sharedItemIds = new Set(
      sharedCategories.flatMap((category) =>
        category.items.map((item) => item.id),
      ),
    );

    const staleItemIds = (existingItems ?? [])
      .filter(
        (item) =>
          item.organization_menu_item_id &&
          !sharedItemIds.has(item.organization_menu_item_id),
      )
      .map((item) => item.id);

    if (staleItemIds.length > 0) {
      const { error } = await supabaseAdmin
        .from("menu_items")
        .delete()
        .eq("restaurant_id", restaurantId)
        .in("id", staleItemIds);

      if (error) {
        throw new Error(error.message);
      }
    }

    const staleCategoryIds = (existingCategories ?? [])
      .filter(
        (category) =>
          category.organization_menu_category_id &&
          !sharedCategoryIds.has(category.organization_menu_category_id),
      )
      .map((category) => category.id);

    if (staleCategoryIds.length > 0) {
      const { data: remainingItems, error: remainingItemsError } =
        await supabaseAdmin
          .from("menu_items")
          .select("id, category_id")
          .eq("restaurant_id", restaurantId)
          .in("category_id", staleCategoryIds);

      if (remainingItemsError) {
        throw new Error(remainingItemsError.message);
      }

      const categoryIdsWithItems = new Set(
        (remainingItems ?? []).map((item) => item.category_id as string),
      );

      const deletableCategoryIds = staleCategoryIds.filter(
        (categoryId) => !categoryIdsWithItems.has(categoryId),
      );
      const detachableCategoryIds = staleCategoryIds.filter((categoryId) =>
        categoryIdsWithItems.has(categoryId),
      );

      if (detachableCategoryIds.length > 0) {
        const { error } = await supabaseAdmin
          .from("categories")
          .update({ organization_menu_category_id: null })
          .eq("restaurant_id", restaurantId)
          .in("id", detachableCategoryIds);

        if (error) {
          throw new Error(error.message);
        }
      }

      if (deletableCategoryIds.length > 0) {
        const { error } = await supabaseAdmin
          .from("categories")
          .delete()
          .eq("restaurant_id", restaurantId)
          .in("id", deletableCategoryIds);

        if (error) {
          throw new Error(error.message);
        }
      }
    }
  }
}

export async function getBranchMenuWorkspace(
  restaurantId: string,
): Promise<BranchMenuWorkspaceData> {
  const { data: categories, error } = await supabaseAdmin
    .from("categories")
    .select(
      `
      id,
      organization_menu_category_id,
      name_en,
      name_ja,
      name_vi,
      position,
      menu_items(
        id,
        category_id,
        organization_menu_item_id,
        name_en,
        name_ja,
        name_vi,
        description_en,
        description_ja,
        description_vi,
        price,
        image_url,
        available,
        weekday_visibility,
        stock_level,
        position,
        menu_item_sizes(
          id,
          size_key,
          name_en,
          name_ja,
          name_vi,
          price,
          position
        ),
        toppings(
          id,
          name_en,
          name_ja,
          name_vi,
          price,
          position
        )
      )
    `,
    )
    .eq("restaurant_id", restaurantId)
    .order("position", { ascending: true })
    .order("position", { foreignTable: "menu_items", ascending: true })
    .order("position", {
      foreignTable: "menu_items.menu_item_sizes",
      ascending: true,
    })
    .order("position", {
      foreignTable: "menu_items.toppings",
      ascending: true,
    });

  if (isMissingInheritanceColumnError(error)) {
    return getLegacyBranchMenuWorkspace(restaurantId);
  }

  if (error || !categories) {
    throw new Error(error?.message ?? "Failed to load branch menu workspace");
  }

  const mappedCategories = categories.map((category) => ({
    id: category.id,
    organization_menu_category_id:
      category.organization_menu_category_id ?? null,
    source: category.organization_menu_category_id ? "organization" : "branch",
    name_en: category.name_en,
    name_ja: category.name_ja,
    name_vi: category.name_vi,
    position: category.position,
    menu_items: (category.menu_items ?? []).map((item) => ({
      id: item.id,
      category_id: item.category_id,
      organization_menu_item_id: item.organization_menu_item_id ?? null,
      source: item.organization_menu_item_id ? "organization" : "branch",
      name_en: item.name_en,
      name_ja: item.name_ja,
      name_vi: item.name_vi,
      description_en: item.description_en,
      description_ja: item.description_ja,
      description_vi: item.description_vi,
      price: Number(item.price ?? 0),
      image_url: item.image_url,
      available: item.available,
      weekday_visibility: item.weekday_visibility ?? defaultWeekdayVisibility(),
      stock_level: item.stock_level ?? null,
      position: item.position,
      sizes: (item.menu_item_sizes ?? []).map((size) => ({
        id: size.id,
        size_key: size.size_key,
        name_en: size.name_en,
        name_ja: size.name_ja,
        name_vi: size.name_vi,
        price: Number(size.price ?? 0),
        position: size.position,
      })),
      toppings: (item.toppings ?? []).map((topping) => ({
        id: topping.id,
        name_en: topping.name_en,
        name_ja: topping.name_ja,
        name_vi: topping.name_vi,
        price: Number(topping.price ?? 0),
        position: topping.position ?? 0,
      })),
    })),
  })) satisfies BranchWorkspaceCategory[];

  const inheritedCategories = mappedCategories.filter(
    (category) => category.source === "organization",
  ).length;
  const inheritedItems = mappedCategories.reduce(
    (sum, category) =>
      sum +
      category.menu_items.filter((item) => item.source === "organization")
        .length,
    0,
  );
  const totalItems = mappedCategories.reduce(
    (sum, category) => sum + category.menu_items.length,
    0,
  );

  return {
    categories: mappedCategories,
    summary: {
      totalCategories: mappedCategories.length,
      totalItems,
      inheritedCategories,
      inheritedItems,
      localCategories: mappedCategories.length - inheritedCategories,
      localItems: totalItems - inheritedItems,
    },
  };
}
