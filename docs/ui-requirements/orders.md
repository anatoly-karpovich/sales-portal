# Orders Module - UI Requirements

> Scope: handle the entire lifecycle of sales orders, including creation, filtering, export, delivery scheduling, receiving, assignment, commenting, and cancellation/reopen flows.

## Quick Facts

| Aspect | Details |
| --- | --- |
| Entry points | `#/orders`, `#/orders/{id}` |
| APIs | `/api/orders`, `/api/orders/:id`, `/api/orders/:id/status`, `/api/orders/:id/delivery`, `/api/orders/:id/receive`, `/api/orders/:id/assign-manager/:managerId`, `/api/orders/:id/unassign-manager`, `/api/orders/:id/comments`, `/api/orders/:id/comments/{commentId}`, `/api/settings` |
| Status model | Order status: `Draft / In Process / Completed / Canceled`; Delivery status: `Not Scheduled / Scheduled / Partially Delivered / Delivered` |
| Success copy | "Order was successfully created/updated/canceled/processed/reopened", "Delivery was successfully saved", "Products were successfully received", "Manager was successfully assigned/unassigned", "Comment was successfully posted/deleted" |
| Error copy | "Unable to create an order. Please try again later.", "No products found. Please add one before creating an order.", "Unable to assign manager. Please try again later.", etc. |

## List View

| Element | Description |
| --- | --- |
| Header | Title plus `Create Order` button. Clicking loads customers and products in parallel; spinner stays on the button until both succeed. Missing data raises the appropriate toaster copy. |
| Toolbar | Search, status filters dialog (order + delivery statuses), export dialog (CSV/JSON + fields). |
| Table | Columns Order Number (`_id`), Customer Email, Price (`$`), Delivery Date, Status, Assigned Manager, Created On. Sortable by configured fields. |
| Row actions | Details navigate to `#/orders/{id}`. `Reopen` appears only for canceled orders. |
| Empty state | "No records found." when search/filters are active and no rows match; "No orders created yet." when the base dataset is empty. |
| Pagination | Auto-adjust when page boundaries are exceeded after mutations. |

### Filters and Export
- Filters are split into two independent groups:
  - `status[]` (order status),
  - `deliveryStatus[]` (delivery status).
- Chips are prefixed:
  - `Search: ...`,
  - `Order: ...`,
  - `Delivery: ...`.
- Export supports filtered/all and selected fields.

## Create Order Modal

| Section | Rules |
| --- | --- |
| Customer | Searchable selection list. Required. |
| Products | Must contain at least one row; duplicates are not allowed by backend contract. |
| Total price | Calculated automatically whenever selections change. |
| Buttons | `Create` (disabled until valid) and `Cancel`. |

- Dialog opens only after lightweight prechecks confirm at least one customer and one product exists.
- On submit: disable cancel, show spinner on `Create`, send `POST /api/orders`, show success toast, then refresh list.

## Order Details Layout

| Block | Content |
| --- | --- |
| Header | Back link, order number, assigned manager (or "Click to select manager"), summary metrics, and action buttons (Cancel/Process/Refresh/Reopen depending on state). |
| Manager controls | Pencil opens assignment modal; `X` button opens unassign confirmation. |
| Customer section | Read-only fields; edit pencil appears while order is Draft. |
| Product section | Accordion per product. Draft shows edit pencil; In Process + valid delivery states show `Receive` flow. |
| Tabs | Delivery, Order History, Comments. |

### Delivery Management
- Schedule/edit is available only for `Draft` orders (`Not Scheduled` -> `Schedule`, `Scheduled` -> edit).
- `Location: Home/Other` is used for `Delivery` condition.
- **Delivery condition**
  - State: dropdown (US states),
  - City: text input,
  - Street/House/Apartment/Zip Code: editable for `Other`, read-only for `Home` (customer address).
- **Pickup condition**
  - State dropdown is built from `settings.delivery.pickupLocations` keys.
  - City dropdown depends on selected state and uses only `isActive: true` locations.
  - `street/house/apartment/zipCode` are read-only and auto-filled from selected pickup location.
  - Save is disabled when selected pickup state has no available active cities.
- Zip Code is masked and validated as `12345` or `12345-6789`.
- Apartment is optional.
- Saving calls `POST /api/orders/{id}/delivery` and shows success toast.

### Receiving Flow
- Available only when:
  - `status = In Process`,
  - `deliveryStatus in [Scheduled, Partially Delivered]`.
- `Receive` switches products section into checkbox mode (Select All, per-product checkboxes, Save, Cancel).
- Saving posts selected product IDs to `/api/orders/{id}/receive`.
- Backend derives next state:
  - partial receive -> `In Process + Partially Delivered`,
  - full receive -> `Completed + Delivered`.

### Tabs

| Tab | Behavior |
| --- | --- |
| Delivery | Shows scheduled data and edit/schedule actions based on status gates. |
| Order History | Timeline with per-action diffs, including delivery address fields (`state/city/street/house/apartment/zipCode`). |
| Comments | Textarea with inline validation (1-250 chars, no `<`/`>`). `Create` stays disabled until valid. Existing comments show text, author fallback, timestamp, and delete icon (`DELETE /api/orders/{id}/comments/{commentId}`). |

## Backend Summary

| Action | Endpoint / Method |
| --- | --- |
| Fetch list | `GET /api/orders?search&status&deliveryStatus&sortField&sortOrder&page&limit` |
| Create order | `POST /api/orders` |
| Get details | `GET /api/orders/:id` |
| Update customer/products | `PATCH /api/orders/:id` |
| Change status | `PUT /api/orders/:id/status` |
| Assign manager | `PUT /api/orders/:id/assign-manager/:managerId` |
| Unassign manager | `PUT /api/orders/:id/unassign-manager` |
| Schedule or edit delivery | `POST /api/orders/:id/delivery` |
| Receive products | `POST /api/orders/:id/receive` |
| Manage comments | `POST /api/orders/:id/comments`, `DELETE /api/orders/:id/comments/:commentId` |

## Notifications and UX Guardrails
- Success toasts listed above must appear after each action.
- Failures should use descriptive copy (e.g., "No customers found. Please add one before creating an order.").
- If order state becomes stale during mutation, page should refresh details and show warning toast.
- Refer to `docs/ui-requirements/orders-flow.md` for transition map used in QA planning.
