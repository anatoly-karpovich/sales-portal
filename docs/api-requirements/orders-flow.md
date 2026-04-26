# Orders Lifecycle - API Transition Requirements

> Purpose: provide exact backend transition rules for `status` and `deliveryStatus`.

## Status Dimensions

Order status (`status`):
- `Draft`
- `In Process`
- `Completed`
- `Canceled`

Delivery status (`deliveryStatus`):
- `Not Scheduled`
- `Scheduled`
- `Partially Delivered`
- `Delivered`

## Initial State

On `POST /api/orders`:
- `status = Draft`
- `deliveryStatus = Not Scheduled`
- `delivery = null`

## Transition Matrix

| From (status, deliveryStatus) | To | Trigger | Hard requirements |
| --- | --- | --- | --- |
| `Draft`, `Not Scheduled` | `Draft`, `Scheduled` | `POST /api/orders/:orderId/delivery` | Order must be `Draft`. |
| `Draft`, `Scheduled` | `In Process`, `Scheduled` | `PUT /api/orders/:orderId/status` with `{ status: "In Process" }` | Existing `delivery` + `deliveryStatus = Scheduled`. |
| `In Process`, `Scheduled` | `In Process`, `Partially Delivered` | `POST /api/orders/:orderId/receive` (subset of product positions) | Receive route allowed only in `In Process` with delivery status `Scheduled` or `Partially Delivered`. Received product positions get `received = true`; partial receive of a single position (by `quantity`) is not supported. |
| `In Process`, `Scheduled` | `Completed`, `Delivered` | `POST /api/orders/:orderId/receive` (all positions) | Every product position becomes `received = true`. |
| `In Process`, `Partially Delivered` | `Completed`, `Delivered` | `POST /api/orders/:orderId/receive` (remaining positions) | Same receive endpoint; reaches full completion. |
| `Draft` or `In Process` + `Not Scheduled` or `Scheduled` | `Canceled` | `PUT /api/orders/:orderId/status` with `{ status: "Canceled" }` | Cancellation is blocked if any product already has `received = true`. |
| `Canceled`, any | `Draft`, `Not Scheduled` | `PUT /api/orders/:orderId/status` with `{ status: "Draft" }` | Reopen allowed only from `Canceled`; backend clears `delivery`. |

## Explicitly Forbidden / Blocked Cases

- `Completed` cannot be set directly via status endpoint.
- `POST /api/orders/:orderId/delivery` is blocked outside `Draft`.
- `POST /api/orders/:orderId/receive` is blocked unless:
  - `status = In Process`
  - `deliveryStatus` in `Scheduled | Partially Delivered`
- Cancel is blocked when:
  - `deliveryStatus` is `Partially Delivered` or `Delivered`
  - at least one product position is already received (`received = true`)

## Status Endpoint Payload Scope

`PUT /api/orders/:orderId/status` accepts only:
- `Draft`
- `In Process`
- `Canceled`

`Completed` is system-derived from receive flow only.
