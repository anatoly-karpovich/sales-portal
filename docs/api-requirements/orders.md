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

## Endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/orders` | Paginated/sorted/filtered list. |
| GET | `/api/orders/:orderId` | Detailed order. |
| POST | `/api/orders` | Create order. |
| PATCH | `/api/orders/:orderId` | Update customer/products (Draft only). |
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
| PUT | `/api/orders/:orderId/unassign-manager` | Unassign manager. |

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

## Order Response Line Item

```json
{
  "product": { "_id": "string", "name": "string" },
  "variant": { "_id": "string" },
  "unitPrice": 799.99,
  "quantity": 2,
  "received": false
}
```

## Export Contract (`POST /api/orders/export`)

Allowed fields:
- `status`, `deliveryStatus`, `total_price`, `delivery`, `customer`, `products`, `assignedManager`, `createdOn`.

`products` export must include both `product._id` and `variant._id`.
