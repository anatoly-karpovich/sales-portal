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
| GET | `/api/inventory/reservations` | Paginated active reservations list with summary. |
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
- reservation documents explain lock ownership/lifecycle for orders and can be non-expiring (`Order Processing`) or expiring (`Admin Draft`/`Customer Draft`);
- inventory numeric invariants must hold:
  - `quantity >= 0`
  - `reserved >= 0`
  - `available >= 0`
  - `available = max(quantity - reserved, 0)`

Reservation type source of truth:
- `Admin Draft`
- `Order Processing`
- `Customer Draft`

## Read Contract Notes

`GET /api/inventory` returns lightweight list items:
- `_id`, `productId`, `product{_id,name,manufacturer,status}`
- `status`, `inventoryStatus`
- `variantsCount`, `lowStockVariantsCount`, `outOfStockVariantsCount`
- `updatedOn`

`GET /api/inventory/products/:productId` returns detailed inventory with variants.

`GET /api/inventory/reservations` returns:
- paginated active reservations list;
- server-side filtering and sorting;
- summary block calculated from full active reservations set (without applied filters).

Reservations list filters (`GET /api/inventory/reservations`):
- `search` (order id contains, Mongo `_id`);
- `type[]` (`Admin Draft | Order Processing | Customer Draft`);
- `fromDate` / `toDate` (by `createdOn`, inclusive);
- `expiresBefore` (`expiresAt <= value`);
- `page`, `limit`.

Reservations list sorting:
- `sortField`: `createdOn | expiresAt`
- `sortOrder`: `asc | desc`
- default: `createdOn desc`

Reservations summary:
- `activeReservations`: total active reservations count;
- `expiringSoon`: reservations with `expiresAt - now <= 5 minutes`;
- `processing`: reservations with `type = Order Processing`;
- `reservedUnits`: sum of reserved units across all active reservations.

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
- `productStatus[]` (`Draft | Active | Archived`)
- `inventoryStatus[]`

Sorting:
- `sortField`: `updatedOn | inventoryStatus | product.name | manufacturer`
- `sortOrder`: `asc | desc`
- for `inventoryStatus` sorting, severity order is `Out Of Stock -> Low Stock -> In Stock -> Not Tracked` (use `desc` to keep `Out Of Stock` on top).

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
