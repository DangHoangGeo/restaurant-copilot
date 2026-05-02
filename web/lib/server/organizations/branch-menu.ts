// Branch menu domain: copy and compare logic
//
// Phase 3 — Branch Management and Branch-Specific Menus
//
// Rules:
//   - All operations are org-scoped. Caller must pass validated org context.
//   - Copy is destructive for target: existing categories/items in the target
//     are deleted before the source data is inserted.
//   - Menu data is branch-scoped via restaurant_id in every table.
//   - Customer ordering is not touched here.

import { supabaseAdmin } from '@/lib/supabaseAdmin';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface BranchMenuCategory {
  id: string;
  name_en: string;
  name_ja: string | null;
  name_vi: string | null;
  position: number;
  items: BranchMenuItem[];
}

export interface BranchMenuItem {
  id: string;
  name_en: string;
  name_ja: string | null;
  name_vi: string | null;
  description_en: string | null;
  description_ja: string | null;
  description_vi: string | null;
  price: number;
  tags: string[];
  prep_station: "food" | "drink" | "other";
  image_url: string | null;
  available: boolean;
  weekday_visibility: number[];
  position: number;
  sizes: BranchMenuItemSize[];
  toppings: BranchMenuTopping[];
}

export interface BranchMenuItemSize {
  size_key: string;
  name_en: string;
  name_ja: string | null;
  name_vi: string | null;
  price: number;
  position: number;
}

export interface BranchMenuTopping {
  name_en: string;
  name_ja: string | null;
  name_vi: string | null;
  price: number;
  position: number;
}

export interface BranchMenuSnapshot {
  restaurantId: string;
  categories: BranchMenuCategory[];
}

export interface MenuCompareResult {
  branchA: BranchMenuSnapshot;
  branchB: BranchMenuSnapshot;
}

