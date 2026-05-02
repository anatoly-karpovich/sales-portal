# Settings Module - API Requirements

> Purpose: define singleton application settings contract used for order, inventory, shipping delivery pricing, pickup policy/locations, and shipping processing cut-off.

## Quick Facts

| Aspect | Details |
| --- | --- |
| Base path | `/api/settings` |
| Auth | Required for all endpoints |
| Persistence model | Singleton document in `Settings` collection |
| Create behavior | `POST` only for initial creation |
| Main update path | `PATCH /api/settings` |

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
    "processing": {
      "cutoffHour": 18
    },
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

### `shipping.processing.cutoffHour`
- Integer in range `0..23`.
- Uses server local time.
- Controls `startsAt` date finalization for `Draft -> In Process`:
  - `now.hour >= cutoffHour` -> `startsAt = tomorrow`
  - otherwise `startsAt = today`

### `shipping.delivery.pricing`
- Three pricing zones: `localCity`, `sameState`, `outOfState`.
- `express.days` contributes to delivery `estimatedDays`.

### `shipping.pickup.policy`
- `readyInDays`: days from `startsAt` to `availableFromDate`.
- `holdForDays`: days from `availableFromDate` to `pickupByDate`.

### `shipping.pickup.locations`
- US-state keyed map (`AL..WY`) of pickup locations.
- Location object requires `id`, `city`, `address`, `isActive`.

## Validation Rules

### Create (`POST /api/settings`)

- Requires top-level sections: `order`, `inventory`, `shipping`.
- Inside `shipping`, all are required:
  - `processing.cutoffHour`
  - `delivery.pricing`
  - `pickup.policy`
  - `pickup.locations`
- Numeric constraints:
  - `cutoffHour` is integer `0..23`
  - `order.maxProductsInOrder >= 1`
  - `order.maxProductQuantityInOrder >= 1`
  - `inventory.defaultLowStockThreshold >= 0`
  - all delivery pricing numeric fields are integers `>= 0`
  - `pickup.policy.readyInDays >= 0`
  - `pickup.policy.holdForDays >= 1`
  - `pickup.policy.remindBeforeDays >= 0` when provided
- `shipping.pickup.locations` keys must be valid US state codes.
- Pickup location `id` values must be unique across all states.

### Update (`PATCH /api/settings`)

- Partial payload allowed.
- At least one of `order`, `inventory`, `shipping` must be present.
- If `shipping` is patched, merged result must still contain:
  - `shipping.processing.cutoffHour`
  - `shipping.delivery.pricing`
  - `shipping.pickup.locations`
  - `shipping.pickup.policy`

## Bootstrap and Migration Notes

- On app startup, `seed()` creates default settings if collection is empty.
- Default values source of truth: `backend/data/defaultSettings.ts`.
- Existing deployments must run migration that sets `shipping.processing.cutoffHour`.
