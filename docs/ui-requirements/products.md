# Products Module - UI Requirements

> Purpose: give operations teams one workspace for the product catalog so they can browse, search, filter, and run CRUD flows with clear feedback.

## Quick Facts

| Aspect | Details |
| --- | --- |
| Entry points | `#/products`, `#/products/add`, `#/products/{id}/edit` |
| APIs | `/api/products`, `/api/products/:id` |
| Shared widgets | Header actions, search + chips, filter modal, Bootstrap table, confirmation modal |
| Success copy | "Product was successfully created/updated/deleted" |
| Error copy | "Failed to create product", "Unable to update products. Please try again later.", etc. |

## Page Anatomy

| Block | Description | Notes |
| --- | --- | --- |
| Header strip | Title plus `+ Add Product` button linking to the add page | Button stays primary-styled down to mobile widths |
| Utility row | Search bar, Filter button, chip container | Search limited to 40 chars; filter opens manufacturer list (Apple...Tesla) |
| Data table | Columns Name, Price, Manufacturer, Created On | All columns sortable via shared table state |
| Row actions | Details, Edit, Delete | Icon buttons with tooltips; Delete always opens confirmation modal |
| Pagination | Standard controls under the table | If a page empties (after delete), step back and refetch |

## Key Interactions

### Searching and Filtering
- Search button stays disabled until the input has text. Submitting stores the query in `state.search.products`, renders a removable chip, clears the input, and calls `getSortedProducts`.
- Filter modal toggles manufacturer checkboxes. Applied filters show as chips and translate to repeated `manufacturer` query params.
- Chips can be removed without immediate network calls; the UI keeps state in sync and fetches only when the active filters change.

### Table Actions
- **Details** opens the Product Details modal (read-only fields, formatted timestamps, Edit shortcut).
- **Edit** navigates to `#/products/{id}/edit`.
- **Delete** shows the standard confirmation modal ("Yes, Delete" / "Cancel"). Confirmed deletes disable both buttons, show a spinner, send the request, then display success/error toasts.

### Create and Edit Forms

| Field | Validation | Notes |
| --- | --- | --- |
| Name | 3-40 alphanumeric chars with single spaces | Required |
| Manufacturer | Dropdown (Apple...Tesla) | Required |
| Price | 1-99999 | Numeric text input |
| Amount | 0-999 | Numeric text input |
| Notes | Up to 250 chars, no `<` or `>` | Textarea |

- Responsive two-column layout with inline validation. Invalid inputs highlight the field and disable the Save button.
- Add view buttons: `Save New Product`, `Clear all`, and a breadcrumb-style back link.
- Edit view reuses the form, renames the primary CTA to `Save Changes`, and adds `Delete Product`. Save stays disabled until the user changes a value.

## Loading and Empty States
- The table container shows a spinner overlay while data loads.
- When no records match, show "No records created yet" while keeping chips visible so filters can be removed quickly.

## Backend Contracts

| Method | Endpoint | Notes |
| --- | --- | --- |
| GET | `/api/products` | Accepts `search`, repeated `manufacturer`, `sortField` (`name|price|manufacturer|createdOn`), `sortOrder` (`asc|desc`), `page` (`>= 1`), `limit` (`10-100`). Responds with `{ Products, total, page, limit, sorting }`. |
| GET | `/api/products/:id` | Used for edit/details views. |
| POST | `/api/products` | Creates a product. |
| PUT | `/api/products/:id` | Updates fields. |
| DELETE | `/api/products/:id` | Returns `204` on success. |

All mutations return `{ IsSuccess, ErrorMessage }`; surface this output via toasts using the success/error copy above.

## UX Guardrails
- Keep Save buttons disabled whenever validation fails or the form matches the stored data.
- After deleting, recalculate pagination so the list never shows an empty page.
- Edit view should always rely on the same Delete confirmation flow as the list to provide a consistent experience.
