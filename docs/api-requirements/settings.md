# Settings Module - API Requirements

> Purpose: define singleton application settings contract used for order, inventory, and delivery defaults.

## Quick Facts

| Aspect | Details |
| --- | --- |
| Base path | `/api/settings` |
| Auth | Required for all endpoints |
| Persistence model | Singleton document in `Settings` collection |
| Create behavior | `POST` only for initial creation |
| Main update path | `PATCH /api/settings` |

## Endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/settings` | Get current settings singleton. |
| POST | `/api/settings` | Create settings singleton (fails if already exists). |
| PATCH | `/api/settings` | Partial update of existing settings. |

## Settings Object Contract

```json
{
  "order": {
    "maxProductsInOrder": 5,
    "maxProductQuantityInOrder": 10
  },
  "inventory": {
    "defaultLowStockThreshold": 5
  },
  "delivery": {
    "defaultCities": ["New York", "Los Angeles"],
    "basePricePerItem": 0,
    "extraPriceForOtherCity": 0
  }
}
```

## Validation Rules

### Create (`POST /api/settings`)

- Requires all sections: `order`, `inventory`, `delivery`.
- `order.maxProductsInOrder` and `order.maxProductQuantityInOrder` must be integers `>= 1`.
- `inventory.defaultLowStockThreshold` must be integer `>= 0`.
- `delivery.defaultCities` must be non-empty string array.
- `delivery.basePricePerItem` and `delivery.extraPriceForOtherCity` must be integers `>= 0`.

### Update (`PATCH /api/settings`)

- Partial payload allowed.
- At least one of `order`, `inventory`, `delivery` must be present.
- Nested section objects accept only known fields (`additionalProperties: false`).

## Response Envelopes

- Success:
  - `{ Settings, IsSuccess: true, ErrorMessage: null }`
- Failure:
  - `{ IsSuccess: false, ErrorMessage }`

## Status Codes

### `GET /api/settings`

- `200` settings returned
- `401` unauthorized
- `404` settings not found

### `POST /api/settings`

- `201` created
- `400` validation error
- `401` unauthorized
- `409` settings already exist

### `PATCH /api/settings`

- `200` updated
- `400` validation error
- `401` unauthorized

## Bootstrap and Migration Notes

- On app startup, `seed()` creates default settings if collection is empty.
- For existing environments, use migrations:
  - `npm run mongo:migrate:settings:init`
  - `npm run mongo:migrate:settings:add-core-us-cities`
- Default values source of truth is `backend/data/defaultSettings.ts`.
