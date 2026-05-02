# Orders Module - UI Requirements

> Scope: handle full orders lifecycle in admin UI, including creation, filtering, export, delivery scheduling, receiving, manager assignment, comments, and cancel/reopen flows.

## Quick Facts

| Aspect | Details |
| --- | --- |
| Entry points | `#/orders`, `#/orders/{id}` |
| APIs | `/api/orders`, `/api/orders/:id`, `/api/orders/:id/status`, `/api/orders/:id/delivery`, `/api/orders/:id/receive`, `/api/orders/:id/assign-manager/:managerId`, `/api/orders/:id/unassign-manager`, `/api/orders/:id/comments`, `/api/orders/:id/comments/{commentId}`, `/api/orders/pricing`, `/api/settings` |
| Status model | Order status: `Draft / In Process / Completed / Canceled`; delivery status source: `order.delivery.status` |
| Delivery status values | `Draft`, `Delivery Scheduled`, `Pickup Scheduled`, `Partially Delivered`, `Delivered` |
| Filter key contract | Request key remains `deliveryStatus`, but values are matched against `delivery.status` |

## List View

| Element | Description |
| --- | --- |
| Header | Title plus `Create Order` button. Clicking performs lightweight customers/products existence checks and then opens create modal. |
| Toolbar | Search, filters dialog (`status` + `deliveryStatus`), export dialog (CSV/JSON + fields). |
| Table | Columns: Order Number, Customer Email, Price, Status, Delivery, Assigned Manager, Created On. Delivery column displays `order.delivery.status`. |
| Row actions | Details opens `#/orders/{id}`. `Reopen` is visible only for canceled orders. |
| Empty state | "No records found." for active criteria with no rows; "No orders created yet." for empty base dataset. |
| Pagination | Auto-adjusts when current page becomes out of range after mutations. |

### Filters and Export
- Filters are two independent arrays:
  - `status[]` for order status
  - `deliveryStatus[]` for delivery status
- Chips use prefixes:
  - `Search: ...`
  - `Order: ...`
  - `Delivery: ...`
- Export supports filtered/all modes and selected fields.
- Export field `deliveryStatus` is populated from `order.delivery.status`.

## Create Order Modal

| Section | Rules |
| --- | --- |
| Customer | Searchable selector, required. |
| Products | At least one row is required by UI and API. |
| Total price | Debounced preview via `POST /api/orders/pricing` after product changes. |
| Buttons | `Create` and `Cancel`; submit shows pending state. |

- Dialog opens only after prechecks confirm at least one customer and one product exist.
- After successful create, list is refreshed and success toast is shown.
- Backend returns non-null `delivery` snapshot immediately on create.

## Order Details Layout

| Block | Content |
| --- | --- |
| Header | Back link, order id, assigned manager controls, summary cards, status actions (`Cancel/Process/Reopen/Refresh` by gate). |
| Customer section | Read-only summary; edit is available only in `Draft`. |
| Products section | Read-only list; edit in `Draft`; receive mode in allowed in-process delivery statuses. |
| Tabs | Delivery, Order History, Comments. |

### Action Gates
- `Process` is visible for `Draft`; enabled only when `delivery.status` is `Delivery Scheduled` or `Pickup Scheduled`.
- `Cancel` is visible for `Draft` and `In Process`; enabled only when `delivery.status` is `Draft`, `Delivery Scheduled`, or `Pickup Scheduled`.
- `Receive` mode is available only when:
  - `status = In Process`
  - `delivery.status in [Delivery Scheduled, Pickup Scheduled, Partially Delivered]`
- `Reopen` is visible only for `Canceled`.

### Delivery Management
- `delivery` is always present in details payload.
- Draft delivery gates:
  - `Draft + delivery.status=Draft` -> show `Schedule`.
  - `Draft + delivery.status in [Delivery Scheduled, Pickup Scheduled]` -> show edit icon.
- Form payload remains `condition + address + express?`.
- `Express` is only for `Delivery`; for `Pickup` it is omitted.
- `Delivery` condition:
  - supports `Home/Other` location
  - `Home` uses customer address as read-only
  - `Other` allows manual address editing
- `Pickup` condition:
  - state/city options are loaded from `settings.shipping.pickup.locations`
  - only active pickup cities are selectable
  - street/house/apartment/zip are auto-filled and read-only
- Save button is enabled after pricing response is received and form remains valid.
- Pricing preview errors show warning but do not block save.

### Tabs

| Tab | Behavior |
| --- | --- |
| Delivery | Shows delivery snapshot and schedule/edit controls by gates. |
| Order History | Timeline with diffs, including delivery changes and pickup-specific actions. |
| Comments | Create/delete comments with inline validation (`1..250`, no `<`/`>`). |

## Backend Summary

| Action | Endpoint / Method |
| --- | --- |
| Fetch list | `GET /api/orders?search&status&deliveryStatus&sortField&sortOrder&page&limit` |
| Create order | `POST /api/orders` |
| Get details | `GET /api/orders/:id` |
| Update customer/products | `PATCH /api/orders/:id` |
| Pricing preview | `POST /api/orders/pricing` |
| Change status | `PUT /api/orders/:id/status` |
| Assign manager | `PUT /api/orders/:id/assign-manager/:managerId` |
| Unassign manager | `PUT /api/orders/:id/unassign-manager` |
| Schedule or edit delivery | `POST /api/orders/:id/delivery` |
| Receive products | `POST /api/orders/:id/receive` |
| Manage comments | `POST /api/orders/:id/comments`, `DELETE /api/orders/:id/comments/:commentId` |

## UX Guardrails
- Success toasts must be shown for successful domain actions.
- State-race errors should trigger details refresh and warning copy.
- Keep `deliveryStatus` query/export key names unchanged for API compatibility.
