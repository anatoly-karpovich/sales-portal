# Products Module - API Requirements

> Purpose: define product catalog contracts with product-level data and sellable variants.

## Quick Facts

| Aspect | Details |
| --- | --- |
| Base path | `/api/products` |
| Auth | Required |
| Pagination limits | `limit` clamped to `10..100` |
| Product statuses | `Draft`, `Active`, `Archived` |
| Variant statuses | `Draft`, `Active`, `Archived` |
| Category linkage | `categoryId` + `rootCategoryId` |
| Ordering rule | Only `Active` product + `Active` variant can be ordered |

## Product Model

```ts
Product {
  _id: ObjectId;
  name: string;
  manufacturer: string; // must exist in settings.catalog.manufacturers
  categoryId: ObjectId; // selected category node
  rootCategoryId: ObjectId; // top-level category node
  description?: string;
  imageUrl?: string;
  status: "Draft" | "Active" | "Archived";
  setup: {
    completed: boolean;
    completedOn?: Date;
    completedBy?: ObjectId;
  };
  attributes: Array<{ key: string; name: string; values: string[] }>;
  variants: Array<{
    _id: ObjectId;
    price: number; // decimal, max 2 digits after dot
    status: "Draft" | "Active" | "Archived";
    attributes: Record<string, string>;
    imageUrl?: string;
  }>;
  createdOn: Date;
  updatedOn: Date;
}
```

Rules:
- draft product created by setup init may contain 0 variants;
- setup completion requires at least 1 variant;
- variant attributes must contain all product attribute keys;
- variant attribute keys/values are validated case-insensitively (`trim + lower-case`);
- variant attribute values must belong to corresponding `ProductAttribute.values`;
- combination of variant attributes must be unique inside the product.
- deleting a variant is blocked with `409` when any order references that `productId + variantId` pair.
- `PUT /api/products/:productId/variants` accepts `1..200` variants.
- `POST /api/products/:productId/variants` accepts:
  - `1..200` variants for `Draft` products;
  - exactly `1` variant for `Active`/`Archived` products.
- `DELETE /api/products/:productId/variants/:variantId` is allowed for `Draft` and `Active`/`Archived` products only when:
  - the variant is not the last variant in product;
  - the variant has never been referenced by any order line.
- variant delete removes:
  - variant inventory record from product inventory;
  - inventory adjustment history entries for that `productId + variantId` pair;
  - reservation entries for that `productId + variantId` pair.
- duplicate-like validation conflicts are returned as `409` (duplicate product name, duplicate attribute keys/values, duplicate variant combinations, duplicate variant ids in replace payload).
- non-status endpoints do not accept `status` in payloads; status changes are allowed only via dedicated status endpoints.
- create/update validates `categoryId` existence.
- `rootCategoryId` is computed by backend from category tree and never trusted from request payload.

Editability by status:
- `Draft` (setup flow): behavior stays as-is; setup endpoints can manage attributes/variants/initial inventory.
- `Active` / `Archived`:
  - product patch (`PATCH /api/products/:productId`) allows only `categoryId`, `description`, `imageUrl`;
  - product parent identity fields (`name`, `manufacturer`) are read-only;
  - product attribute structure (`attributes`) is read-only;
  - variant attribute combinations are read-only;
  - variant operational/display updates are allowed only via:
    - `PATCH /api/products/:productId/attributes/order` (attributes reorder only, definition must stay identical);
    - `PATCH /api/products/:productId/variants/:variantId` (`price`, `imageUrl`);
    - `PATCH /api/products/:productId/variants/:variantId/status` (`status`).
  - structure-changing variant endpoints are draft-only, except guarded single-item operations:
    - `PUT /api/products/:productId/variants`
  - `POST /api/products/:productId/variants` is allowed for `Active`/`Archived` only as a single-item add (`exactly 1`) and only while not all attribute combinations are created.
  - `DELETE /api/products/:productId/variants/:variantId` is allowed for `Active`/`Archived` only for variants never used in orders.

## Endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/products` | Paginated/sorted/filtered list. |
| POST | `/api/products/setup/init` | Create draft parent product for setup flow. |
| PUT | `/api/products/:productId/setup/spec` | Save attributes + variants atomically in setup flow. |
| POST | `/api/products/:productId/complete-setup` | Complete setup and activate parent product. |
| GET | `/api/products/:productId` | Get product details. |
| PATCH | `/api/products/:productId` | Partial update product parent fields. |
| PATCH | `/api/products/:productId/attributes/order` | Reorder parent attributes (Active/Archived only, definition unchanged). |
| PATCH | `/api/products/:productId/status` | Update product status with guarded transitions. |
| PUT | `/api/products/:productId/variants` | Full replace `variants[]` and optional `attributes` (atomic). |
| POST | `/api/products/:productId/variants` | Bulk add variants (array payload, max 200). |
| PATCH | `/api/products/:productId/variants/:variantId` | Partial update one variant. |
| PATCH | `/api/products/:productId/variants/:variantId/status` | Update one variant status. |
| DELETE | `/api/products/:productId/variants/:variantId` | Delete one variant (`204` on success). |
| DELETE | `/api/products/:productId` | Delete product (`204` on success). |
| POST | `/api/products/export` | Export products (`csv` or `json`). |

## List DTO (`GET /api/products`)

```json
{
  "_id": "string",
  "name": "string",
  "manufacturer": "string",
  "categoryId": "string",
  "rootCategoryId": "string",
  "categoryPath": "Electronics / Laptops / Gaming Laptops",
  "status": "Active",
  "setup": { "completed": true, "completedOn": "2026-05-06T10:30:00.000Z", "completedBy": "6650..." },
  "createdOn": "2026-05-06T10:00:00.000Z",
  "variantsCount": 3,
  "priceRange": { "min": 599.99, "max": 899.99 }
}
```

Sorting:
- `sortField`: `name | price | manufacturer | category | status | createdOn | variantsCount`
- `price` sorting is based on `priceRange.min`.
- `category` sorting is based on `categoryPath` (case-insensitive).
- `variantsCount` sorting is based on `product.variants.length`.
- tie-break for equal primary sort values is always `createdOn desc`.

Filters:
- `manufacturer` (single/multiple)
- `status` (single/multiple)
- `categoryId` (exact ObjectId match)
- `rootCategoryId` (exact ObjectId match)
- `minPrice` (inclusive, optional)
- `maxPrice` (inclusive, optional)
- `search` (name/manufacturer)
- price filters are applied to variant prices (product is included when at least one variant is within the passed bounds).

## Details DTO (`GET /api/products/:productId`)

```json
{
  "_id": "string",
  "name": "string",
  "manufacturer": "string",
  "categoryId": "string",
  "rootCategoryId": "string",
  "categoryPath": "Electronics / Laptops / Gaming Laptops",
  "category": {
    "_id": "string",
    "name": "Gaming Laptops",
    "slug": "gaming-laptops",
    "path": [
      { "_id": "string", "name": "Electronics", "slug": "electronics" },
      { "_id": "string", "name": "Laptops", "slug": "laptops" },
      { "_id": "string", "name": "Gaming Laptops", "slug": "gaming-laptops" }
    ]
  },
  "rootCategory": {
    "_id": "string",
    "name": "Electronics",
    "slug": "electronics"
  },
  "description": "string",
  "imageUrl": "string",
  "status": "Active",
  "setup": { "completed": true, "completedOn": "2026-05-06T10:30:00.000Z", "completedBy": "6650..." },
  "attributes": [{ "key": "color", "name": "Color", "values": ["Black", "White"] }],
  "variants": [
    {
      "_id": "string",
      "price": 799.99,
      "status": "Active",
      "attributes": { "color": "White", "storage": "256GB" },
      "imageUrl": "string"
    }
  ],
  "priceRange": { "min": 799.99, "max": 899.99 }
}
```

## Export Contract (`POST /api/products/export`)

Allowed fields:
- `_id`, `name`, `manufacturer`, `categoryId`, `rootCategoryId`, `categoryPath`, `status`,
- `variantsCount`, `priceRange`, `attributes`, `variants`,
- `createdOn`, `updatedOn`.

Supported `filters` keys:
- `search`, `manufacturer[]`, `status[]`, `categoryId`, `rootCategoryId`, `minPrice`, `maxPrice`,
- `page`, `limit`, `sortField`, `sortOrder`.

## Standard Response Envelopes

- Success (entity): `{ Product, IsSuccess: true, ErrorMessage: null }`
- Success (list): `{ Products, IsSuccess: true, ErrorMessage: null }`
- Success (sorted list): `{ Products, total, page, limit, search, manufacturer, status, categoryId, rootCategoryId, minPrice, maxPrice, sorting, IsSuccess: true, ErrorMessage: null }`
- Failure: `{ IsSuccess: false, ErrorMessage }`
