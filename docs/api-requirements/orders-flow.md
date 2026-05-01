# Orders Lifecycle - API Transition Requirements

> Purpose: provide exact backend transition rules for `status` and `delivery.status`.

## Status Dimensions

Order status (`status`):
- `Draft`
- `In Process`
- `Completed`
- `Canceled`

Delivery status (`delivery.status`):
- `Draft`
- `Delivery Scheduled`
- `Pickup Scheduled`
- `Partially Delivered`
- `Delivered`

## Initial State

On `POST /api/orders`:
- `status = Draft`
- `delivery.status = Draft`
- `delivery` is prefilled from customer address with `condition=Delivery`, `express=false`

## Transition Matrix

| From | To | Trigger | Hard requirements |
| --- | --- | --- | --- |
| `Draft + Draft` | `Draft + Delivery Scheduled` | `POST /api/orders/:orderId/delivery` | payload `condition=Delivery` |
| `Draft + Draft` | `Draft + Pickup Scheduled` | `POST /api/orders/:orderId/delivery` | payload `condition=Pickup` |
| `Draft + Delivery Scheduled/Pickup Scheduled` | `In Process + same delivery status` | `PUT /api/orders/:orderId/status` with `{ status: "In Process" }` | existing delivery with scheduled status |
| `In Process + Delivery Scheduled/Pickup Scheduled` | `In Process + Partially Delivered` | `POST /api/orders/:orderId/receive` (subset) | receive route allowed only for `In Process` with scheduled or partially delivered status |
| `In Process + Delivery Scheduled/Pickup Scheduled` | `Completed + Delivered` | `POST /api/orders/:orderId/receive` (all positions) | all positions become received |
| `In Process + Partially Delivered` | `Completed + Delivered` | `POST /api/orders/:orderId/receive` (remaining positions) | same receive endpoint |
| `Draft/In Process` + `Draft/Delivery Scheduled/Pickup Scheduled` | `Canceled` | `PUT /api/orders/:orderId/status` with `{ status: "Canceled" }` | blocked if any product already received |
| `Canceled + any delivery status` | `Draft + Draft` | `PUT /api/orders/:orderId/status` with `{ status: "Draft" }` | delivery is reset to default customer-address draft snapshot |

## Explicitly Forbidden / Blocked Cases

- `Completed` cannot be set directly via status endpoint.
- `POST /api/orders/:orderId/delivery` is blocked outside `Draft`.
- `POST /api/orders/:orderId/receive` is blocked unless:
  - `status = In Process`
  - `delivery.status in Delivery Scheduled | Pickup Scheduled | Partially Delivered`
- Cancel is blocked when:
  - `delivery.status` is `Partially Delivered` or `Delivered`
  - or at least one product position has `received = true`
