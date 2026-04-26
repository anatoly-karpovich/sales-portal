# Customers Module - API Requirements

> Purpose: define CRUD, listing, export, and customer-orders API contracts.

## Quick Facts

| Aspect | Details |
| --- | --- |
| Base path | `/api/customers` |
| Auth | Required |
| Pagination limits | `limit` clamped to `10..100` |
| Sorted list response | Includes `total`, `page`, `limit`, `search`, `city`, `includeOtherCities`, `sorting` |
| Delete guard | Customer cannot be deleted if referenced by any order |

## Endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/customers` | Paginated/sorted/filtered list. |
| GET | `/api/customers/all` | Full list without paging/filtering. |
| POST | `/api/customers` | Create customer. |
| GET | `/api/customers/:customerId` | Get single customer. |
| PUT | `/api/customers/:customerId` | Update customer. |
| DELETE | `/api/customers/:customerId` | Delete customer (`204` on success). |
| POST | `/api/customers/export` | Export customers (`csv` or `json`). |
| GET | `/api/customers/:customerId/orders` | Get orders linked to customer. |

## List Query Contract (`GET /api/customers`)

| Query param | Type | Notes |
| --- | --- | --- |
| `search` | string | Matches customer fields (`email`, `name`). |
| `city` | string or string[] | Filter by specific city names. |
| `includeOtherCities` | boolean | Include customers from cities outside `settings.delivery.defaultCities`. |
| `sortField` | `email \| name \| createdOn` | Defaults to `createdOn`. |
| `sortOrder` | `asc \| desc` | Defaults to `desc`. |
| `page` | string number | Minimum effective page is `1`. |
| `limit` | string number | Clamped to `10..100`. |

City filtering behavior:
- `city` only -> `city IN selected cities`
- `includeOtherCities=true` only -> `city NOT IN settings.delivery.defaultCities`
- both together -> union of both sets

## Create/Update Payload

Schema-required fields:
- `email`
- `name`
- `city`
- `street`
- `house`
- `flat`
- `phone`

Optional:
- `notes`

## Validation and Business Guards

- Email uniqueness is enforced case-insensitively (`trim + lowercase`).
- Name/city/street/phone/notes format checks run in middleware.
- `house` must be `1..999`.
- `flat` must be `1..9999`.
- `notes` max effective length is `250`, disallows invalid patterns per validation rules.
- Delete is blocked with `409` if customer is assigned to any order.

## Export Contract (`POST /api/customers/export`)

Payload:

```json
{
  "format": "csv",
  "fields": ["_id", "email", "name"],
  "filters": {
    "search": "",
    "city": ["Boston"],
    "includeOtherCities": true,
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
- `_id`, `email`, `name`, `city`, `street`, `house`, `flat`, `phone`, `createdOn`, `notes`

## Standard Response Envelopes

- Success (entity):
  - `{ Customer, IsSuccess: true, ErrorMessage: null }`
- Success (list):
  - `{ Customers, IsSuccess: true, ErrorMessage: null }`
- Success (sorted list):
  - `{ Customers, total, page, limit, search, city, includeOtherCities, sorting, IsSuccess: true, ErrorMessage: null }`
- Failure:
  - `{ IsSuccess: false, ErrorMessage }`
