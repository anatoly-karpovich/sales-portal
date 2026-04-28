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
| Create/update product count | At least `1` unique product. Per-product `quantity` is `1..settings.order.maxProductQuantityInOrder`. Duplicate product ids are rejected. |

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
  "products": [
    { "id": "<productId1>", "quantity": 3 },
    { "id": "<productId2>", "quantity": 1 }
  ]
}
```

Rules:
- `products` must contain at least `1` item.
- `id` values must be unique inside `products` (duplicates are rejected with `400`).
- Each `quantity` is an integer in `1..settings.order.maxProductQuantityInOrder` (current default `10`). Out of range returns `400` with the offending product id.
- `customer` and each `product` must exist (404 with the missing id otherwise).
- Update route is allowed only while order is `Draft`.
- On update, `unitPrice` is preserved for products that were already in the order (snapshot at first add). For products newly added during update, `unitPrice` is taken from the current `Product.price` at update time. `quantity` is always taken from the request payload. `received` is preserved for already-present positions and defaults to `false` for newly added ones.

### Response product structure

In API responses, every entry in `Order.products` has the shape:

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

`name` and `manufacturer` are joined from the live `Product` collection on every read. `unitPrice` is the price snapshot taken at the moment the position was first added to the order (kept stable across updates).

### Total price

`total_price` is computed as `Σ unitPrice × quantity` across all `products` entries.

## Delivery Contract (`POST /api/orders/:orderId/delivery`)

Payload:

```json
{
  "finalDate": "2026-05-01T12:00:00.000Z",
  "condition": "Delivery",
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
- Validates date and address fields.
- `state` must be one of 50 US 2-letter state codes.
- `zipCode` must match `^\d{5}(-\d{4})?$`.
- `apartment` is optional, when provided must be integer `>= 1`.
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
- `products` is an array of product `_id` values to mark as received.
- Each id must reference a product position in the order, and that position must currently have `received = false`. Otherwise `400`.
- Duplicate ids in the payload are rejected with `400`.
- `products.length` must be between `1` and the number of product positions in the order.
- Route allowed only when:
  - `status = In Process`
  - `deliveryStatus` in `Scheduled | Partially Delivered`
- Partial receive of a single product position is **not** supported. A position is either fully received (`received = true`) or not at all — `quantity` does not affect the receive operation.

Results:
- Partial receive (some positions still `received = false`):
  - `status = In Process`
  - `deliveryStatus = Partially Delivered`
- Full receive (every position is `received = true`):
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

When `delivery` is selected, export includes:
- `delivery.finalDate`
- `delivery.condition`
- `delivery.address.state`
- `delivery.address.city`
- `delivery.address.street`
- `delivery.address.house`
- `delivery.address.apartment`
- `delivery.address.zipCode`

When `products` is selected, each position is flattened into the following columns (one set per index `i`, starting from `1`):

- `products[i].product._id`
- `products[i].product.name`
- `products[i].product.manufacturer`
- `products[i].unitPrice`
- `products[i].quantity`
- `products[i].received`

## Common Response Envelope

- Success:
  - `{ Order, IsSuccess: true, ErrorMessage: null }`
  - or list/export-appropriate payload
- Failure:
  - `{ IsSuccess: false, ErrorMessage }`

## History entries

Each `history[]` entry stores a snapshot of the order at the moment the change was made:

```json
{
  "status": "Draft",
  "deliveryStatus": "Not Scheduled",
  "products": [
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
  ],
  "customer": "<customerId>",
  "delivery": null,
  "total_price": 29.97,
  "changedOn": "2026-04-26T10:00:00.000Z",
  "action": "<one of ORDER_HISTORY_ACTIONS>",
  "performer": { "...managerSnapshot" },
  "assignedManager": null
}
```

Notes:
- `history[].products` carries the **enriched** snapshot (`name`, `manufacturer` are persisted at write-time). The frontend does not need to re-resolve product details from the `Product` collection when rendering history.
- `history[].customer` is an id reference (not a full snapshot).
- `history` is ordered newest-first.

## Important Frontend Notes

- Use both `status` and `deliveryStatus` in UI logic.
- Do not expect `Partially Received` or `Received` as order status values anymore.
- History entries include snapshots of both statuses (`status`, `deliveryStatus`) and the enriched product snapshot.
- A product can appear at most once per order. UI must collapse same-product additions into a single row with editable `quantity`.
- `quantity` UI control should default to `1` and clamp at `settings.order.maxProductQuantityInOrder` from `GET /api/settings`.
