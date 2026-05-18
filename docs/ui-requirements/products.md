# Products Module - UI Requirements

> Purpose: give operations teams one workspace for the product catalog so they can browse, search, filter, and run CRUD flows with clear feedback.

## Quick Facts

| Aspect | Details |
| --- | --- |
| Entry points | `#/products`, `#/products/add`, `#/products/{id}/edit` |
| APIs | `/api/products`, `/api/products/:id` |
| Shared widgets | Header actions, search, data table, export modal, pagination, confirmation modal |
| Success copy | "Product was successfully created/updated/deleted" |
| Error copy | "Failed to create product", "Unable to update products. Please try again later.", etc. |

## Page Anatomy

| Block | Description | Notes |
| --- | --- | --- |
| Header strip | Title plus `+ Add Product` button linking to the add page | Button stays primary-styled down to mobile widths |
| Utility row | Search bar, Filter button, prefixed chip container | Search limited to 40 chars; filters modal has accordions for manufacturers, product statuses, and price range |
| Data table | Columns Name, Price, Manufacturer, Status, Variants, Created On | Sortable columns: Name, Price, Manufacturer, Status, Variants, Created On |
| Row actions | Details, Edit, Delete | Icon buttons with tooltips; Delete always opens confirmation modal |
| Pagination | Standard controls under the table | If a page empties (after delete), step back and refetch |

## Key Interactions

### Searching and Filtering
- Search button stays disabled until the input has text. Submitting stores the query in `state.search.products`, renders chip `Search: <value>`, clears the input, and calls `getSortedProducts`.
- Products page uses dedicated filters modal with 3 accordion sections:
  - `Manufacturers` (multi-select checkboxes, source: `settings.catalog.manufacturers`);
  - `Product Status` (multi-select checkboxes: `Draft | Active | Archived`);
  - `Price` (`Min Price`, `Max Price`, decimal input with dot only).
- Only one accordion can be expanded at a time; selected counters are shown per section when values are selected.
- Price rules:
  - `min` and `max` can be used independently or together;
  - when both are provided, `min <= max` is required;
  - invalid range blocks `Apply`, marks both inputs as invalid, and shows helper validation text under inputs.
- Applied filters are represented as prefixed chips:
  - `Search: <value>`
  - `Manufacturer: <value>`
  - `Status: <value>`
  - `Price: >= $X`, `Price: <= $Y`, or `Price: $X - $Y`
- Chips removal updates local filter state and triggers refetch with the updated criteria.

### Table Actions
- **Details** opens the Product Details modal (read-only fields, formatted timestamps, Edit shortcut).
- **Edit** navigates to `#/products/{id}/edit`.
- **Delete** shows the standard confirmation modal ("Yes, Delete" / "Cancel"). Confirmed deletes disable both buttons, show a spinner, send the request, then display success/error toasts.

### Table Status Styling
- Status column is color-coded for quick scan:
  - `Active` -> blue (`primary.main`)
  - `Archived` -> yellow-ish (`warning.main`)
  - `Draft` -> neutral (`text.primary`)

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
- When search/filter criteria return zero rows, show "No records found." while keeping chips visible so filters can be removed quickly.
- When the product dataset is empty without active search/filters, show "No products created yet."

## Backend Contracts

| Method | Endpoint | Notes |
| --- | --- | --- |
| GET | `/api/products` | Accepts `search`, repeated `manufacturer`, repeated `status`, `minPrice`, `maxPrice`, `sortField` (`name|price|manufacturer|category|status|createdOn|variantsCount`), `sortOrder` (`asc|desc`), `page` (`>= 1`), `limit` (`10-100`). Responds with `{ Products, total, page, limit, sorting }`. |
| GET | `/api/products/:id` | Used for edit/details views. |
| POST | `/api/products` | Creates a product. |
| PUT | `/api/products/:id` | Updates fields. |
| DELETE | `/api/products/:id` | Returns `204` on success. |

All mutations return `{ IsSuccess, ErrorMessage }`; surface this output via toasts using the success/error copy above.

## UX Guardrails
- Keep Save buttons disabled whenever validation fails or the form matches the stored data.
- After deleting, recalculate pagination so the list never shows an empty page.
- Edit view should always rely on the same Delete confirmation flow as the list to provide a consistent experience.
- Product category selection must allow only leaf categories; non-leaf categories are visible but not selectable.
- Category links from product details should open `#/categories?selectedId=<categoryId>` and preselect that node in categories workspace.
- Product details view should provide a `Manage Inventory` action that opens `#/products/{id}/inventory`.
