# Orders Module - API Requirements

> Purpose: define all order-related REST contracts including lifecycle, delivery, pricing, receive, manager assignment, and comments.

## Quick Facts

| Aspect | Details |
| --- | --- |
| Base path | `/api/orders` |
| Auth | Required |
| Core status field | `status` |
| Delivery status field | `deliveryStatus` |
| Pagination limits | `limit` clamped to `10..100` on list endpoints |
| Create/update product count | At least `1` unique product. Per-line `quantity` is `1..settings.order.maxProductQuantityInOrder`. Duplicate product ids are rejected. |

## Status Enums (exact values)

`status`:
- `Draft`
- `In Process`
- `Completed`
- `Canceled`

`deliveryStatus`:
- `Not Scheduled`
- `Scheduled`
- `Partially Delivered`
- `Delivered`

## Endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/orders` | Paginated/sorted/filtered list. |
| GET | `/api/orders/:orderId` | Detailed order. |
| POST | `/api/orders` | Create order (customer + products). |
| PATCH | `/api/orders/:orderId` | Update customer/products (Draft only). |
| DELETE | `/api/orders/:orderId` | Delete order (`204`). |
| POST | `/api/orders/export` | Export orders (`csv` or `json`). |
| POST | `/api/orders/pricing` | Calculate products + delivery pricing without creating/updating an order. |
| PUT | `/api/orders/:orderId/status` | Update order status (restricted payload). |
| POST | `/api/orders/:orderId/delivery` | Create/edit delivery (Draft only). |
| POST | `/api/orders/:orderId/receive` | Mark products as received. |
| POST | `/api/orders/:orderId/comments` | Add comment. |
| DELETE | `/api/orders/:orderId/comments/:commentId` | Delete comment (`204`). |
| PUT | `/api/orders/:orderId/assign-manager/:managerId` | Assign manager. |
| PUT | `/api/orders/:orderId/unassign-manager` | Unassign manager. |

## List Contract (`GET /api/orders`)

### Query params

| Param | Type | Notes |
| --- | --- | --- |
| `search` | string | Matches order id, customer name/email, `status`, `deliveryStatus`, total price. |
| `status` | string or string[] | Filter by order status values. |
| `deliveryStatus` | string or string[] | Filter by delivery status values. |
| `sortField` | `createdOn \| total_price \| status` | Defaults to `createdOn`. |
| `sortOrder` | `asc \| desc` | Defaults to `asc` in controller. |
| `page` | string number | Minimum effective page is `1`. |
| `limit` | string number | Clamped to `10..100`. |

### Success response shape

```json
{
  "Orders": [],
  "total": 0,
  "page": 1,
  "limit": 10,
  "search": "",
  "status": [],
  "deliveryStatus": [],
  "sorting": { "sortField": "createdOn", "sortOrder": "asc" },
  "IsSuccess": true,
  "ErrorMessage": null
}
```

## Create/Update Contract

### `POST /api/orders`
### `PATCH /api/orders/:orderId`

Payload:

```json
{
  "customer": "<customerId>",
  "products": [
    { "id": "<productId1>", "quantity": 3 },
    { "id": "<productId2>", "quantity": 1 }
  ]
}
```

Rules:
- `products` must contain at least `1` item.
- `id` values must be unique inside `products` (duplicates are rejected with `400`).
- Each `quantity` is an integer in `1..settings.order.maxProductQuantityInOrder`.
- `customer` and each `product` must exist (404 with the missing id otherwise).
- Update route is allowed only while order is `Draft`.
- On update:
  - existing lines keep original `unitPrice` snapshot and `received`,
  - newly added lines get current `Product.price`,
  - `quantity` always comes from request payload.

### Response product structure

```json
{
  "product": {
    "_id": "<productId>",
    "name": "<productName>",
    "manufacturer": "<manufacturerEnum>"
  },
  "unitPrice": 9.99,
  "quantity": 3,
  "received": false
}
```

## `total_price` semantics

- products subtotal: `Σ unitPrice × quantity`
- if `delivery` exists: `total_price = products subtotal + delivery.price`
- if no delivery: `total_price = products subtotal`

## Delivery Contract (`POST /api/orders/:orderId/delivery`)

Payload:

```json
{
  "condition": "Delivery",
  "express": true,
  "address": {
    "state": "NY",
    "city": "New York",
    "street": "Broadway",
    "house": 1,
    "apartment": 1,
    "zipCode": "10001"
  }
}
```

