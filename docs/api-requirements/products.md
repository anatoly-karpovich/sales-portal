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
- product must contain at least 1 variant;
- variant attributes must contain all product attribute keys;
- variant attribute keys/values are validated case-insensitively (`trim + lower-case`);
- variant attribute values must belong to corresponding `ProductAttribute.values`;
- combination of variant attributes must be unique inside the product.
- deleting a variant is blocked with `409` when any order references that `productId + variantId` pair.
- `POST /api/products/:productId/variants`, `PUT /api/products/:productId/variants`, and `POST /api/products/:productId/variants/validate` accept `1..200` variants.
- duplicate-like validation conflicts are returned as `409` (duplicate product name, duplicate attribute keys/values, duplicate variant combinations, duplicate variant ids in replace payload).
- non-status endpoints do not accept `status` in payloads; status changes are allowed only via dedicated status endpoints.
- create/update validates `categoryId` existence.
- `rootCategoryId` is computed by backend from category tree and never trusted from request payload.

## Endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/products` | Paginated/sorted/filtered list. |
| GET | `/api/products/all` | Full details for all products. |
| POST | `/api/products` | Create product. |
| GET | `/api/products/:productId` | Get product details. |
| PUT | `/api/products/:productId` | Full replace product. |
| PATCH | `/api/products/:productId` | Partial update product parent fields. |
| PATCH | `/api/products/:productId/status` | Update product status with guarded transitions. |
| PUT | `/api/products/:productId/variants` | Full replace `variants[]` and optional `attributes` (atomic). |
| POST | `/api/products/:productId/variants` | Bulk add variants (array payload, max 200). |
| POST | `/api/products/:productId/variants/validate` | Dry-run variants validation without saving. |
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

## Details DTO (`GET /api/products/:productId`, `/all`)

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
