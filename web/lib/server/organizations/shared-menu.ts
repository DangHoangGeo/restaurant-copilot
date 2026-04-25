import { supabaseAdmin } from "@/lib/supabaseAdmin";

export interface OrganizationSharedMenuItem {
  id: string;
  category_id: string;
  name_en: string;
  name_ja: string | null;
  name_vi: string | null;
  description_en: string | null;
  description_ja: string | null;
  description_vi: string | null;
  price: number;
  image_url: string | null;
  available: boolean;
  position: number;
  sizes: OrganizationSharedMenuItemSize[];
  toppings: OrganizationSharedMenuItemTopping[];
}

export interface OrganizationSharedMenuItemSize {
  id: string;
  organization_menu_item_id: string;
  size_key: string;
  name_en: string;
  name_ja: string | null;
  name_vi: string | null;
  price: number;
  position: number;
}

export interface OrganizationSharedMenuItemTopping {
  id: string;
  organization_menu_item_id: string;
  name_en: string;
  name_ja: string | null;
  name_vi: string | null;
  price: number;
  position: number;
}

export interface OrganizationSharedMenuCategory {
  id: string;
  name_en: string;
  name_ja: string | null;
  name_vi: string | null;
  position: number;
  items: OrganizationSharedMenuItem[];
}

type SharedMenuCategoryInsert = {
  organization_id: string;
  name_en: string;
  name_ja?: string | null;
  name_vi?: string | null;
  position?: number;
};

type SharedMenuCategorySeed = {
  name_en: string;
  name_ja?: string | null;
  name_vi?: string | null;
};

type SharedMenuItemInsert = {
  organization_id: string;
  category_id: string;
  name_en: string;
  name_ja?: string | null;
  name_vi?: string | null;
  description_en?: string | null;
  description_ja?: string | null;
  description_vi?: string | null;
  price: number;
  image_url?: string | null;
  available?: boolean;
  position?: number;
  sizes?: SharedMenuItemSizeInsert[];
  toppings?: SharedMenuItemToppingInsert[];
};

type SharedMenuItemSizeInsert = {
  size_key: string;
  name_en: string;
  name_ja?: string | null;
  name_vi?: string | null;
  price: number;
  position?: number;
};

type SharedMenuItemToppingInsert = {
  name_en: string;
  name_ja?: string | null;
  name_vi?: string | null;
  price: number;
  position?: number;
};

