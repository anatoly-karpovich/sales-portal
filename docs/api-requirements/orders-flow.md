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
- `Delivery Planned`
- `Pickup Planned`
- `Delivery Scheduled`
- `Pickup Scheduled`
- `Partially Delivered`
- `Delivered`

## Initial State

On `POST /api/orders`:
- `status = Draft`
- `delivery.status = Draft`
- `delivery` is prefilled from customer address with `condition=Delivery`, `express=false`
- delivery schedule is preview-only (`startsAt` is `null`; pickup preview dates may be filled and are not final)

## Transition Matrix

| From | To | Trigger | Hard requirements |
| --- | --- | --- | --- |
| `Draft + Draft` | `Draft + Delivery Planned` | `PATCH /api/orders/:orderId/delivery` | valid delivery payload |
| `Draft + Draft` | `Draft + Pickup Planned` | `PATCH /api/orders/:orderId/pickup` | active `pickupLocationId` in settings |
| `Draft + Delivery Planned` | `In Process + Delivery Scheduled` | `PUT /api/orders/:orderId/status` (`In Process`) | finalize schedule by cutoff, calculate `startsAt` and `dueDate` |
| `Draft + Pickup Planned` | `In Process + Pickup Scheduled` | `PUT /api/orders/:orderId/status` (`In Process`) | finalize schedule by cutoff, calculate `startsAt`, `availableFromDate`, `pickupByDate` |
| `In Process + Delivery Scheduled/Pickup Scheduled` | `In Process + Partially Delivered` | `POST /api/orders/:orderId/receive` (subset) | receive allowed for scheduled/partial statuses |
| `In Process + Delivery Scheduled/Pickup Scheduled` | `Completed + Delivered` | `POST /api/orders/:orderId/receive` (all positions) | all positions become received |
| `In Process + Partially Delivered` | `Completed + Delivered` | `POST /api/orders/:orderId/receive` (remaining positions) | same receive endpoint |
| `Draft/In Process` + `Draft/Delivery Planned/Pickup Planned/Delivery Scheduled/Pickup Scheduled` | `Canceled` | `PUT /api/orders/:orderId/status` (`Canceled`) | blocked if any product already received |
| `Canceled + any delivery status` | `Draft + Draft` | `PUT /api/orders/:orderId/status` (`Draft`) | delivery resets to default draft snapshot |

## Schedule Finalization

Configured in `settings.shipping.processing.cutoffHour`.

Rule:
- if `serverNow.hour >= cutoffHour` -> `startsAt = tomorrow`
- else -> `startsAt = today`

All date values use `YYYY-MM-DD`.

Delivery finalization:
- `dueDate = startsAt + estimatedDays`
- `estimatedDate = dueDate`

Pickup finalization:
- `availableFromDate = startsAt + readyInDays`
- `pickupByDate = availableFromDate + holdForDays`

## Explicitly Forbidden / Blocked Cases

- `Completed` cannot be set directly via status endpoint.
- `PATCH /api/orders/:orderId/delivery` and `PATCH /api/orders/:orderId/pickup` are blocked outside `Draft`.
- `PUT ... status=In Process` is blocked when order already has `status=In Process` (returns `400`).
- `POST /api/orders/:orderId/receive` is blocked unless:
  - `status = In Process`
  - `delivery.status in Delivery Scheduled | Pickup Scheduled | Partially Delivered`

## Reservation-to-Inventory Rules

- Reservation document/items are the canonical source of reserved stock.
- Transition `Draft -> In Process` releases/removes reservation and removes reserve impact.
- Transition to `Canceled` releases/removes reservation by flow rules.
- Expired reservation is released/removed by cron flow.
- Inventory-level `reserved`, `available`, and aggregate statuses are derived read-model values and must be calculated from reservation documents.
