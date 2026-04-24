# Products Module - API Requirements

> Purpose: define catalog listing, CRUD, and export API contracts.

## Quick Facts

| Aspect | Details |
| --- | --- |
| Base path | `/api/products` |
| Auth | Required |
| Pagination limits | `limit` clamped to `10..100` |
| Sorted list response | Includes `total`, `page`, `limit`, `search`, `manufacturer`, `sorting` |
| Delete guard | Product cannot be deleted if referenced by any order |

## Endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/products` | Paginated/sorted/filtered list. |
| GET | `/api/products/all` | Full list without paging/filtering. |
| POST | `/api/products` | Create product. |
| GET | `/api/products/:productId` | Get single product. |
| PUT | `/api/products/:productId` | Update product. |
| DELETE | `/api/products/:productId` | Delete product (`204` on success). |
| POST | `/api/products/export` | Export products (`csv` or `json`). |

## List Query Contract (`GET /api/products`)

| Query param | Type | Notes |
| --- | --- | --- |
| `search` | string | Matches `name`, `manufacturer`, or numeric price. |
| `manufacturer` | string or string[] | Multi-filter supported. |
| `sortField` | `name \| price \| manufacturer \| createdOn` | Defaults to `createdOn`. |
| `sortOrder` | `asc \| desc` | Defaults to `desc`. |
| `page` | string number | Minimum effective page is `1`. |
| `limit` | string number | Clamped to `10..100`. |

## Create/Update Payload

Schema-required fields:
- `name`
- `amount`
- `price`
- `manufacturer`

Optional:
- `notes`

## Validation and Business Guards

- Product name uniqueness is enforced case-insensitively (`trim` + regex exact match).
- `amount` must be `0..999`.
- `price` must be `1..99999`.
- `manufacturer` must be one of:
  - `Apple`, `Samsung`, `Google`, `Microsoft`, `Sony`, `Xiaomi`, `Amazon`, `Tesla`
- `notes` max effective length is `250`, with validation restrictions.
- Delete is blocked with `409` if product is assigned to any order.

## Export Contract (`POST /api/products/export`)

Payload:

```json
{
  "format": "csv",
  "fields": ["_id", "name", "price"],
  "filters": {
    "search": "",
    "manufacturer": ["Apple"],
    "page": 1,
    "limit": 20,
    "sortField": "createdOn",
    "sortOrder": "desc"
  }
}
```

Allowed `format`:
- `csv`
- `json`

Allowed `fields`:
- `_id`, `name`, `amount`, `price`, `manufacturer`, `createdOn`, `notes`

## Standard Response Envelopes

- Success (entity):
  - `{ Product, IsSuccess: true, ErrorMessage: null }`
- Success (list):
  - `{ Products, IsSuccess: true, ErrorMessage: null }`
- Success (sorted list):
  - `{ Products, total, page, limit, search, manufacturer, sorting, IsSuccess: true, ErrorMessage: null }`
- Failure:
  - `{ IsSuccess: false, ErrorMessage }`
