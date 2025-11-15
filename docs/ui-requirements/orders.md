# Orders Module – UI Requirements

> **Scope:** handle the full lifecycle of sales orders: creation, filtering, assignment, delivery scheduling, receiving, commenting, exporting, and cancellation/reopen flows.

## Quick Facts

| Aspect | Details |
| --- | --- |
| Entry points | `#/orders`, `#/orders/{id}`, `#/orders/{id}/schedule-delivery`, `#/orders/{id}/edit-delivery` |
| APIs | `/api/orders`, `/api/orders/:id`, `/api/orders/:id/status`, `/api/orders/:id/delivery`, `/api/orders/:id/receive`, `/api/orders/:id/assign-manager/:managerId`, `/api/orders/:id/unassign-manager`, `/api/orders/:id/comments`, `/api/orders/:id/comments/{commentId}` |
| Statuses | Draft, In Process, Partially Received, Received, Canceled |
| Success copy | “Order was successfully created/updated/canceled…”, “Delivery was successfully saved”, etc. |
| Error copy | “Unable to create an order. Please try again later.”, “No products found…”, “Unable to assign manager…”, etc. |

## List View

| Element | Description |
| --- | --- |
| Header | Page title + `Create Order` button. Clicking fetches customers + products in parallel; spinner persists until both succeed. Missing data surfaces toasts (“No products found…”). |
| Toolbar | Search (shared behavior), Filter (status chips), Export (CSV/JSON modal with field selector). |
| Table | Columns: Order Number (mapped `_id`), Customer Email, Price (`$`-prefixed), Delivery Date, Status, Assigned Manager, Created On. Each column sortable. |
| Row actions | Details link to `#/orders/{id}`. “Reopen” action appears only for canceled orders. |
| Pagination | Auto-adjust when current page empties after deletions. |

### Filters & Export
- Status filter modal lists Draft, In Process, Partially Received, Received, Canceled. Chips show active filters.
- Export modal: users choose CSV/JSON, filtered vs all data, and fields per module before calling `exportCsv`/`exportJson`.

## Create Order Modal

| Section | Rules |
| --- | --- |
| Customer select | Shows names, emails via tooltip. Required. |
| Product list | At least one row; up to 5 rows. First row’s delete button hidden until two rows exist. |
| Total price | Sums selected products dynamically. |
| Buttons | `Create` (disabled until form valid), `Cancel`. |

- Adding/removing products recalculates totals and toggles the “Add Product” button visibility.
- On submit: disable cancel button, show spinner on primary, call `POST /api/orders`, show “Order was successfully created”, reload list.
- Validation issues show toast “Failed to create an order. Please try again later.”; network/auth errors go through `handleApiErrors`.

## Order Details Layout

| Block | Content |
| --- | --- |
| Header | Back link, order number, assigned manager (link or “Click to select manager”), summary pill (status, total price, delivery, created date), action buttons (Cancel/Process/Refresh/Reopen when applicable). |
| Manager controls | Pencil opens assignment modal; “X” opens remove confirmation. |
| Customer section | Read-only fields with optional edit pencil while status is Draft. |
| Product section | Accordion per product. Draft status shows edit pencil; In Process / Partially Received surfaces `Receive` button. |
| Tabs | Delivery, Order History, Comments. |

### Delivery Management
- Schedule view allows Delivery vs Pickup, location selection, date picker, and address inputs (prefilled from customer data in “Home” mode).
- Save CTA stays disabled until `validateScheduleDeliveryForm` passes.
- Editing delivery uses the same layout with prefilled data; Cancel returns to details.
- Saving hits `/api/orders/{id}/delivery` and shows “Delivery was successfully saved”.

### Receiving Flow
- Available in In Process or Partially Received states.
- “Receive” toggles the products card into checkbox mode (Select All + per-product checkboxes, Save button, Cancel button).
- Saving sends selected IDs to `/api/orders/{id}/receive`. Backend updates status to Partially Received or Received; UI refreshes and shows notifications/history updates.

### Tabs

| Tab | Behavior |
| --- | --- |
| Delivery | Shows scheduled data or placeholder fields. Includes button to schedule/edit depending on status. |
| Order History | Columns: Action, Performed By, Date & Time. Uses `ORDER_HISTORY_ACTIONS`. |
| Comments | Textarea with inline validation (1–250 chars, no `<`/`>`), `Create` button disabled until valid, list of existing comments (text, author, timestamp, delete icon). Create/delete calls `/api/orders/{id}/comments` endpoints and rerenders the tab. |

## Backend Summary

| Action | Endpoint / Method |
| --- | --- |
| Fetch list | `GET /api/orders?search&status&sortField&sortOrder&page&limit` |
| Create | `POST /api/orders` |
| Get details | `GET /api/orders/:id` |
| Update customer/products | `PUT /api/orders/:id` |
| Change status | `PATCH /api/orders/:id/status` |
| Assign manager | `PATCH /api/orders/:id/assign-manager/:managerId` |
| Unassign manager | `PATCH /api/orders/:id/unassign-manager` |
| Schedule/edit delivery | `PATCH /api/orders/:id/delivery` |
| Receive products | `POST /api/orders/:id/receive` |
| Comments | `POST /api/orders/:id/comments`, `DELETE /api/orders/:id/comments/:commentId` |

Each mutation returns `{ IsSuccess, ErrorMessage }`, plus domain payloads where applicable.

## Notifications & UX Guardrails
- Success messaging: “Order was successfully created/updated/canceled/in process/reopened”, “Delivery was successfully saved”, “Products were successfully received”, “Manager was successfully assigned/unassigned”, “Comment was successfully posted/deleted”.
- Error messaging: “Unable to create an order. Please try again later.”, “No products found. Please add one before creating an order.”, etc.
- After actions complete, check whether the user is still on the details page. If yes, rerender locally; otherwise use `setRoute` to navigate to the updated view.

For a deeper look at status transitions, see `docs/ui-requirements/orders-flow.md`.
