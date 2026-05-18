# Inventory Module - UI Requirements

> Purpose: provide an operations workspace for monitoring stock by product and variant, with safe inline update flows for quantity adjustments and variant stock settings.

## Quick Facts

| Aspect | Details |
| --- | --- |
| Entry points | `#/inventory`, `#/products/{productId}/inventory` |
| APIs | `/api/inventory`, `/api/inventory/products/:productId`, `/api/inventory/adjustments`, `/api/inventory/products/:productId/variants/:variantId/settings` |
| Shared widgets | Search toolbar, filters dialog, filter chips, data table, pagination |
| Success copy | "Inventory was adjusted successfully.", "Variant settings were updated successfully." |

## Inventory List Page (`#/inventory`)

### Layout
- Header with page title `Inventory List`.
- Utility row with search input, filters trigger, and chips container.
- Inventory table with pagination.

### Table Columns
- `Product` (sortable by `product.name`)
- `Manufacturer` (sortable by `manufacturer`)
- `Product Status`
- `Inventory Status` (sortable by `inventoryStatus`)
- `Variants`
- `Low Stock`
- `Out Of Stock`
- `Updated On` (sortable by `updatedOn`)
- `Actions` (`Details`)

### Filters
- Search (text query)
- `Inventory Status` (multi-select)
- `Product Status` (multi-select)
- `Manufacturer` (multi-select)

### Filter UX Rules
- Filters dialog uses accordions; only one accordion can be expanded at a time.
- Section headers display `<N> selected` when that section has selected values.
- Applied chips are prefixed:
  - `Search: <value>`
  - `Inventory: <value>`
  - `Product: <value>`
  - `Manufacturer: <value>`

### Row Action
- `Details` opens product inventory details: `#/products/{productId}/inventory`.

## Inventory Details Page (`#/products/{productId}/inventory`)

### Header and Summary
- Back link to `#/inventory`.
- Product title with inventory status chip.
- Meta rows: manufacturer, category path, product status, created/updated timestamps.
- `View Product` action to `#/products/{productId}`.
- Summary cards:
  - `Inventory Status`
  - `Low Stock Variants`
  - `Out Of Stock Variants`
  - `Total Available`
  - `Total Quantity`
  - `Total Reserved`

### Variants Section
- Variant cards display:
  - variant title + status chips (`variant.status`, `variant.stockStatus`);
  - manufacturer and attribute chips;
  - available block;
  - metrics (`Quantity`, `Reserved`, `Threshold`, `Direct Order`).
- Per-variant actions:
  - `Adjust`
  - `Settings`

## Adjust Modal

### Current State Block
- Cards: `Quantity`, `Reserved`, `Available`.
- Use neutral outlined borders for all cards (no blue accent border on `Available`).

### Form Fields
- `Adjustment Type` options:
  - `Manual Increase`
  - `Manual Decrease`
  - `Manual Correction`
  - `Damage`
  - `Return`
- Quantity field label switches:
  - `Adjustment Amount` for increase/decrease/damage/return
  - `New Quantity` for `Manual Correction`
- Optional `Reason`
- Optional `Comment` with max length `250`

### Preview
- Preview cards:
  - `Quantity` (`before -> after`)
  - `Available` (`before -> after`)
  - `Reserved` (`before -> after`, currently unchanged by manual adjustment)
  - `Change` (`+N/-N`)
- Save must remain disabled for invalid payloads:
  - non-integer or non-positive quantity;
  - negative resulting quantity;
  - resulting quantity below reserved.

### Footer Buttons
- Button order: `Save Adjustment` first, then `Cancel`.

## Settings Modal

### Current State Block
- Cards: `Quantity`, `Reserved`, `Available`.
- Use neutral outlined borders for all cards (no blue accent border on `Available`).

### Form Fields
- `Low Stock Threshold` (integer `>= 0`)
- `Direct Order` (`Allowed` / `Blocked`)

### Preview
- Preview includes only:
  - `Threshold` (`before -> after`)
  - `Direct Order` (`before -> after`)
- `Available` is not shown as a preview card.
- Stock status after update is shown as text summary (`Stock Status After Update`).

### Footer Buttons
- Button order: `Save Settings` first, then `Cancel`.

## UX Guardrails
- Do not send invalid adjustments to API; block save client-side.
- Keep details and list state in sync after successful mutations:
  - update/invalidate details cache for the current product;
  - invalidate inventory list cache for status/count freshness.
- Preserve deterministic `data-testid` values for dialogs and variant actions.
