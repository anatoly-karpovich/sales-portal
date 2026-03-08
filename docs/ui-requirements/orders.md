# Orders Module - UI Requirements

> Scope: handle the entire lifecycle of sales orders, including creation, filtering, export, delivery scheduling, receiving, assignment, commenting, and cancellation/reopen flows.

## Quick Facts

| Aspect | Details |
| --- | --- |
| Entry points | `#/orders`, `#/orders/{id}`, `#/orders/{id}/schedule-delivery`, `#/orders/{id}/edit-delivery` |
| APIs | `/api/orders`, `/api/orders/:id`, `/api/orders/:id/status`, `/api/orders/:id/delivery`, `/api/orders/:id/receive`, `/api/orders/:id/assign-manager/:managerId`, `/api/orders/:id/unassign-manager`, `/api/orders/:id/comments`, `/api/orders/:id/comments/{commentId}` |
| Statuses | Draft, In Process, Partially Received, Received, Canceled |
| Success copy | "Order was successfully created/updated/canceled/in process/reopened", "Delivery was successfully saved", "Products were successfully received", "Manager was successfully assigned/unassigned", "Comment was successfully posted/deleted" |
| Error copy | "Unable to create an order. Please try again later.", "No products found. Please add one before creating an order.", "Unable to assign manager. Please try again later.", etc. |

## List View

| Element | Description |
| --- | --- |
| Header | Title plus `Create Order` button. Clicking loads customers and products in parallel; spinner stays on the button until both succeed. Missing data raises the appropriate toaster copy. |
| Toolbar | Search (shared chip behavior), Filter (status chips), Export (CSV/JSON modal with field selector). |
| Table | Columns Order Number (`_id`), Customer Email, Price (`$`), Delivery Date, Status, Assigned Manager, Created On. All sortable. |
| Row actions | Details navigate to `#/orders/{id}`. `Reopen` appears only for canceled orders. |
| Pagination | Auto-adjust when deletions empty the current page. |

### Filters and Export
- Status filter modal lists Draft, In Process, Partially Received, Received, Canceled and renders chips for active filters.
- Export modal lets users choose CSV vs JSON, filtered vs all rows, and which fields to include before calling `exportCsv`/`exportJson`.

## Create Order Modal

| Section | Rules |
| --- | --- |
| Customer | Dropdown showing names (emails via tooltip). Required. |
| Products | Must contain at least one row, up to five. First row's delete button stays hidden until a second row exists. |
| Total price | Calculated automatically whenever selections change. |
| Buttons | `Create` (disabled until valid) and `Cancel`. |

- Adding or removing rows recalculates totals and hides/shows the "Add Product" button accordingly.
- On submit: disable cancel, show spinner on `Create`, send `POST /api/orders`, show "Order was successfully created", then reload the list.
- Validation failures show "Failed to create an order. Please try again later." Network/auth failures route through `handleApiErrors`.

## Order Details Layout

| Block | Content |
| --- | --- |
| Header | Back link, order number, assigned manager (or "Click to select manager"), summary metrics (status, total price, delivery date, created date), and action buttons (Cancel/Process/Refresh/Reopen depending on status). |
| Manager controls | Pencil opens assignment modal; `X` button opens unassign confirmation. |
| Customer section | Read-only fields; edit pencil appears while order is Draft. |
| Product section | Accordion per product. Draft shows edit pencil; In Process/Partially Received show `Receive` button. |
| Tabs | Delivery, Order History, Comments. |

### Delivery Management
- Schedule view includes Delivery vs Pickup toggle, location select (Home vs Other), date picker, and address inputs (prefilled in Home mode).
- Save button stays disabled until `validateScheduleDeliveryForm` passes.
- Editing reuses the same layout with prefilled values; Cancel returns to details.
- Saving hits `/api/orders/{id}/delivery` and surfaces "Delivery was successfully saved".

### Receiving Flow
- Available when status is In Process or Partially Received.
- `Receive` switches the products section into checkbox mode (Select All, per-product checkboxes, Save, Cancel).
- Saving posts selected product IDs to `/api/orders/{id}/receive`. Backend updates status (Partially Received or Received) and history; UI refreshes automatically.

### Tabs

| Tab | Behavior |
| --- | --- |
| Delivery | Shows scheduled data with a button to schedule/edit delivery based on status. |
| Order History | Columns Action, Performed By, Date & Time. Populated from `ORDER_HISTORY_ACTIONS`. |
| Comments | Textarea with inline validation (1-250 chars, no `<`/`>`). `Create` stays disabled until valid. Existing comments show text, author (defaults to "AQA User"), timestamp, and delete icon that calls `DELETE /api/orders/{id}/comments/{commentId}`. |

## Backend Summary

| Action | Endpoint / Method |
| --- | --- |
| Fetch list | `GET /api/orders?search&status&sortField&sortOrder&page&limit` |
| Create order | `POST /api/orders` |
| Get details | `GET /api/orders/:id` |
| Update customer/products | `PUT /api/orders/:id` |
| Change status | `PATCH /api/orders/:id/status` |
| Assign manager | `PATCH /api/orders/:id/assign-manager/:managerId` |
| Unassign manager | `PATCH /api/orders/:id/unassign-manager` |
| Schedule or edit delivery | `PATCH /api/orders/:id/delivery` |
| Receive products | `POST /api/orders/:id/receive` |
| Manage comments | `POST /api/orders/:id/comments`, `DELETE /api/orders/:id/comments/:commentId` |

Every mutation returns `{ IsSuccess, ErrorMessage }` along with any domain payloads needed by the UI.

## Notifications and UX Guardrails
- Success toasts listed above must appear after each action. Failures should use descriptive copy (e.g., "No customers found. Please add one before creating an order.").
- After an action completes, check if the user remains on the details page. If yes, rerender in place; otherwise call `setRoute` to navigate to the updated view.
- Refer to `docs/ui-requirements/orders-flow.md` for the detailed status transition map used in QA planning.
