# Backend Handoff: Product Variants And Order Contracts

Last updated: 2026-05-03  
Scope: `backend/` only  
Compatibility: **breaking change**, no backward compatibility with old product/order payloads.

## 1. High-Level Summary

Backend moved from single-price product model to product-with-variants model.

- `Product` now has parent fields + `attributes[]` + `variants[]`.
- Price exists only on `variant`.
- Orders are now line-based by `(productId, variantId, quantity)`.
- Receive flow is now line-based by `(productId, variantId)`.
- Manufacturers are now configured via settings (`settings.catalog.manufacturers`), not enum.

No migration layer and no legacy payload support were implemented.

## 2. Product Domain Model (Current)

`Product`:

- `_id: ObjectId`
- `name: string`
- `manufacturer: string`
- `category: string`
- `description?: string`
- `imageUrl?: string`
- `status: "Draft" | "Active" | "Archived"`
- `attributes: ProductAttribute[]`
- `variants: ProductVariant[]`
- `createdOn: Date`
- `updatedOn: Date`

`ProductAttribute`:

- `key: string`
- `name: string` (max 100 chars)
- `values: string[]` (non-empty)

`ProductVariant`:

- `_id: ObjectId`
- `price: number` (positive, max 2 decimal places)
- `status: "Draft" | "Active" | "Archived"`
- `attributes: Record<string, string>`
- `imageUrl?: string`

## 3. Product Validation Rules (Enforced)

### 3.1 Parent product

- `name`, `manufacturer`, `category`, `status` are required in create/replace.
- Product name uniqueness is case-insensitive (`trim + regex exact`).
- `manufacturer` must exist in `settings.catalog.manufacturers` (case-insensitive match).

### 3.2 Attributes and variants consistency

- Product must contain at least 1 variant.
- Attribute keys are normalized (`trim + lower-case`) and must be unique.
- Attribute values are normalized (`trim`) and duplicates are rejected case-insensitively.
- Every variant must contain **all** product attribute keys (no missing keys).
- Variant attribute values must belong to corresponding attribute `values`.
- Variant attribute combination must be unique inside product.
- Validation for keys/values is case-insensitive.

### 3.3 Variant price/status

- `price > 0`
- `price` max precision: 2 decimals
- `status` must be one of `Draft | Active | Archived`

### 3.4 Availability for orders

Order creation/update/pricing accepts only:

- `product.status === Active`
- `variant.status === Active`

## 4. Product API Contract

All routes require auth (`authmiddleware`).

### 4.1 List

`GET /api/products`

Query:

- `search?: string`
- `manufacturer?: string | string[]`
- `status?: ProductStatus | ProductStatus[]`
- `sortField?: "name" | "price" | "manufacturer" | "category" | "status" | "createdOn"`
- `sortOrder?: "asc" | "desc"`
- `page?: string`
- `limit?: string` (clamped `10..100`)

Sort by `price` uses `priceRange.min` (cheapest variant).

Response item (`ProductListItemDTO`):

- `_id`
- `name`
- `manufacturer`
- `category`
- `status`
- `variantsCount`
- `priceRange: { min, max }`

Envelope:

- `{ Products, total, page, limit, search, manufacturer, status, sorting, IsSuccess, ErrorMessage }`

### 4.2 Full details list

`GET /api/products/all`

Returns full details array (`ProductDetailsDTO`) in envelope:

- `{ Products, IsSuccess, ErrorMessage }`

### 4.3 Details by id

`GET /api/products/:productId`

Returns `ProductDetailsDTO`:

- `_id, name, manufacturer, category, description?, imageUrl?, status`
- `attributes[]`
- `variants[]`
- `priceRange`
- `createdOn, updatedOn`

Envelope:

- `{ Product, IsSuccess, ErrorMessage }`

### 4.4 Create product

`POST /api/products`

Body:

- full product payload including `attributes[]` and `variants[]`.

Response:

- `201`, `{ Product, IsSuccess: true, ErrorMessage: null }`

### 4.5 Replace product (full)

`PUT /api/products/:productId`

Body:

- full product payload (same as create).

Response:

- `200`, `{ Product, IsSuccess, ErrorMessage }`

### 4.6 Patch product parent

`PATCH /api/products/:productId`

Body can include subset of:

