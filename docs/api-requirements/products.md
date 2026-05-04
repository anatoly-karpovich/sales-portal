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
| Ordering rule | Only `Active` product + `Active` variant can be ordered |

## Product Model

```ts
Product {
  _id: ObjectId;
  name: string;
  manufacturer: string; // must exist in settings.catalog.manufacturers
  category: string;
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
| PUT | `/api/products/:productId/variants` | Full replace `variants[]` (atomic). |
| POST | `/api/products/:productId/variants` | Bulk add variants (array payload, max 200). |
| POST | `/api/products/:productId/variants/validate` | Dry-run variants validation without saving. |
| PATCH | `/api/products/:productId/variants/:variantId` | Partial update one variant. |
| PATCH | `/api/products/:productId/variants/:variantId/status` | Update one variant status. |
| DELETE | `/api/products/:productId/variants/:variantId` | Delete one variant (`204` on success). |
| DELETE | `/api/products/:productId` | Delete product (`204` on success). |
| POST | `/api/products/export` | Export products (`csv` or `json`). |

Status transitions:
- product status: `Draft -> Active`, `Active -> Archived`, `Archived -> Active`;
- any other transition is rejected (`400`);
- setting product to `Archived` auto-archives every variant.

Variants replace semantics (`PUT /api/products/:productId/variants`):
- atomic full replace of the whole `variants[]` array;
- existing variants are matched by `_id` (for existing variants `_id` must be provided);
- payload entries without `_id` are treated as new variants;
- existing variants missing from payload are treated as removed;
- if a removed variant is referenced by any order line, backend returns `409` and rejects the whole request.

Validate semantics (`POST /api/products/:productId/variants/validate`):
- dry-run only, no persistence;
- validates structure, combinations, duplicates, and prices;
- does not check order-reference conflicts.

## List DTO (`GET /api/products`)

```json
{
  "_id": "string",
  "name": "string",
  "manufacturer": "string",
  "category": "string",
  "status": "Active",
  "variantsCount": 3,
  "priceRange": { "min": 599.99, "max": 899.99 }
}
```

Sorting:
- `sortField`: `name | price | manufacturer | category | status | createdOn`
- `price` sorting is based on `priceRange.min`.

Filters:
- `manufacturer` (single/multiple)
- `status` (single/multiple)
- `search` (name/manufacturer/category)

## Details DTO (`GET /api/products/:productId`, `/all`)

```json
{
  "_id": "string",
  "name": "string",
  "manufacturer": "string",
  "category": "string",
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
- `_id`, `name`, `manufacturer`, `category`, `status`,
- `variantsCount`, `priceRange`, `attributes`, `variants`,
- `createdOn`, `updatedOn`.

## Standard Response Envelopes

- Success (entity): `{ Product, IsSuccess: true, ErrorMessage: null }`
- Success (list): `{ Products, IsSuccess: true, ErrorMessage: null }`
- Success (sorted list): `{ Products, total, page, limit, search, manufacturer, status, sorting, IsSuccess: true, ErrorMessage: null }`
- Failure: `{ IsSuccess: false, ErrorMessage }`
