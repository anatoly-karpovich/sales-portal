# Products Module - UI Requirements

> Purpose: provide one operational workspace for catalog products, including list/search/filter/delete, create flow with variants, and inline edit on product details.

## Quick Facts

| Aspect | Details |
| --- | --- |
| Entry points | `#/products`, `#/products/add`, `#/products/{id}` |
| APIs | `/api/products`, `/api/products/:id`, `/api/products/:id/status`, `/api/products/:id/attributes/order`, `/api/products/:id/variants`, `/api/products/:id/variants/:variantId`, `/api/products/:id/variants/:variantId/status` |
| Shared widgets | Search toolbar, filters dialog, filter chips, data table, export dialog, pagination, confirmation dialog |
| Success copy | "Product was successfully created/updated/deleted" |
| Error copy | "Unable to update products. Please try again later.", API-specific fallback copy |

## Products List (`#/products`)

### Layout
- Header with title `Products List` and `+ Add Product` button.
- Utility row with search, filters, export, and chips.
- Data table + pagination.

### Table
- Columns: `Name`, `Price`, `Manufacturer`, `Status`, `Variants`, `Created On`, `Actions`.
- Sortable columns: `Name`, `Price`, `Manufacturer`, `Status`, `Variants`, `Created On`.
- `Name` cell includes a thumbnail (`36x36`) on the left and product name on the right.
  - Image source: product `imageUrl`.
  - Fallback when empty: default asset `no-image-product.jpeg`.
- Status color mapping:
  - `Active` -> `primary.main`
  - `Archived` -> `warning.main`
  - `Draft` -> `text.primary`

### List Actions
- `Details` navigates to `#/products/{id}`.
- `Delete` opens confirm dialog (`Yes, Delete` / `Cancel`) and refetches list on success.

### Filters and Chips
- Filters dialog sections (single expanded accordion at a time):
  - `Manufacturers`
  - `Product Status`
  - `Price` (`Min Price`, `Max Price`)
- Price validation: `min <= max` when both values are set.
- Chips prefixes:
  - `Search:`
  - `Manufacturer:`
  - `Status:`
  - `Price:`

### Empty States
- With active criteria: `No records found.`
- Without criteria and no data: `No products created yet.`

## Create Product (`#/products/add`)

### Form Composition
- Single create page with semantic sections:
  - `Parent product`
  - `Product category`
  - `Attributes`
  - `Variants`
- Back link: `Products`.
- Header chip: `Draft Product`.

### Parent Product
- Fields:
  - `Name` (required, `3-40`, letters/numbers/single spaces).
  - `Manufacturer` (required, source: `settings.catalog.manufacturers`).
  - `Parent image URL` (optional, must be valid `http(s)` URL when provided).
  - `Description` (optional multiline).

### Category
- Category is required.
- Category selector supports only leaf assignment.
- If categories/manufacturers are unavailable, create flow is blocked with warning state.

### Attributes and Variants
- Attributes are optional.
- Attribute names must be unique and non-empty.
- Attribute values are deduplicated and normalized.
- Variants can be added manually (`Add One Variant`) or generated (`Generate All Combinations`).
- Each variant requires:
  - valid attribute combination;
  - `Price > 0` with up to 2 decimals;
  - optional valid `http(s)` image URL.
- Save is disabled until parent/category/variants pass validation.

### Submit
- Primary action: `Save Product`.
- On success, redirect to `#/products`.

## Product Details (`#/products/{id}`)

### Header
- Back link to `#/products`.
- Product title + status chip + activate/archive action.
- Meta: manufacturer, category path, created/updated dates.
- Actions:
  - `Manage Inventory` -> `#/inventory/{id}`
  - `Delete Product`

### Sectioned Inline Editing
- `Product info`: inline edit mode for parent fields (`name`, `manufacturer`, `description`, `imageUrl`).
- `Category`: inline edit mode for category reassignment.
- `Attributes & Variants`: inline edit modes for:
  - bulk attributes/variants editor;
  - single variant editor.
- Unsaved changes in edit modes use discard confirmation dialog.

### Read-only Rendering Rules
- Parent image is displayed in details with fallback to `no-image-product.jpeg`.
- In `Attributes & Variants` read-only mode:
  - attributes are rendered above variant cards;
  - each variant card displays image on the left and text content on the right;
  - variant image uses own `imageUrl` when provided;
  - otherwise variant image falls back to parent image (which itself falls back to default).

### Variant Operations
- Toggle variant status (`Active`/`Archived`).
- Edit single variant (`price`, `attributes`, optional `imageUrl`).
- Delete variant (blocked when only one variant remains).
- Bulk save updates variants and (when changed) attributes.
- For `Active`/`Archived` products, `Add Variant` is available in read-only variants section:
  - button is disabled when all attribute combinations already exist;
  - on click, one inline `New Variant` card appears (`attributes`, `price`, `imageUrl`);
  - new card is initialized with the first available attribute combination that does not exist yet;
  - save sends `POST /api/products/:id/variants` with exactly one variant payload item;
  - frontend blocks save for duplicate combination using case-insensitive normalized comparison (`trim + lower-case`).
- Only one inline variant editor is allowed at a time (new variant card or existing single variant editor).

Status-specific edit guards:
- `Draft` setup flow keeps existing full-edit behavior.
- `Active`/`Archived` products:
  - in `Product info` edit mode, `name` and `manufacturer` are read-only; only `description` and `imageUrl` are editable;
  - parent patch is limited to `category`, `description`, `imageUrl`;
  - attributes can be reordered via drag-and-drop and saved through `PATCH /api/products/:id/attributes/order`;
  - bulk attributes/variants editor (full replace mode) is unavailable;
  - variant patch is limited to `price` and `imageUrl`; attributes remain read-only for existing variants;
  - variant status is updated only via dedicated status endpoint;
  - guarded structure-changing variant operations are allowed:
    - add variant as single-item operation while missing combinations remain;
    - delete variant with confirm dialog and frontend guard that last variant cannot be deleted.

## Backend Contracts Used by UI

| Method | Endpoint | Usage |
| --- | --- | --- |
| GET | `/api/products` | List with search/filter/sort/pagination |
| GET | `/api/products/:id` | Product details |
| POST | `/api/products` | Create product with attributes/variants |
| PATCH | `/api/products/:id` | Update parent/category fields |
| PATCH | `/api/products/:id/attributes/order` | Reorder product attributes (no definition changes) |
| PATCH | `/api/products/:id/status` | Activate/archive product |
| PUT | `/api/products/:id/variants` | Replace full variants set (and optional attributes) |
| POST | `/api/products/:id/variants` | Add variants (single-item add for `Active`/`Archived`) |
| PATCH | `/api/products/:id/variants/:variantId` | Patch single variant |
| PATCH | `/api/products/:id/variants/:variantId/status` | Toggle single variant status |
| DELETE | `/api/products/:id/variants/:variantId` | Delete variant |
| DELETE | `/api/products/:id` | Delete product |

## UX Guardrails
- Keep destructive actions behind confirmation dialogs.
- Keep save actions disabled on invalid payloads or unchanged draft.
- Keep pagination stable after deletions (auto-step back from empty page when needed).
- Category links from product details should open `#/categories?selectedId=<categoryId>` and preselect that node.
