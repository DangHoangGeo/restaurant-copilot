# Phase 2.1 Order Partition Rollout Design

## Status

As of 2026-04-30, the development repository has moved to the composite-key
rollout path:

- `orders` is partitioned by `created_at`.
- `order_items` is partitioned by `created_at`.
- `orders` uses `(id, created_at)` as its primary key.
- `order_items`, `feedback`, and `order_discounts` carry `order_created_at` so
  they can keep real foreign keys to the partitioned `orders` parent.
- `set_order_created_at_from_order()` fills the composite key column when older
  callers only provide `order_id`.
- `create-monthly-partitions` creates current and future monthly partitions.

This was allowed because the product is still in development and has no real
ordering data to preserve.

## Safe Rollout Requirement

The development migration is intentionally invasive:
`20260430130000_partition_orders_and_order_items_by_month.sql`.

Do not run this migration unchanged against a future production database with
real orders unless the business accepts the maintenance window and data-parity
checks. For production data, use the same composite-key target shape but split
the rollout into compatibility columns, dual writes, batched backfill, parity
checks, and a final cutover.

## Recommended Path

1. Keep the development canonical schema on the composite-key partition shape.
2. Use the partition health endpoint and Edge Function before every month turn.
3. If real production data exists later, rework the migration into staged
   compatibility steps before applying it there.
4. Compare counts, totals, customer order reads, and branch order boards after
   any environment rollout.

## Verification Gate

Before Phase 2.1 can be marked complete in a live environment:

- customer order creation and status reads pass end-to-end tests
- kitchen/branch realtime order views still receive updates
- `EXPLAIN ANALYZE` confirms date-bounded reads prune partitions
- monthly partition maintenance creates current plus three future partitions
- rollback or compatibility path is documented before real production data