export interface MenuCopyResult {
  categoriesCopied: number;
  itemsCopied: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal: fetch menu for a single branch (admin client for cross-branch read)
// ─────────────────────────────────────────────────────────────────────────────

async function fetchBranchMenu(restaurantId: string): Promise<BranchMenuCategory[]> {
  const { data: categories, error } = await supabaseAdmin
    .from('categories')
    .select(`
      id, name_en, name_ja, name_vi, position,
      menu_items(
        id, name_en, name_ja, name_vi,
        description_en, description_ja, description_vi,
        price, tags, prep_station, image_url, available, weekday_visibility, position,
        menu_item_sizes(size_key, name_en, name_ja, name_vi, price, position),
        toppings(name_en, name_ja, name_vi, price, position)
      )
    `)
    .eq('restaurant_id', restaurantId)
    .order('position', { ascending: true })
    .order('position', { foreignTable: 'menu_items', ascending: true });

  if (error || !categories) return [];

  return (categories as unknown[]).map((cat) => {
    const c = cat as {
      id: string;
      name_en: string;
      name_ja: string | null;
      name_vi: string | null;
      position: number;
      menu_items: unknown[];
    };
    return {
      id: c.id,
      name_en: c.name_en,
      name_ja: c.name_ja,
      name_vi: c.name_vi,
      position: c.position,
      items: (c.menu_items ?? []).map((itm) => {
        const i = itm as {
          id: string;
          name_en: string;
          name_ja: string | null;
          name_vi: string | null;
          description_en: string | null;
          description_ja: string | null;
          description_vi: string | null;
          price: number;
          tags?: string[];
          prep_station?: string;
          image_url: string | null;
          available: boolean;
          weekday_visibility: number[];
          position: number;
          menu_item_sizes: unknown[];
          toppings: unknown[];
        };
        return {
          id: i.id,
          name_en: i.name_en,
          name_ja: i.name_ja,
          name_vi: i.name_vi,
          description_en: i.description_en,
          description_ja: i.description_ja,
          description_vi: i.description_vi,
          price: i.price,
          tags: i.tags ?? [],
          prep_station: (i.prep_station ?? "food") as "food" | "drink" | "other",
          image_url: i.image_url,
          available: i.available,
          weekday_visibility: i.weekday_visibility,
          position: i.position,
          sizes: (i.menu_item_sizes ?? []).map((s) => {
            const sz = s as BranchMenuItemSize;
            return {
              size_key: sz.size_key,
              name_en: sz.name_en,
              name_ja: sz.name_ja,
              name_vi: sz.name_vi,
              price: sz.price,
              position: sz.position,
            };
          }),
          toppings: (i.toppings ?? []).map((t) => {
            const tp = t as BranchMenuTopping;
            return {
              name_en: tp.name_en,
              name_ja: tp.name_ja,
              name_vi: tp.name_vi,
              price: tp.price,
              position: tp.position,
            };
          }),
        } satisfies BranchMenuItem;
      }),
    } satisfies BranchMenuCategory;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// compareMenusBetweenBranches
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Load menus for two branches so the UI can compare categories, items, and prices.
 * Caller must ensure both restaurantIds belong to the caller's org.
 */
export async function compareMenusBetweenBranches(
  branchAId: string,
  branchBId: string,
): Promise<MenuCompareResult> {
  const [categoriesA, categoriesB] = await Promise.all([
    fetchBranchMenu(branchAId),
    fetchBranchMenu(branchBId),
  ]);

  return {
    branchA: { restaurantId: branchAId, categories: categoriesA },
    branchB: { restaurantId: branchBId, categories: categoriesB },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// copyMenuToTargetBranch
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Copy the full menu (categories + items + sizes + toppings) from sourceBranchId
 * to targetBranchId.
 *
 * Strategy:
 *   1. Delete existing categories (cascade deletes items/sizes/toppings).
 *   2. Insert new categories from source.
 *   3. Insert new items, then sizes and toppings for each item.
 *
 * Caller must ensure both restaurantIds belong to the caller's org scope.
 * This operation is not atomic (no Supabase transaction API yet); if it fails
 * mid-way the target will be in a partial state. The UI should warn the user.
 */
export async function copyMenuToTargetBranch(
  sourceBranchId: string,
  targetBranchId: string,
): Promise<MenuCopyResult> {
  // 1. Load source menu
  const sourceCategories = await fetchBranchMenu(sourceBranchId);

  // 2. Delete target categories (cascades to menu_items, menu_item_sizes, toppings)
  const { error: deleteError } = await supabaseAdmin
    .from('categories')
    .delete()
    .eq('restaurant_id', targetBranchId);

  if (deleteError) {
    throw new Error(`Failed to clear target branch categories: ${deleteError.message}`);
  }

  let categoriesCopied = 0;
  let itemsCopied = 0;

  // 3. Insert categories and their items
  for (const sourceCategory of sourceCategories) {
    const { data: newCategory, error: catError } = await supabaseAdmin
      .from('categories')
      .insert({
        restaurant_id: targetBranchId,
        name_en: sourceCategory.name_en,
        name_ja: sourceCategory.name_ja,
        name_vi: sourceCategory.name_vi,
        position: sourceCategory.position,
      })
      .select('id')
      .single();

    if (catError || !newCategory) {
      throw new Error(`Failed to copy category "${sourceCategory.name_en}": ${catError?.message}`);
    }

    categoriesCopied++;

    for (const sourceItem of sourceCategory.items) {
      const { data: newItem, error: itemError } = await supabaseAdmin
        .from('menu_items')
        .insert({
          restaurant_id: targetBranchId,
          category_id: newCategory.id,
          name_en: sourceItem.name_en,
          name_ja: sourceItem.name_ja,
          name_vi: sourceItem.name_vi,
          description_en: sourceItem.description_en,
          description_ja: sourceItem.description_ja,
          description_vi: sourceItem.description_vi,
          price: sourceItem.price,
          tags: sourceItem.tags,
          prep_station: sourceItem.prep_station,
          image_url: sourceItem.image_url,
          available: sourceItem.available,
          weekday_visibility: sourceItem.weekday_visibility,
          position: sourceItem.position,
        })
        .select('id')
        .single();

      if (itemError || !newItem) {
        throw new Error(`Failed to copy item "${sourceItem.name_en}": ${itemError?.message}`);
      }

      itemsCopied++;

      // Copy sizes
      if (sourceItem.sizes.length > 0) {
        const sizeRows = sourceItem.sizes.map((s) => ({
          restaurant_id: targetBranchId,
          menu_item_id: newItem.id,
          size_key: s.size_key,
          name_en: s.name_en,
          name_ja: s.name_ja,
          name_vi: s.name_vi,
          price: s.price,
          position: s.position,
        }));
        const { error: sizeError } = await supabaseAdmin
          .from('menu_item_sizes')
          .insert(sizeRows);
        if (sizeError) {
          throw new Error(`Failed to copy sizes for item "${sourceItem.name_en}": ${sizeError.message}`);
        }
      }

      // Copy toppings
      if (sourceItem.toppings.length > 0) {
        const toppingRows = sourceItem.toppings.map((t) => ({
          menu_item_id: newItem.id,
          restaurant_id: targetBranchId,
          name_en: t.name_en,
          name_ja: t.name_ja,
          name_vi: t.name_vi,
          price: t.price,
          position: t.position,
        }));
        const { error: toppingError } = await supabaseAdmin
          .from('toppings')
          .insert(toppingRows);
        if (toppingError) {
          throw new Error(`Failed to copy toppings for item "${sourceItem.name_en}": ${toppingError.message}`);
        }
      }
    }
  }

  return { categoriesCopied, itemsCopied };
}
