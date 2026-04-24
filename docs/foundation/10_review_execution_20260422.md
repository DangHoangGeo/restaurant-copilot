# Review Execution Notes

This doc records the production-hardening work executed from the April 22, 2026 review so future agents can treat these boundaries as current contract, not optional cleanup.

## Completed In This Pass

- customer session creation and join now use explicit POST-only flows
- customer session codes are HMAC-derived instead of order-id-derived
- customer item append is transactional through database RPC
- auth throttling now has a real in-memory fallback instead of silently disabling itself
- owner branch access now prefers organization scope over the legacy `users.restaurant_id` shortcut
- transitional branch authorization now treats organization membership as authoritative when org context exists
- platform overview and platform-wide usage trends now come from explicit database summary RPCs
- organization overview now uses a database summary RPC instead of pulling raw order rows into Node

## Current Permission Contract

- if a user has organization membership, org scope is authoritative for branch access
- legacy `users.role` permissions are only fallback for non-org users
- future owner APIs must not reintroduce direct `owner/manager + restaurant_id` shortcuts ahead of org checks
- if a branch operation needs a new permission boundary, add it explicitly to the org permission model instead of inventing local route exceptions

## Current Reporting Contract

- platform overview should read summary and trend RPCs, not full-table restaurant or subscription scans
- platform-wide usage trends should come from snapshot-backed SQL aggregation
- founder multi-branch overview should come from a database summary RPC keyed by authorized branch ids
- snapshot-backed reporting is preferred over re-aggregating transactional tables in the web tier

## Residual Follow-Up

- more legacy owner endpoints still need migration onto org-aware service boundaries
- some platform lists still read raw tables directly and should move to explicit query services or RPCs if they become slow
- a dedicated org-level billing model can be added later, but only after the business rules are fixed clearly enough to avoid churn

## April 24, 2026 Follow-Up

- branch back-office navigation now exposes the implemented daily operations, people, money, promotions, staff, and profile surfaces consistently across desktop and mobile
- table booking management is treated as an active branch operation by default, with an explicit opt-out flag if a deployment needs to hide it
- owner booking APIs now require owner or manager authority on the active branch before listing reservations or changing reservation status