- `name, manufacturer, category, description, imageUrl, status, attributes`

Response:

- `200`, `{ Product, IsSuccess, ErrorMessage }`

### 4.7 Add one variant

`POST /api/products/:productId/variants`

Body:

- `{ price, status, attributes, imageUrl? }`

Response:

- `201`, `{ Product, IsSuccess, ErrorMessage }`

### 4.8 Patch one variant

`PATCH /api/products/:productId/variants/:variantId`

Body can include subset of:

- `price, status, attributes, imageUrl`

Response:

- `200`, `{ Product, IsSuccess, ErrorMessage }`

### 4.9 Delete one variant

`DELETE /api/products/:productId/variants/:variantId`

Blocked cases:

- `404` variant not found in product
- `400` if product would have zero variants
- `409` if variant is referenced in any order line (`productId + variantId`)

Success:

- `204 No Content`

### 4.10 Delete product

`DELETE /api/products/:productId`

Blocked:

- `409` if product is referenced in any order

Success:

- `204 No Content`

### 4.11 Export products

`POST /api/products/export`

Body:

- `format: "csv" | "json"`
- `fields: ProductExportFields[]`
- `filters?: { search, manufacturer[], status[], page, limit, sortField, sortOrder }`

Allowed fields:

- `_id, name, manufacturer, category, status, variantsCount, priceRange, attributes, variants, createdOn, updatedOn`

## 5. Settings Contract Change

Settings now include:

- `catalog.manufacturers: string[]` (required in create settings)

Validation:

- non-empty array
- every item non-empty string
- duplicates are rejected case-insensitively

Used by product validation to authorize manufacturer values.

## 6. Order Contract Change (Critical For Frontend)

### 6.1 Order line payloads

Old:

- `{ id, quantity }`

New:

- `{ productId, variantId, quantity }`

Applies to:

- `POST /api/orders`
- `PATCH /api/orders/:orderId`
- `POST /api/orders/pricing`

### 6.2 Receive payload

Old:

- `products: string[]`

New:

- `products: Array<{ productId, variantId }>`

Applies to:

- `POST /api/orders/:orderId/receive`

### 6.3 Response line shape

Order product line now contains variant reference:

- `product: { _id, name }`
- `variant: { _id }`
- `unitPrice`
- `quantity`
- `received`

### 6.4 Backend checks

For create/update/pricing:

- rejects duplicate `(productId, variantId)` lines
- product must exist and be `Active`
- variant must exist in product and be `Active`
- quantity must be in `1..settings.order.maxProductQuantityInOrder`

For receive:

- rejects duplicate `(productId, variantId)` pairs
- each pair must exist in order and be not yet received

## 7. Pricing Behavior

`POST /api/orders/pricing` and internal order totals now use variant price:

- product is resolved by `productId`
- variant is resolved by `variantId` inside that product
- line subtotal = `variant.price * quantity`

## 8. Export And Metrics Notes

### 8.1 Orders export

`products` export now includes:

- `products[n].product._id`
- `products[n].variant._id`
- plus `name`, `unitPrice`, `quantity`, `received`

### 8.2 Metrics top products

Top products metric remains aggregated by parent product id.

## 9. Common Error Envelope

Most failures return:

- `{ IsSuccess: false, ErrorMessage: "..." }`

Common product-related status codes:

- `400` validation/business-rule error
- `404` product/variant not found
- `409` conflict (name uniqueness, referenced by order)
- `500` server/internal error

## 10. Frontend Migration Checklist

1. Replace all order line builders from `{ id, quantity }` to `{ productId, variantId, quantity }`.
2. Replace receive payload from `string[]` to `{ productId, variantId }[]`.
3. Update product create/edit forms to manage:
   - parent fields
   - attributes matrix
   - variants list with attribute combinations
4. Add UI actions for:
   - add variant (`POST /products/:id/variants`)
   - patch variant (`PATCH /products/:id/variants/:variantId`)
   - delete variant (`DELETE /products/:id/variants/:variantId`)
5. Consume manufacturer options from settings (`catalog.manufacturers`) instead of hardcoded enum.
6. Adjust product list table to show:
   - `variantsCount`
   - `priceRange`
   - sorting by min variant price
7. Handle new conflict case for variant delete (`409` when variant exists in orders).
