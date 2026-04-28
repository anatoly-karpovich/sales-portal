# Customers Module - API Requirements

> Purpose: define CRUD, listing, export, and customer-orders API contracts.

## Quick Facts

| Aspect | Details |
| --- | --- |
| Base path | `/api/customers` |
| Auth | Required |
| Pagination limits | `limit` clamped to `10..100` |
| Sorted list response | Includes `total`, `page`, `limit`, `search`, `state`, `includeOtherStates`, `sorting` |
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
| `state` | string or string[] | Filter by US state codes (2-letter, 50 states only). |
| `includeOtherStates` | boolean | Include customers from states outside `settings.delivery.pickupLocations` keys. |
| `sortField` | `email \| name \| createdOn` | Defaults to `createdOn`. |
| `sortOrder` | `asc \| desc` | Defaults to `desc`. |
| `page` | string number | Minimum effective page is `1`. |
| `limit` | string number | Clamped to `10..100`. |

State filtering behavior:
- `state` only -> `state IN selected states`
- `includeOtherStates=true` only -> `state NOT IN settings.delivery.pickupLocations keys`
- both together -> union of both sets

## Create/Update Payload

Schema-required fields:
- `email`
- `name`
- `state`
- `city`
- `street`
- `house`
- `zipCode`
- `phone`

Optional:
- `apartment`
- `notes`

## Validation and Business Guards

- Email uniqueness is enforced case-insensitively (`trim + lowercase`).
- Name/state/city/street/phone/zipCode/notes format checks run in middleware.
- `house` must be `1..999`.
- `apartment` (if provided) must be `1..9999`.
- `zipCode` must match `^\d{5}(-\d{4})?$`.
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
    "state": ["MA"],
    "includeOtherStates": true,
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
- `_id`, `email`, `name`, `state`, `city`, `street`, `house`, `apartment`, `zipCode`, `phone`, `createdOn`, `notes`

## Standard Response Envelopes

- Success (entity):
  - `{ Customer, IsSuccess: true, ErrorMessage: null }`
- Success (list):
  - `{ Customers, IsSuccess: true, ErrorMessage: null }`
- Success (sorted list):
  - `{ Customers, total, page, limit, search, state, includeOtherStates, sorting, IsSuccess: true, ErrorMessage: null }`
- Failure:
  - `{ IsSuccess: false, ErrorMessage }`
