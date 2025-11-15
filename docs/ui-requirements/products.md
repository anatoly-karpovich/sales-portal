# Products Module – UI Requirements

> **Purpose:** give operations teams a single workspace for the product catalog: browse, search, filter, and perform CRUD safely with continuous feedback.

## Quick Facts

| Aspect | Details |
| --- | --- |
| Entry points | `#/products`, `#/products/add`, `#/products/{id}/edit` |
| API surface | `/api/products`, `/api/products/:id` |
| Shared UI | Header actions, search bar, chip filters, Bootstrap tables, confirmation modals |
| Success copy | “Product was successfully created/updated/deleted” |
| Error copy | “Failed to create product”, “Unable to update products. Please try again later.”, etc. |

## Page Anatomy

| Block | Description | Notes |
| --- | --- | --- |
| Header strip | Page title + `+ Add Product` CTA (links to add screen) | CTA keeps primary styling and is visible down to mobile widths. |
| Utility row | Search bar, Filter button, Chips container | Search limited to 40 chars; filters open manufacturer checkboxes (Apple…Tesla). |
| Data table | Columns: Name, Price, Manufacturer, Created On | All columns sortable; uses state-driven sort indicators and server sorting. |
| Row actions | Details, Edit, Delete | Icon buttons with tooltips. Delete opens confirmation modal. |
| Pagination | Standard controls injected under table | When current page becomes empty, auto-step back and refetch. |

## Key Interactions

### Searching & Filtering
- Search button is disabled until users type text; submitting saves the query to `state.search.products`, renders a removable chip, clears the input, and triggers `getSortedProducts`.
- Filter modal lets users toggle manufacturers. Applied filters appear as chips and are passed via repeated `manufacturer` query params.
- Chips can be removed without hitting the backend; the UI keeps state in sync and refreshes data only when needed.

### Table Actions
- **Details** – opens the Product Details modal (read-only fields, formatted timestamps, edit link).
- **Edit** – navigates to `#/products/{id}/edit`.
- **Delete** – shows the confirmation modal (“Yes, Delete” / “Cancel”). Accepting disables buttons, shows a spinner, fires the delete request, and then displays success/error toasts.

### Create & Edit Forms

| Field | Validation | Notes |
| --- | --- | --- |
| Name | 3–40 alphanumeric chars, single spaces | Required |
| Manufacturer | Dropdown (Apple…Tesla) | Required |
| Price | 1–99999 | Numeric text input |
| Amount | 0–999 | Numeric text input |
| Notes | ≤250 chars, disallow `<`/`>` | Textarea |

- Forms use a responsive two-column layout. Inline validation leverages shared helper functions to highlight invalid fields and disable the save button.
- Add view buttons: `Save New Product`, `Clear all`, plus breadcrumb-style back link.
- Edit view reuses the form, renames the CTA to `Save Changes`, and adds `Delete Product`. Save stays disabled while the form matches the stored record.

## Loading & Empty States
- Table container shows a spinner overlay while data loads.
- When no products match, render “No records created yet” with the chips row still visible so users can clear filters.

## Backend Contracts

| Method | Endpoint | Notes |
| --- | --- | --- |
| GET | `/api/products` | Accepts `search`, repeated `manufacturer`, `sortField` (`name|price|manufacturer|createdOn`), `sortOrder` (`asc|desc`), `page` (≥1), `limit` (10–100). Responds with `{ Products, total, page, limit, sorting }`. |
| GET | `/api/products/:id` | Used for edit/details. |
| POST | `/api/products` | Creates a product. |
| PUT | `/api/products/:id` | Updates fields. |
| DELETE | `/api/products/:id` | Returns `204` on success. |

All mutations return `{ IsSuccess, ErrorMessage }`; surface these through the toast system using the copy above.

## UX Guardrails
- Keep the add/edit CTAs disabled whenever validation fails or the form matches the persisted state.
- After deletions, ensure pagination recalculates so users are not left on empty pages.
- When editing, the Delete button always reuses the same confirmation flow as the list.
