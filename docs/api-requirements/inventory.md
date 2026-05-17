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
- reservation quantity: `Reservation.items[].quantity` from active reservation documents (one reservation aggregate per order)

Derived read-model cache (non-canonical):
- `Inventory.variants[].reserved`
- `Inventory.variants[].available`
- `Inventory.variants[].stockStatus`
- parent summary: `totalReserved`, `totalAvailable`, `inventoryStatus`, `lowStockVariantsCount`, `outOfStockVariantsCount`

Rule:
- any conflict is resolved in favor of canonical sources above (`quantity` + active reservations);
- cached fields must be treated as projection/optimization only.

## Read Contract Notes

`GET /api/inventory` and `GET /api/inventory/products/:productId` return:
- variant-level `reserved` and `available`;
- parent-level summary totals/status.

These values are calculated from:
- persisted variant quantity;
- active reservation aggregate per `productId + variantId`.

`available` formula:
- `available = quantity - reservedActive`

## Adjustment and Reservation Semantics

Manual adjustments (`POST /adjustments`):
- allowed types: `Manual Increase`, `Manual Decrease`, `Manual Correction`, `Damage`, `Return`
- update stock quantity;
- must not violate `quantity >= reservedActive` when `allowSellingOutOfStock = false`.

Reservation-driven adjustments:
- `Reserve` is created when reservation is created.
- `Release`/`Expired Reservation` is created when active reservation is released/expired.
- `Sale` is created on receive flow and decreases quantity.

Important:
- reservation source-of-truth changes are document/item mutations (`upsert`, `item update`, `delete reservation`);
- inventory read values are computed from current reservation documents and variant quantity.

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
