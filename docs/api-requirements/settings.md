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
    "extraPriceForOtherCity": 0,
    "pickupAddresses": {
      "New York": { "street": "5th Avenue", "house": 742, "flat": 12 },
      "Los Angeles": { "street": "Sunset Boulevard", "house": 1050, "flat": 8 }
    }
  }
}
```

## Field Semantics

### `order.maxProductQuantityInOrder`
- Enforced by the backend on `POST /api/orders` and `PUT /api/orders/:orderId`.
- Each product position in the order must have `quantity` in the inclusive range `1..maxProductQuantityInOrder`.
- Out-of-range values produce `400` with the offending product id.

### `order.maxProductsInOrder`
- Currently **not enforced** by the backend. The Order endpoints accept any number of unique product positions ≥ 1.
- UI is expected to use this value to cap the product picker (default product line count).

## Validation Rules

### Create (`POST /api/settings`)

- Requires all sections: `order`, `inventory`, `delivery`.
- `order.maxProductsInOrder` and `order.maxProductQuantityInOrder` must be integers `>= 1`.
- `inventory.defaultLowStockThreshold` must be integer `>= 0`.
- `delivery.defaultCities` must be non-empty string array.
- `delivery.basePricePerItem` and `delivery.extraPriceForOtherCity` must be integers `>= 0`.
- `delivery.pickupAddresses` is required and must be a non-empty object.
- Each `pickupAddresses.<city>` value must include `street` (string), `house` (integer `>= 1`), `flat` (integer `>= 1`).
- `delivery.defaultCities` and `delivery.pickupAddresses` must match by city keys (no missing and no extra pickup city keys).

### Update (`PATCH /api/settings`)

- Partial payload allowed.
- At least one of `order`, `inventory`, `delivery` must be present.
- Nested section objects accept only known fields (`additionalProperties: false`).
- `delivery.pickupAddresses` can be updated as a whole object.
- If `delivery` is patched, resulting `defaultCities` and `pickupAddresses` must remain consistent by city keys.

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
- `400` validation error (including defaultCities/pickupAddresses key mismatch)
- `401` unauthorized

## Bootstrap and Migration Notes

- On app startup, `seed()` creates default settings if collection is empty.
- For existing environments, use migrations:
  - `npm run mongo:migrate:settings:init`
  - `npm run mongo:migrate:settings:add-core-us-cities` (synchronizes `delivery.defaultCities` and default `delivery.pickupAddresses`)
- Default values source of truth is `backend/data/defaultSettings.ts`.
