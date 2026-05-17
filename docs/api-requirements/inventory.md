# Inventory Module - API Requirements

> Purpose: define inventory read/write contracts and clarify canonical source of truth for stock vs reservations.

## Quick Facts

| Aspect | Details |
| --- | --- |
| Base path | `/api/inventory` |
| Auth | Required for all endpoints |
| Pagination limits | `limit` clamped to `10..100` |
| Inventory statuses | `In Stock`, `Low Stock`, `Out Of Stock`, `Not Tracked` |
| Record statuses | `Active`, `Archived` |

## Endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/inventory` | Paginated inventory list with filters/sorting. |
| GET | `/api/inventory/products/:productId` | Inventory details by product. |
| POST | `/api/inventory/adjustments` | Manual stock adjustment. |
| PATCH | `/api/inventory/products/:productId/variants/:variantId/settings` | Update variant low-stock settings. |
| GET | `/api/inventory/products/:productId/adjustments` | Product-level adjustment history. |
| GET | `/api/inventory/products/:productId/variants/:variantId/adjustments` | Variant-level adjustment history. |

## Canonical Data Ownership

Canonical fields:
- stock quantity: `Inventory.variants[].quantity`
- reservation quantity: `Inventory.variants[].reserved`
- available quantity: `Inventory.variants[].available`

Derived read-model fields:
- `Inventory.variants[].stockStatus`
- parent summary: `totalReserved`, `totalAvailable`, `inventoryStatus`, `lowStockVariantsCount`, `outOfStockVariantsCount`

Rule:
- reservation documents explain lock ownership/lifecycle for orders and can be non-expiring (`Order Processing`) or expiring (`Admin Draft`/`Customer Payment`);
- inventory numeric invariants must hold:
  - `quantity >= 0`
  - `reserved >= 0`
  - `available >= 0`
  - `available = max(quantity - reserved, 0)`

## Read Contract Notes

`GET /api/inventory` and `GET /api/inventory/products/:productId` return:
- variant-level `reserved` and `available`;
- parent-level summary totals/status.

`available` formula:
- `available = max(quantity - reserved, 0)`

## Adjustment and Reservation Semantics

Manual adjustments (`POST /adjustments`):
- allowed types: `Manual Increase`, `Manual Decrease`, `Manual Correction`, `Damage`, `Return`
- update stock quantity;
- must keep inventory invariants valid;
- quantity cannot go below reserved amount (independent of `allowSellingOutOfStock`).

Reservation and ordering rules:
- `Reserve` updates `Inventory.reserved/available` and reservation items;
- `allowSellingOutOfStock = true` allows creating/updating orders with partial reserve;
- shortage is not reserved in inventory and is treated as order-level business obligation;
- `Draft -> In Process` converts reservation to non-expiring (`type=Order Processing`, `expiresAt=null`) without changing inventory quantities.

Reservation-driven adjustments:
- `Reserve` is created when reservation is created.
- `Release`/`Expired Reservation` is created when active reservation is released/expired.
- `Sale` is created on receive flow and decreases both `quantity` and `reserved` only for stock-covered (reserved) part.
- Backorder-only receive may produce no `Sale` adjustment for that order line.

Important:
- reservation lifecycle is still tracked by reservation document mutations (`upsert`, `item update`, `delete reservation`);
- inventory read values come directly from persisted inventory variant fields.

## Filters and Sorting (`GET /api/inventory`)

Filters:
- `search` (product name/manufacturer)
- `manufacturer[]`
- `categoryId`
- `rootCategoryId`
- `inventoryStatus[]`
- `lowStockOnly`
- `outOfStockOnly`
- `includeArchived`

Sorting:
- `sortField`: `totalAvailable | totalReserved | updatedOn | lowStockVariantsCount | outOfStockVariantsCount`
- `sortOrder`: `asc | desc`

## Validation Rules

- `productId`, `variantId`, and relevant query ids must be valid ObjectId.
- `quantity` in manual adjustment must be integer `>= 1`.
- `lowStockThreshold` (when provided) must be integer `>= 0`.
- patch settings requires at least one field:
  - `lowStockThreshold`
  - `allowSellingOutOfStock`

## Standard Response Envelope

- success (list):
  - `{ Inventories, total, page, limit, ..., IsSuccess: true, ErrorMessage: null }`
- success (entity):
  - `{ Inventory, IsSuccess: true, ErrorMessage: null }`
- success (adjustments):
  - `{ Adjustments, total, page, limit, sortOrder, IsSuccess: true, ErrorMessage: null }`
- failure:
  - `{ IsSuccess: false, ErrorMessage }`
