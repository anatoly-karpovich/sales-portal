# Orders Module - API Requirements

> Purpose: define all order-related REST contracts including lifecycle, delivery, receive, manager assignment, and comments.

## Quick Facts

| Aspect | Details |
| --- | --- |
| Base path | `/api/orders` |
| Auth | Required |
| Core status field | `status` |
| Delivery status field | `deliveryStatus` |
| Pagination limits | `limit` clamped to `10..100` on list endpoints |
| Create/update product count | `1..5` required product ids |

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
| PUT | `/api/orders/:orderId` | Update customer/products (Draft only). |
| DELETE | `/api/orders/:orderId` | Delete order (`204`). |
| POST | `/api/orders/export` | Export orders (`csv` or `json`). |
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
### `PUT /api/orders/:orderId`

Payload:

```json
{
  "customer": "<customerId>",
  "products": ["<productId1>", "<productId2>"]
}
```

Rules:
- `products.length` must be `1..5`.
- `customer` and each `product` must exist.
- Update route is allowed only while order is `Draft`.

## Delivery Contract (`POST /api/orders/:orderId/delivery`)

Payload:

```json
{
  "finalDate": "2026-05-01T12:00:00.000Z",
  "condition": "Delivery",
  "address": {
    "country": "USA",
    "city": "New York",
    "street": "Broadway",
    "house": 1,
    "flat": 1
  }
}
```

Rules:
- Allowed only when `status = Draft`.
- Validates date and address fields.
- On success, backend sets `deliveryStatus = Scheduled`.

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
- Request product ids must belong to the order.
- `products.length` must be between `1` and `5` by schema.
- Route allowed only when:
  - `status = In Process`
  - `deliveryStatus` in `Scheduled | Partially Delivered`

Results:
- Partial receive:
  - `status = In Process`
  - `deliveryStatus = Partially Delivered`
- Full receive (all products received):
  - `status = Completed`
  - `deliveryStatus = Delivered`

## Comments Contract

### `POST /api/orders/:orderId/comments`

Payload:

```json
{ "comment": "text" }
```

Rules:
- Required.
- Effective length `1..250`.
- Invalid body returns `400`.

### `DELETE /api/orders/:orderId/comments/:commentId`

- Returns `204` on success.
- Returns `400` if comment is missing in order context.

## Manager Assignment Contract

### `PUT /api/orders/:orderId/assign-manager/:managerId`
- `managerId` manager must exist.
- Manager account must have role `USER` or `ADMIN`.

### `PUT /api/orders/:orderId/unassign-manager`
- Clears `assignedManager`.

## Export Contract (`POST /api/orders/export`)

Payload:

```json
{
  "format": "csv",
  "fields": ["status", "deliveryStatus", "total_price"],
  "filters": {
    "search": "",
    "status": ["Draft"],
    "deliveryStatus": ["Scheduled"],
    "page": 1,
    "limit": 20,
    "sortField": "createdOn",
    "sortOrder": "desc"
  }
}
```

Allowed `fields`:
- `status`, `deliveryStatus`, `total_price`, `delivery`, `customer`, `products`, `assignedManager`, `createdOn`

## Common Response Envelope

- Success:
  - `{ Order, IsSuccess: true, ErrorMessage: null }`
  - or list/export-appropriate payload
- Failure:
  - `{ IsSuccess: false, ErrorMessage }`

## Important Frontend Notes

- Use both `status` and `deliveryStatus` in UI logic.
- Do not expect `Partially Received` or `Received` as order status values anymore.
- History entries include snapshots of both statuses (`status`, `deliveryStatus`).