Rules:
- Allowed only when `status = Draft`.
- `state` must be one of 50 US state codes.
- `zipCode` must match `^\d{5}(-\d{4})?$`.
- `apartment` is optional, when provided must be integer `>= 1`.
- `condition = Delivery` -> `express` is required.
- `condition = Pickup` -> `express=true` is rejected.
- Backend computes and stores delivery snapshot:
  - `price`
  - `pricingTier` (`pickup | local_city | same_state | out_of_state`)
  - `schedule`:
    - Delivery: `{ express, estimatedDate }`
    - Pickup: `{ availableFromDate, pickupByDate }`
- On success backend sets `deliveryStatus = Scheduled`.

## Pricing Contract (`POST /api/orders/pricing`)

Payload:

```json
{
  "products": [
    { "id": "<productId1>", "quantity": 2 },
    { "id": "<productId2>", "quantity": 1 }
  ],
  "delivery": {
    "condition": "Delivery",
    "express": false,
    "address": {
      "state": "CA",
      "city": "Los Angeles",
      "street": "Main St",
      "house": 10,
      "zipCode": "90028"
    }
  }
}
```

Rules:
- Uses same product validations as order create/update:
  - unique ids
  - existing products
  - quantity limits from settings
- `delivery` is optional.

Success shape:

```json
{
  "Pricing": {
    "totalPrice": 100,
    "products": { "subtotal": 70, "linesCount": 2, "unitsCount": 3 },
    "delivery": {
      "price": 30,
      "pricingTier": "same_state",
      "isExpress": false,
      "lineCount": 2,
      "estimatedDays": 3,
      "estimatedDate": "2026-05-04T10:00:00.000Z",
      "availableFromDate": null,
      "pickupByDate": null,
      "breakdown": { "basePerLine": 15, "expressExtraPerLine": 0 }
    }
  },
  "IsSuccess": true,
  "ErrorMessage": null
}
```

For pickup delivery response:
- `price = 0`
- `pricingTier = "pickup"`
- `isExpress = false`
- `availableFromDate` and `pickupByDate` are filled from `settings.shipping.pickup.policy`.

## Status Contract (`PUT /api/orders/:orderId/status`)

Payload (allowed values only):

```json
{
  "status": "Draft | In Process | Canceled"
}
```

Rules:
- `In Process` requires:
  - current order status in `Draft | In Process`
  - non-null `delivery`
  - `deliveryStatus = Scheduled`
- `Canceled` requires:
  - current order status in `Draft | In Process`
  - `deliveryStatus` in `Not Scheduled | Scheduled`
  - no product with `received = true`
- `Draft` (reopen) allowed only from `Canceled`; backend clears `delivery` and sets `deliveryStatus = Not Scheduled`.
- `Completed` cannot be set by this endpoint.

## Receive Contract (`POST /api/orders/:orderId/receive`)

Payload:

```json
{
  "products": ["<productId1>", "<productId2>"]
}
```

Rules:
- `products` is an array of product `_id` values to mark as received.
- Each id must reference a non-received line in the order.
- Duplicate ids are rejected (`400`).
- `products.length` must be between `1` and number of order lines.
- Route allowed only when:
  - `status = In Process`
  - `deliveryStatus` in `Scheduled | Partially Delivered`
- Partial receive by quantity is not supported (line-level receive only).

Results:
- Partial receive:
  - `status = In Process`
  - `deliveryStatus = Partially Delivered`
- Full receive:
  - `status = Completed`
  - `deliveryStatus = Delivered`

## Export Contract (`POST /api/orders/export`)

Allowed `fields`:
- `status`, `deliveryStatus`, `total_price`, `delivery`, `customer`, `products`, `assignedManager`, `createdOn`

When `delivery` is selected, export includes:
- `delivery.condition`
- `delivery.price`
- `delivery.pricingTier`
- `delivery.schedule.estimatedDate`
- `delivery.schedule.availableFromDate`
- `delivery.schedule.pickupByDate`
- `delivery.schedule.express`
- `delivery.address.state`
- `delivery.address.city`
- `delivery.address.street`
- `delivery.address.house`
- `delivery.address.apartment`
- `delivery.address.zipCode`

## Common Response Envelope

- Success:
  - `{ Order, IsSuccess: true, ErrorMessage: null }`
  - `{ Pricing, IsSuccess: true, ErrorMessage: null }`
  - list/export-specific payload
- Failure:
  - `{ IsSuccess: false, ErrorMessage }`

## History entries

Each `history[]` entry stores a snapshot of the order at the moment the change was made, including delivery snapshot (`price`, `pricingTier`, `schedule`) when delivery exists.

## Important Frontend Notes

- Use both `status` and `deliveryStatus`.
- Keep one line per product id in order editor.
- `quantity` default `1`, clamp by `settings.order.maxProductQuantityInOrder`.
- Delivery estimate and pickup window come from backend-calculated snapshot, not from UI-computed dates.
