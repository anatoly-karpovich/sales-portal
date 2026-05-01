# Settings Module - API Requirements

> Purpose: define singleton application settings contract used for order, inventory, shipping delivery pricing, and pickup policy/locations.

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
  "shipping": {
    "delivery": {
      "pricing": {
        "localCity": { "basePrice": 10, "minDays": 1, "express": { "days": 0, "extraPrice": 10 } },
        "sameState": { "basePrice": 20, "minDays": 3, "express": { "days": 2, "extraPrice": 10 } },
        "outOfState": { "basePrice": 35, "minDays": 7, "express": { "days": 5, "extraPrice": 20 } }
      }
    },
    "pickup": {
      "policy": {
        "readyInDays": 1,
        "holdForDays": 5,
        "remindBeforeDays": 1
      },
      "locations": {
        "NY": [
          {
            "id": "64f100000000000000000001",
            "city": "New York",
            "address": {
              "street": "5th Avenue",
              "house": 742,
              "apartment": 12,
              "zipCode": "10001"
            },
            "isActive": true
          }
        ]
      }
    }
  }
}
```

## Field Semantics

### `order.maxProductQuantityInOrder`
- Enforced by backend on `POST /api/orders` and `PATCH /api/orders/:orderId`.
- Each order line quantity must be in `1..maxProductQuantityInOrder`.

### `order.maxProductsInOrder`
- Informational for UI.
- Not enforced by backend (backend enforces at least one unique product line).

### `shipping.delivery.pricing`
- Three pricing zones: `localCity`, `sameState`, `outOfState`.
- Zone is selected by delivery address vs active pickup locations.
- `express` nested object defines express `days` and `extraPrice` per line.

### `shipping.pickup.policy`
- `readyInDays`: pickup becomes available after this many days.
- `holdForDays`: pickup window length after availability date.
- `remindBeforeDays`: optional reminder lead time.

### `shipping.pickup.locations`
- US-state keyed map (`AL..WY`) of pickup locations.
- Location object requires `id`, `city`, `address`, `isActive`.

## Validation Rules

### Create (`POST /api/settings`)

- Requires all top-level sections: `order`, `inventory`, `shipping`.
- `shipping.delivery.pricing` is required.
- `shipping.pickup.policy` is required.
- `shipping.pickup.locations` is required.
- Numeric constraints:
  - `order.maxProductsInOrder >= 1`
  - `order.maxProductQuantityInOrder >= 1`
  - `inventory.defaultLowStockThreshold >= 0`
  - all pricing numeric fields (`basePrice`, `minDays`, `days`, `extraPrice`) are integers `>= 0`
  - `pickup.policy.readyInDays >= 0`
  - `pickup.policy.holdForDays >= 1`
  - `pickup.policy.remindBeforeDays >= 0` when provided
- `shipping.pickup.locations` keys must be valid US state codes.
- Pickup location `id` values must be unique across all states.
- `address.zipCode` must match `^\d{5}(-\d{4})?$`.

### Update (`PATCH /api/settings`)

- Partial payload allowed.
- At least one of `order`, `inventory`, `shipping` must be present.
- If `shipping` is patched, merged result must still contain:
  - `shipping.delivery.pricing`
  - `shipping.pickup.locations`
  - `shipping.pickup.policy`
- Same state-key and pickup-id uniqueness rules are enforced.

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
- Default values source of truth: `backend/data/defaultSettings.ts`.
