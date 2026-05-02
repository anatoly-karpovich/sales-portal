# Orders Module - API Requirements

> Purpose: define all order-related REST contracts including lifecycle, delivery, pricing, receive, manager assignment, and comments.

## Quick Facts

| Aspect | Details |
| --- | --- |
| Base path | `/api/orders` |
| Auth | Required |
| Core status field | `status` |
| Delivery status field | `delivery.status` (filter key remains `deliveryStatus`) |
| Pagination limits | `limit` clamped to `10..100` on list endpoints |
| Create/update product count | At least `1` unique product. Per-line `quantity` is `1..settings.order.maxProductQuantityInOrder`. Duplicate product ids are rejected. |

## Status Enums (exact values)

`status`:
- `Draft`
- `In Process`
- `Completed`
- `Canceled`

`delivery.status`:
- `Draft`
- `Delivery Planned`
- `Pickup Planned`
- `Delivery Scheduled`
- `Pickup Scheduled`
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
| POST | `/api/orders/pricing` | Calculate products + delivery/pickup pricing without creating/updating an order. |
| PUT | `/api/orders/:orderId/status` | Update order status (restricted payload). |
| PATCH | `/api/orders/:orderId/delivery` | Create/edit delivery by address (Draft only). |
| PATCH | `/api/orders/:orderId/pickup` | Create/edit pickup by `pickupLocationId` (Draft only). |
| POST | `/api/orders/:orderId/receive` | Mark products as received. |
| POST | `/api/orders/:orderId/comments` | Add comment. |
| DELETE | `/api/orders/:orderId/comments/:commentId` | Delete comment (`204`). |
| PUT | `/api/orders/:orderId/assign-manager/:managerId` | Assign manager. |
| PUT | `/api/orders/:orderId/unassign-manager` | Unassign manager. |

## List Contract (`GET /api/orders`)

### Query params

| Param | Type | Notes |
| --- | --- | --- |
| `search` | string | Matches order id, customer name/email, `status`, `delivery.status`, total price. |
| `status` | string or string[] | Filter by order status values. |
| `deliveryStatus` | string or string[] | Filter by `delivery.status` values. |
| `sortField` | `createdOn \| total_price \| status` | Defaults to `createdOn`. |
| `sortOrder` | `asc \| desc` | Defaults to `asc` in controller. |
| `page` | string number | Minimum effective page is `1`. |
| `limit` | string number | Clamped to `10..100`. |

### Delivery DTO additions

In all order responses except export, backend returns computed:

```json
{
  "delivery": {
    "isOverdue": false,
    "overdueByDays": 0
  }
}
```

Rules:
- overdue is calculated only when `order.status = In Process`;
- for delivery: due date source is `delivery.schedule.dueDate`;
- for pickup: due date source is `delivery.schedule.pickupByDate`;
- `overdueByDays` is date-based integer (`today - dueDate` in days, min `0`).

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
- On create backend immediately builds default draft delivery (`condition=Delivery`, `express=false`, customer address, `delivery.status=Draft`).
- On update when customer changes backend resets delivery to new customer address and `delivery.status=Draft`.

## Delivery/Pickup Contracts

### `PATCH /api/orders/:orderId/delivery`

Payload:

```json
{
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

### `PATCH /api/orders/:orderId/pickup`

Payload:

```json
{
  "pickupLocationId": "64f100000000000000000001"
}
```

Rules:
- both endpoints are allowed only when `status = Draft`;
- pickup address is never accepted manually;
- pickup location is resolved only from `settings.shipping.pickup.locations`;
- pickup returns `404` when location does not exist or is inactive.

On success:
- delivery endpoint sets `delivery.status = Delivery Planned`;
- pickup endpoint sets `delivery.status = Pickup Planned`.

## Schedule Contract

Delivery schedule:

```json
{
  "express": true,
  "estimatedDays": 2,
  "estimatedDate": "2026-05-06",
  "startsAt": null,
  "dueDate": null
}
```

Pickup schedule:

```json
{
  "readyInDays": 1,
  "holdForDays": 5,
  "availableFromDate": "2026-05-05",
  "pickupByDate": "2026-05-10",
  "startsAt": null
}
```

Notes:
- date fields use `YYYY-MM-DD`;
- in Draft these are preview values (for pickup preview dates are returned in `availableFromDate/pickupByDate`);
- `startsAt` is `null` until `Draft -> In Process`;
- final dates are calculated only on `Draft -> In Process`.

## Pricing Contract (`POST /api/orders/pricing`)

Payload supports three modes:

1. Delivery pricing:

```json
{
  "products": [{ "id": "<productId>", "quantity": 1 }],
  "delivery": {
    "express": true,
    "address": {
      "state": "NY",
      "city": "New York",
      "street": "Broadway",
      "house": 1,
      "zipCode": "10001"
    }
  }
}
```

2. Pickup pricing:

```json
{
  "products": [{ "id": "<productId>", "quantity": 1 }],
  "pickup": { "pickupLocationId": "64f100000000000000000001" }
}
```

3. Products only (no delivery component):

```json
{
  "products": [{ "id": "<productId>", "quantity": 1 }]
}
```

Rules:
- `delivery` and `pickup` cannot be sent together;
- if neither is provided, total equals products subtotal.

## Status Contract (`PUT /api/orders/:orderId/status`)

Payload:

```json
{
  "status": "Draft | In Process | Canceled"
}
```

Rules:
- `In Process` is allowed only for `Draft` orders;
- repeated `In Process` for already `In Process` returns `400`;
- `Draft -> In Process` requires:
  - `delivery.status in Delivery Planned | Pickup Planned`;
  - schedule finalization at this moment:
    - `startsAt` by `settings.shipping.processing.cutoffHour`;
    - delivery: `dueDate = startsAt + estimatedDays`, `estimatedDate = dueDate`;
    - pickup: `availableFromDate = startsAt + readyInDays`, `pickupByDate = availableFromDate + holdForDays`;
  - delivery status switches to `Delivery Scheduled` / `Pickup Scheduled`.
- `Canceled` requires:
  - current order status in `Draft | In Process`;
  - `delivery.status in Draft | Delivery Planned | Pickup Planned | Delivery Scheduled | Pickup Scheduled`;
  - no product with `received = true`.

## Receive Contract (`POST /api/orders/:orderId/receive`)

Rules:
- Route allowed only when:
  - `status = In Process`
  - `delivery.status in Delivery Scheduled | Pickup Scheduled | Partially Delivered`
- Partial receive result:
  - `status = In Process`
  - `delivery.status = Partially Delivered`
- Full receive result:
  - `status = Completed`
  - `delivery.status = Delivered`

## Export Contract (`POST /api/orders/export`)

Allowed `fields`:
- `status`, `deliveryStatus`, `total_price`, `delivery`, `customer`, `products`, `assignedManager`, `createdOn`

`deliveryStatus` export field value is taken from `delivery.status`.

`isOverdue`/`overdueByDays` are not part of export contract.