function normalizeCategoryName(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

export async function listOrganizationSharedMenu(
  organizationId: string,
): Promise<OrganizationSharedMenuCategory[]> {
  const { data, error } = await supabaseAdmin
    .from("organization_menu_categories")
    .select(
      `
      id,
      name_en,
      name_ja,
      name_vi,
      position,
      organization_menu_items (
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
        organization_menu_item_sizes (
          id,
          organization_menu_item_id,
          size_key,
          name_en,
          name_ja,
          name_vi,
          price,
          position
        ),
        organization_menu_item_toppings (
          id,
          organization_menu_item_id,
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
    .order("position", { ascending: true })
    .order("position", {
      foreignTable: "organization_menu_items",
      ascending: true,
    });

  if (error || !data) {
    console.error("Failed to list organization shared menu:", error);
    return [];
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
        id: size.id,
        organization_menu_item_id: size.organization_menu_item_id,
        size_key: size.size_key,
        name_en: size.name_en,
        name_ja: size.name_ja,
        name_vi: size.name_vi,
        price: Number(size.price ?? 0),
        position: size.position,
      })),
      toppings: (item.organization_menu_item_toppings ?? []).map((topping) => ({
        id: topping.id,
        organization_menu_item_id: topping.organization_menu_item_id,
        name_en: topping.name_en,
        name_ja: topping.name_ja,
        name_vi: topping.name_vi,
        price: Number(topping.price ?? 0),
        position: topping.position,
      })),
    })),
  }));
}

export async function createOrganizationSharedCategory(
  input: SharedMenuCategoryInsert,
): Promise<OrganizationSharedMenuCategory | null> {
  const { data, error } = await supabaseAdmin
    .from("organization_menu_categories")
    .insert({
      organization_id: input.organization_id,
      name_en: input.name_en,
      name_ja: input.name_ja ?? null,
      name_vi: input.name_vi ?? null,
      position: input.position ?? 0,
    })
    .select("id, name_en, name_ja, name_vi, position")
    .single();

  if (error || !data) {
    console.error("Failed to create organization shared category:", error);
    return null;
  }

  return {
    id: data.id,
    name_en: data.name_en,
    name_ja: data.name_ja,
    name_vi: data.name_vi,
    position: data.position,
    items: [],
  };
}

export async function ensureOrganizationSharedCategories(
  organizationId: string,
  categories: SharedMenuCategorySeed[],
): Promise<boolean> {
  if (categories.length === 0) {
    return true;
  }

  const existingCategories = await listOrganizationSharedMenu(organizationId);
  const existingNames = new Set(
    existingCategories.flatMap((category) =>
      [category.name_en, category.name_ja, category.name_vi]
        .map(normalizeCategoryName)
        .filter((value) => value.length > 0),
    ),
  );

  let nextPosition = existingCategories.length;

  for (const category of categories) {
    const normalizedNames = [
      category.name_en,
      category.name_ja,
      category.name_vi,
    ]
      .map(normalizeCategoryName)
      .filter((value) => value.length > 0);

    if (
      normalizedNames.length === 0 ||
      normalizedNames.some((value) => existingNames.has(value))
    ) {
      continue;
    }

    const createdCategory = await createOrganizationSharedCategory({
      organization_id: organizationId,
      name_en: category.name_en,
      name_ja: category.name_ja ?? null,
      name_vi: category.name_vi ?? null,
      position: nextPosition,
    });

    if (!createdCategory) {
      return false;
    }

    nextPosition += 1;
    [createdCategory.name_en, createdCategory.name_ja, createdCategory.name_vi]
      .map(normalizeCategoryName)
      .filter((value) => value.length > 0)
      .forEach((value) => existingNames.add(value));
  }

  return true;
}

export async function createOrganizationSharedMenuItem(
  input: SharedMenuItemInsert,
): Promise<OrganizationSharedMenuItem | null> {
  const { data: category, error: categoryError } = await supabaseAdmin
    .from("organization_menu_categories")
    .select("id")
    .eq("id", input.category_id)
    .eq("organization_id", input.organization_id)
    .maybeSingle();

  if (categoryError || !category) {
    console.error(
      "Invalid shared menu category for organization:",
      categoryError,
    );
    return null;
  }

  const { data, error } = await supabaseAdmin
    .from("organization_menu_items")
    .insert({
      organization_id: input.organization_id,
      category_id: input.category_id,
      name_en: input.name_en,
      name_ja: input.name_ja ?? null,
      name_vi: input.name_vi ?? null,
      description_en: input.description_en ?? null,
      description_ja: input.description_ja ?? null,
      description_vi: input.description_vi ?? null,
      price: input.price,
      image_url: input.image_url ?? null,
      available: input.available ?? true,
      position: input.position ?? 0,
    })
    .select(
      `
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
      organization_menu_item_sizes (
        id,
        organization_menu_item_id,
        size_key,
        name_en,
        name_ja,
        name_vi,
        price,
        position
      ),
      organization_menu_item_toppings (
        id,
        organization_menu_item_id,
        name_en,
        name_ja,
        name_vi,
        price,
        position
      )
    `,
    )
    .single();

  if (error || !data) {
    console.error("Failed to create organization shared menu item:", error);
    return null;
  }

  if (input.sizes && input.sizes.length > 0) {
    const { error: sizesError } = await supabaseAdmin
      .from("organization_menu_item_sizes")
      .insert(
        input.sizes.map((size, index) => ({
          organization_id: input.organization_id,
          organization_menu_item_id: data.id,
          size_key: size.size_key,
          name_en: size.name_en,
          name_ja: size.name_ja ?? null,
          name_vi: size.name_vi ?? null,
          price: size.price,
          position: size.position ?? index,
        })),
      );

    if (sizesError) {
      console.error(
        "Failed to create organization shared menu item sizes:",
        sizesError,
      );
      await deleteOrganizationSharedMenuItem(input.organization_id, data.id);
      return null;
    }
  }

  if (input.toppings && input.toppings.length > 0) {
    const { error: toppingsError } = await supabaseAdmin
      .from("organization_menu_item_toppings")
      .insert(
        input.toppings.map((topping, index) => ({
          organization_id: input.organization_id,
          organization_menu_item_id: data.id,
          name_en: topping.name_en,
          name_ja: topping.name_ja ?? null,
          name_vi: topping.name_vi ?? null,
          price: topping.price,
          position: topping.position ?? index,
        })),
      );

    if (toppingsError) {
      console.error(
        "Failed to create organization shared menu item toppings:",
        toppingsError,
      );
      await deleteOrganizationSharedMenuItem(input.organization_id, data.id);
      return null;
    }
  }

  const createdItem = await getOrganizationSharedMenuItem(
    input.organization_id,
    data.id,
  );
  if (createdItem) {
    return createdItem;
  }

  return {
    id: data.id,
    category_id: data.category_id,
    name_en: data.name_en,
    name_ja: data.name_ja,
    name_vi: data.name_vi,
    description_en: data.description_en,
    description_ja: data.description_ja,
    description_vi: data.description_vi,
    price: Number(data.price ?? 0),
    image_url: data.image_url,
    available: data.available,
    position: data.position,
    sizes: [],
    toppings: [],
  };
}

async function getOrganizationSharedMenuItem(
  organizationId: string,
  itemId: string,
): Promise<OrganizationSharedMenuItem | null> {
  const { data, error } = await supabaseAdmin
    .from("organization_menu_items")
    .select(
      `
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
      organization_menu_item_sizes (
        id,
        organization_menu_item_id,
        size_key,
        name_en,
        name_ja,
        name_vi,
        price,
        position
      ),
      organization_menu_item_toppings (
        id,
        organization_menu_item_id,
        name_en,
        name_ja,
        name_vi,
        price,
        position
      )
    `,
    )
    .eq("organization_id", organizationId)
    .eq("id", itemId)
    .single();

  if (error || !data) {
    console.error("Failed to load organization shared menu item:", error);
    return null;
  }

  return {
    id: data.id,
    category_id: data.category_id,
    name_en: data.name_en,
    name_ja: data.name_ja,
    name_vi: data.name_vi,
    description_en: data.description_en,
    description_ja: data.description_ja,
    description_vi: data.description_vi,
    price: Number(data.price ?? 0),
    image_url: data.image_url,
    available: data.available,
    position: data.position,
    sizes: (data.organization_menu_item_sizes ?? []).map((size) => ({
      id: size.id,
      organization_menu_item_id: size.organization_menu_item_id,
      size_key: size.size_key,
      name_en: size.name_en,
      name_ja: size.name_ja,
      name_vi: size.name_vi,
      price: Number(size.price ?? 0),
      position: size.position,
    })),
    toppings: (data.organization_menu_item_toppings ?? []).map((topping) => ({
      id: topping.id,
      organization_menu_item_id: topping.organization_menu_item_id,
      name_en: topping.name_en,
      name_ja: topping.name_ja,
      name_vi: topping.name_vi,
      price: Number(topping.price ?? 0),
      position: topping.position,
    })),
  };
}

export async function deleteOrganizationSharedCategory(
  organizationId: string,
  categoryId: string,
): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from("organization_menu_categories")
    .delete()
    .eq("organization_id", organizationId)
    .eq("id", categoryId);

  if (error) {
    console.error("Failed to delete organization shared category:", error);
    return false;
  }

  return true;
}

export async function deleteOrganizationSharedMenuItem(
  organizationId: string,
  itemId: string,
): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from("organization_menu_items")
    .delete()
    .eq("organization_id", organizationId)
    .eq("id", itemId);

  if (error) {
    console.error("Failed to delete organization shared menu item:", error);
    return false;
  }

  return true;
}
