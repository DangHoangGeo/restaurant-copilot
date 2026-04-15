// GET    /api/v1/owner/purchasing/orders/[orderId] — get order with items
// PUT    /api/v1/owner/purchasing/orders/[orderId] — update order fields (and inventory if status→received)
// DELETE /api/v1/owner/purchasing/orders/[orderId] — delete order

import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/server/getUserFromRequest';
import { USER_ROLES } from '@/lib/constants';
import { UpdatePurchaseOrderSchema } from '@/lib/server/purchasing/schemas';
import { resolvePurchasingAccess } from '@/lib/server/purchasing/access';
import { getPurchaseOrder, editPurchaseOrder, removePurchaseOrder } from '@/lib/server/purchasing/service';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const ALLOWED_ROLES = [USER_ROLES.OWNER, USER_ROLES.MANAGER] as const;

type RouteContext = { params: Promise<{ orderId: string }> };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { orderId } = await params;
  const access = await resolvePurchasingAccess();
  if (!access) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const order = await getPurchaseOrder(orderId, access.restaurantId);
    return NextResponse.json({ order });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    const msg = err instanceof Error ? err.message : 'Failed to fetch order';
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function PUT(req: NextRequest, { params }: RouteContext) {
  const { orderId } = await params;
  const user = await getUserFromRequest();
  if (!user?.restaurantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!ALLOWED_ROLES.includes(user.role as 'owner' | 'manager')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const parsed = UpdatePurchaseOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation error', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  try {
    // Check if status is being changed to 'received' and handle inventory updates
    const isBeingMarkedReceived = parsed.data.status === 'received';

    if (isBeingMarkedReceived) {
      // Fetch the current order to get its items
      const order = await getPurchaseOrder(orderId, user.restaurantId);

      // Update inventory for each item that has an inventory_item_id
      if (order.items && order.items.length > 0) {
        for (const item of order.items) {
          // Check if item has inventory_item_id field (defensive coding)
          const itemWithInventory = item as Record<string, unknown>;
          const inventoryItemId = itemWithInventory.inventory_item_id as string | undefined;

          if (inventoryItemId) {
            try {
              // Fetch current inventory stock level
              const { data: inv, error: fetchError } = await supabaseAdmin
                .from('inventory_items')
                .select('stock_level, current_stock')
                .eq('id', inventoryItemId)
                .eq('restaurant_id', user.restaurantId)
                .maybeSingle();

              if (fetchError) {
                console.warn(`Failed to fetch inventory item ${inventoryItemId}:`, fetchError);
                continue;
              }

              if (!inv) {
                console.warn(`Inventory item ${inventoryItemId} not found or not in this restaurant`);
                continue;
              }

              // Use 'stock_level' if it exists, otherwise 'current_stock' (for schema compatibility)
              const currentStock = (inv.stock_level ?? inv.current_stock ?? 0) as number;
              const newStock = currentStock + item.quantity;

              // Update inventory - try stock_level first, fallback to current_stock
              let updatePayload: Record<string, unknown> = {
                updated_at: new Date().toISOString(),
              };

              // Determine which field to update based on schema
              if ('stock_level' in inv) {
                updatePayload.stock_level = newStock;
              } else {
                updatePayload.current_stock = newStock;
              }

              const { error: updateError } = await supabaseAdmin
                .from('inventory_items')
                .update(updatePayload)
                .eq('id', inventoryItemId)
                .eq('restaurant_id', user.restaurantId);

              if (updateError) {
                console.warn(`Failed to update inventory item ${inventoryItemId}:`, updateError);
                continue;
              }
            } catch (itemError) {
              console.warn(`Error processing inventory for item ${inventoryItemId}:`, itemError);
              // Continue processing other items if one fails
              continue;
            }
          }
        }
      }
    }

    const order = await editPurchaseOrder(orderId, user.restaurantId, parsed.data);
    return NextResponse.json({ order });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    const msg = err instanceof Error ? err.message : 'Failed to update order';
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const { orderId } = await params;
  const user = await getUserFromRequest();
  if (!user?.restaurantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!ALLOWED_ROLES.includes(user.role as 'owner' | 'manager')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    await removePurchaseOrder(orderId, user.restaurantId);
    return NextResponse.json({ success: true });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    const msg = err instanceof Error ? err.message : 'Failed to delete order';
    return NextResponse.json({ error: msg }, { status });
  }
}
