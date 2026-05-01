# Order Lifecycle Flow - Draft to Completed

This guide describes allowed order transitions and UI gates using the current two-axis state model:
- `status`: `Draft | In Process | Completed | Canceled`
- `deliveryStatus`: `Not Scheduled | Scheduled | Partially Delivered | Delivered`

Use this map for regression and E2E scenarios.

## Initial State

On create (`POST /api/orders`):
- `status = Draft`
- `deliveryStatus = Not Scheduled`
- `delivery = null`

## Transition Matrix

| From | To | Requirements | Trigger |
| --- | --- | --- | --- |
| `Draft + Not Scheduled` | `Draft + Scheduled` | Delivery payload is valid. | `POST /api/orders/{id}/delivery` |
| `Draft + Scheduled` | `In Process + Scheduled` | Operator confirms processing. | `PUT /api/orders/{id}/status` with `status=In Process` |
| `In Process + Scheduled` | `In Process + Partially Delivered` | Subset of pending products selected for receive. | `POST /api/orders/{id}/receive` |
| `In Process + Scheduled` | `Completed + Delivered` | All pending products received in one save. | `POST /api/orders/{id}/receive` |
| `In Process + Partially Delivered` | `Completed + Delivered` | Remaining pending products received. | `POST /api/orders/{id}/receive` |
| `Draft/In Process` + `Not Scheduled/Scheduled` | `Canceled` | No received product positions. | `PUT /api/orders/{id}/status` with `status=Canceled` |
| `Canceled + any deliveryStatus` | `Draft + Not Scheduled` | Reopen confirmed; delivery cleared by backend. | `PUT /api/orders/{id}/status` with `status=Draft` |

## Explicitly Blocked Cases

- `Completed` cannot be set manually through status endpoint.
- Process is blocked unless delivery exists and `deliveryStatus = Scheduled`.
- Cancel is blocked if:
  - `deliveryStatus` is `Partially Delivered` or `Delivered`,
  - or any product already has `received = true`.
- Delivery edit/schedule route is blocked outside `Draft`.
- Receive route is blocked unless:
  - `status = In Process`,
  - `deliveryStatus in [Scheduled, Partially Delivered]`.

## UI Gate Expectations

1. `Process` button:
- visible for `Draft`,
- enabled only when `deliveryStatus = Scheduled`.

2. `Cancel` button:
- visible only for `Draft | In Process`,
- enabled only when `deliveryStatus in [Not Scheduled, Scheduled]`.

3. `Reopen` button:
- visible only for `Canceled`.

4. Delivery edit/schedule actions:
- `Draft + Not Scheduled` -> `Schedule`,
- `Draft + Scheduled` -> edit pencil,
- all other combinations -> no delivery edit actions.
- Delivery payload and preview:
  - UI sends `condition + address + express?` (no `finalDate` field),
  - pricing preview (`total`, `delivery price`, schedule dates) is requested via `POST /api/orders/pricing` with debounce before save,
  - if preview request fails, show warning and do not block save.

5. Receive mode:
- visible only for `In Process` with `Scheduled` or `Partially Delivered`,
- available only when there are pending (not received) product positions.

## Testing Notes

- Validate both state axes after each mutation (`status` and `deliveryStatus`).
- Validate history entries after every transition (`Order created`, `Order processing started`, `Delivery Scheduled`, `Received`, `All products received`, `Order canceled`, `Order reopened`, etc.).
- Validate reopen always clears delivery and resets `deliveryStatus` to `Not Scheduled`.
