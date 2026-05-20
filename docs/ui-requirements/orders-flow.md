# Order Lifecycle Flow - Draft to Completed

This guide defines UI gates and expected transitions using the current two-axis model:
- `status`: `Draft | In Process | Completed | Canceled`
- `delivery.status`: `Draft | Delivery Planned | Pickup Planned | Delivery Scheduled | Pickup Scheduled | Partially Delivered | Delivered`

Use this matrix for regression and manual QA.

## Initial State

On create (`POST /api/orders`):
- `status = Draft`
- `delivery` exists immediately (non-null snapshot)
- `delivery.status = Draft`
- in manager-authenticated admin flow, creator is auto-assigned as `assignedManager`

## Transition Matrix

| From | To | Requirements | Trigger |
| --- | --- | --- | --- |
| `Draft + Draft` | `Draft + Delivery Planned` | Valid delivery payload with `condition=Delivery`. | `PATCH /api/orders/{id}/delivery` |
| `Draft + Draft` | `Draft + Pickup Planned` | Valid delivery payload with `condition=Pickup`. | `PATCH /api/orders/{id}/pickup` |
| `Draft + Delivery Planned/Pickup Planned` | `In Process + same delivery status` | Processing confirmed in UI; if `assignedManager` is empty, backend auto-assigns current performer. | `PUT /api/orders/{id}/status` with `status=In Process` |
| `In Process + Delivery Scheduled/Pickup Scheduled` | `In Process + Partially Delivered` | Subset of pending products received. | `POST /api/orders/{id}/receive` |
| `In Process + Delivery Scheduled/Pickup Scheduled` | `Completed + Delivered` | All pending products received in one save. | `POST /api/orders/{id}/receive` |
| `In Process + Partially Delivered` | `Completed + Delivered` | Remaining pending products received. | `POST /api/orders/{id}/receive` |
| `Draft/In Process` + `Draft/Delivery Planned/Pickup Planned/Delivery Scheduled/Pickup Scheduled` | `Canceled` | No received product positions. | `PUT /api/orders/{id}/status` with `status=Canceled` |
| `Canceled + any delivery.status` | `Draft + Draft` | Reopen confirmed. Backend rebuilds default delivery snapshot. | `PUT /api/orders/{id}/status` with `status=Draft` |

## Explicitly Blocked Cases

- `Completed` cannot be set directly through status endpoint.
- `Process` is blocked unless `delivery.status` is `Delivery Planned` or `Pickup Planned`.
- `Cancel` is blocked when:
  - `delivery.status` is `Partially Delivered` or `Delivered`, or
  - at least one product is already received.
- `PATCH /delivery` and `PATCH /pickup` are blocked outside `Draft`.
- `POST /receive` is blocked unless:
  - `status = In Process`
  - `delivery.status in [Delivery Scheduled, Pickup Scheduled, Partially Delivered]`

## UI Gate Expectations

1. `Process` button:
- visible for `Draft`
- enabled only for `delivery.status in [Delivery Planned, Pickup Planned]`

2. `Cancel` button:
- visible for `Draft | In Process`
- enabled only for `delivery.status in [Draft, Delivery Planned, Pickup Planned, Delivery Scheduled, Pickup Scheduled]`

3. `Reopen` button:
- visible only for `Canceled`

4. Delivery schedule/edit controls:
- `Draft + Draft` -> `Schedule`
- `Draft + Delivery Planned/Pickup Planned` -> edit pencil
- all other combinations -> no delivery edit actions

5. Delivery form behavior:
- payload is `condition + address + express?`
- pricing preview (`total`, `delivery price`, schedule dates) is debounced via `POST /api/orders/pricing`
- pricing preview is displayed as compact metric cards
- save becomes available after pricing response is received and form is valid
- preview failure shows warning, but save stays available

6. Receive mode:
- visible only for `In Process` with `Delivery Scheduled`, `Pickup Scheduled`, or `Partially Delivered`
- available only if at least one product is still pending

7. Delivery history diff:
- always includes anchor rows: `Delivery type`, `Delivery price`, `Address`
- additionally includes only changed type-specific rows for the current delivery type:
  - `Delivery`: `Express`, `Estimated date`
  - `Pickup`: `Available from`, `Pickup by`

## Testing Notes

- Validate both axes after each mutation (`status` and `delivery.status`).
- Validate auto-assign on create: newly created order should already have `assignedManager`.
- Validate processing fallback auto-assign: for legacy draft orders without assignee, `Process` should set current performer as assignee.
- Validate list filtering by request key `deliveryStatus` with new values.
- Validate history actions include both delivery and pickup scheduling/editing events.
- Validate reopen resets to `Draft + Draft` with rebuilt delivery snapshot.
