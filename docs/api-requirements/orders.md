# Orders Module - API Requirements

> Purpose: define order contracts for lifecycle, delivery, pricing, receive, manager assignment, and comments.

## Quick Facts

| Aspect | Details |
| --- | --- |
| Base path | `/api/orders` |
| Auth | Required |
| Pagination limits | `limit` clamped to `10..100` |
| Product line contract | `{ productId, variantId, quantity }` |
| Receive contract | `{ productId, variantId }[]` |
| Product availability | only `Active` product + `Active` variant can be ordered |

## Status Enums

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

## Inventory Reservation Contract

- `Reservation` is the canonical source of reserved quantity while order is in reservation-driven stages.
- Reservation document represents active reservation aggregate for one `orderId`.
- On `In Process` transition reservation is released (removed), and reserved stock impact is removed.
- On cancel/reopen/edit flows reservation may be removed/recreated; reserved stock is recalculated from reservation documents.
- On `Canceled -> Draft` reopen:
  - product snapshots are rebuilt from current product/variant data;
  - product/variant must exist and be `Active`;
  - reservation is recreated with `Admin Draft` TTL in current manager-authenticated flow;
  - if reopen validation/reservation fails, status remains `Canceled`.
- Inventory `reserved/available/summary` response fields are derived read-model values, not persisted canonical state.

## Endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/orders` | Paginated/sorted/filtered list. |
| GET | `/api/orders/:orderId` | Detailed order. |
| POST | `/api/orders` | Create order. |
| PATCH | `/api/orders/:orderId` | Update customer/products (Draft only). |
| POST | `/api/orders/:orderId/products` | Add one product line (Draft only). |
| PATCH | `/api/orders/:orderId/products` | Replace one product line (Draft only). |
| DELETE | `/api/orders/:orderId/products` | Delete one product line (Draft only). |
| PATCH | `/api/orders/:orderId/customer/:customerId` | Replace customer (Draft only). |
| DELETE | `/api/orders/:orderId` | Delete order (`204`). |
| POST | `/api/orders/export` | Export orders (`csv` or `json`). |
| POST | `/api/orders/pricing` | Calculate products + delivery/pickup pricing. |
| PUT | `/api/orders/:orderId/status` | Update order status. |
| PATCH | `/api/orders/:orderId/delivery` | Create/edit delivery (Draft only). |
| PATCH | `/api/orders/:orderId/pickup` | Create/edit pickup (Draft only). |
| POST | `/api/orders/:orderId/receive` | Mark order lines as received. |
| POST | `/api/orders/:orderId/comments` | Add comment. |
| DELETE | `/api/orders/:orderId/comments/:commentId` | Delete comment (`204`). |
| PUT | `/api/orders/:orderId/assign-manager/:managerId` | Assign manager. |
| PUT | `/api/orders/:orderId/unassign-manager` | Unassign manager (Draft only). |

## Order Product Line Contracts

Create/Update/Pricing:

```json
{
  "productId": "64f100000000000000000001",
  "variantId": "64f100000000000000000101",
  "quantity": 2
}
```

Receive:

```json
{
  "products": [
    {
      "productId": "64f100000000000000000001",
      "variantId": "64f100000000000000000101"
    }
  ]
}
```

Rules:
- `productId + variantId` pair must be unique inside request;
- `variantId` must belong to `productId`;
- line quantity: `1..settings.order.maxProductQuantityInOrder`;
- line `unitPrice` is snapshotted from variant price when line is added.
- add line (`POST /api/orders/:orderId/products`) returns `409` if the same `productId + variantId` already exists in order.
- replace line (`PATCH /api/orders/:orderId/products`) returns `409` if target `to.productId + to.variantId` already exists in another line.
- delete line (`DELETE /api/orders/:orderId/products`) removes full line by `productId + variantId`; deleting the last line is forbidden (`400`).
- all line/customer patch endpoints are Draft-only.

## Order Response Line Item (`GET /api/orders`)

```json
{
  "product": { "_id": "string", "name": "string" },
  "variant": { "_id": "string" },
  "unitPrice": 799.99,
  "quantity": 2,
  "received": false
}
```

## Order Details Line Item (`GET /api/orders/:orderId`)

```json
{
  "productId": "64f100000000000000000001",
  "variantId": "64f100000000000000000101",
  "manufacturer": "Apple",
  "unitPrice": 799.99,
  "quantity": 2,
  "name": "iPhone 15",
  "attributes": {
    "color": "Black",
    "storage": "128 GB"
  },
  "received": false,
  "imageUrl": "https://cdn.example.com/products/iphone-15-black.png"
}
```

Notes:
- order details use a persisted product snapshot from the order document (no live product join required);
- order list/export keep the list-oriented line references (`product._id`, `variant._id`) in response/export columns.
- on reopen (`Canceled -> Draft`), product snapshots in order lines are refreshed from current product/variant values.

## Order Details Inventory Reservation (`GET /api/orders/:orderId`)

`Order` response includes computed `inventoryReservation` block:

```json
{
  "summary": {
    "state": "Temporary Lock",
    "expiresAt": "2026-05-18T12:34:56.000Z",
    "type": "Admin Draft"
  },
  "lines": [
    {
      "productId": "64f100000000000000000001",
      "variantId": "64f100000000000000000101",
      "orderedQuantity": 5,
      "reservedQuantity": 2,
      "directOrderQuantity": 3,
      "state": "Partially Reserved"
    }
  ]
}
```

Summary state:
- `Temporary Lock` when active reservation has `expiresAt`;
- `Processing Lock` when active reservation exists and `expiresAt = null`;
- `Consumed` when no active reservation and order is `Completed`;
- `Released` when no active reservation and order is `Canceled`;
- `No Active Lock` otherwise.

Line-level state:
- `Fully Reserved` when `reservedQuantity === orderedQuantity`;
- `Partially Reserved` when `0 < reservedQuantity < orderedQuantity`;
- `Direct Order` when `reservedQuantity === 0`, `directOrderQuantity > 0`, and inventory variant allows selling out of stock;
- `No Active Lock` as fallback when reservation is missing/inconsistent for a line.
- `Consumed` when order is `Completed` and no active reservation (terminal line state; split is restored from `Sale` adjustments for this order line);
- `Released` when order is `Canceled` and no active reservation (terminal line state; `directOrderQuantity = 0`).

Partially delivered behavior:
- for lines with `received=true`, split is derived from `Sale` adjustments of this order line and line state is `Consumed`;
- for lines with `received=false`, split is derived from active reservation items.

Notes:
- backend returns only canonical state fields (`state`, `type`, `expiresAt`) and quantities;
- UI label mapping (for example `Temporary Lock -> Reserved (Temporary)`) is frontend-owned;
- reservation data is composed dynamically from `Reservation` + `Inventory` and is not stored in `Order`.

## Manager Assignment Rules

- `PUT /api/orders/:orderId/status` with target `In Process` auto-assigns current performer when `assignedManager` is empty.
- Auto-assign appends history before processing entry: first `Manager Assigned`, then `Order processing started`.
- `PUT /api/orders/:orderId/unassign-manager` is allowed only for `Draft` orders.

## Order Notification Side Effects

- On `POST /api/orders`, `newOrder` notification is created for the authenticated creator.

## Export Contract (`POST /api/orders/export`)

Allowed fields:
- `status`, `deliveryStatus`, `total_price`, `delivery`, `customer`, `products`, `assignedManager`, `createdOn`.

`products` export must include both `product._id` and `variant._id`.
