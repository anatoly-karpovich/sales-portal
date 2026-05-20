# Admin Frontend: Shared Components Reuse Map

## Purpose
This document lists UI patterns that are good candidates for extraction/reuse in `admin-frontend` shared layer.

For each candidate:
- **From**: current implementation sources
- **How**: target shared component and expected API
- **Where to use**: pages/features to migrate

---

## 1) Unified Filter Action Bar

**From**
- `admin-frontend/src/components/shared/SearchToolbar.tsx`
- `admin-frontend/src/features/inventory/pages/InventoryHistoryPage.tsx` (header `Filter` action-only use case)

**How**
- Extend `SearchToolbar` with mode flags:
  - `showSearchInput?: boolean`
  - `showSearchButton?: boolean`
  - `showFilterButton?: boolean`
  - `showExportButton?: boolean`
- Keep backward compatibility with current default behavior.

**Where to use**
- Inventory History page (filter-only mode)
- Any future list/details page with partial toolbar actions

---

## 2) Generic Accordion Filters Dialog

**From**
- `admin-frontend/src/features/products/components/ProductsFiltersDialog.tsx`
- `admin-frontend/src/features/orders/components/OrdersFiltersDialog.tsx`
- `admin-frontend/src/features/inventory/components/InventoryFiltersDialog.tsx`
- `admin-frontend/src/features/inventory/components/InventoryHistoryFiltersDialog.tsx`

**How**
- Create `components/shared/AccordionFiltersDialog.tsx`
- Config-driven sections:
  - `checkbox-group` section
  - `text` section
  - `date-range` section
  - `select` section
- Shared shell: title row, close button, apply/clear footer, one-expanded-accordion behavior.

**Where to use**
- Products filters dialog
- Orders filters dialog
- Inventory list filters dialog
- Inventory history filters dialog

---

## 3) Details Header Block (Back + Title + Meta + Actions)

**From**
- `admin-frontend/src/features/inventory/pages/InventoryDetailsPage.tsx`
- `admin-frontend/src/features/inventory/pages/InventoryHistoryPage.tsx`
- `admin-frontend/src/features/products/components/details/ProductDetailsHeader.tsx`
- `admin-frontend/src/features/orders/components/OrderDetailsSummarySection.tsx` (same composition pattern)

**How**
- Create `components/shared/DetailsPageHeader.tsx`
- Slots/props:
  - back link (`to`, `label`)
  - title + optional chips
  - meta line
  - right actions (render prop or `actions` node)

**Where to use**
- Inventory Details
- Inventory History
- Product Details
- Candidate for other details-like pages

---

## 4) Selectable Outlined Card List (Sidebar/Chooser)

**From**
- `admin-frontend/src/features/inventory/pages/InventoryHistoryPage.tsx` (variants sidebar)
- Similar selectable card patterns in feature UIs (categories tree/rows can partially align visually)

**How**
- Create `components/shared/SelectableCardList.tsx`
- Input model:
  - `items: { id, title, subtitle? }[]`
  - `selectedId`
  - `onSelect`
- Built-in visual states:
  - outlined base
  - selected border accent
  - hover “lift” (`translateY(-1px)` + border shift)

**Where to use**
- Inventory History variants sidebar
- Future chooser panels and selection drawers

---

## 5) Outlined Section Shell / Border Hierarchy Helpers

**From**
- Border composition in:
  - `InventoryDetailsPage`
  - `InventoryHistoryPage`
  - Product/Order details sections

**How**
- Create lightweight wrappers:
  - `SectionShell` (outer outlined surface)
  - `SectionHeader` (optional bottom border)
  - `SectionBody`
- Keep MUI-native composition, avoid over-abstraction.

**Where to use**
- Inventory History page blocks (filters/results/header)
- New detail screens requiring strict border hierarchy

---

## 6) Paginated Data Block Wrapper

**From**
- Repeated pattern: `DataTable` + `PaginationControls` + loading/empty logic
- Current usage across list pages and inventory history

**How**
- Create `components/shared/PaginatedDataSection.tsx`
- Props:
  - `rows`, `columns`, `isLoading`, `emptyText`
  - pagination controls (`total`, `page`, `limit`, handlers)
  - sorting handlers
- Optional slot above table (chips/info row).

**Where to use**
- Inventory List
- Products List
- Orders List
- Inventory History

---

## 7) Status/Delta Display Helpers for Table Cells

**From**
- `admin-frontend/src/features/inventory/config/inventoryHistoryTableColumns.ts`
- Similar colored semantic cells in products/orders/inventory tables

**How**
- Create shared display primitives:
  - `StatusText`
  - `DeltaText` (`before -> after (+/-N)`)
- Centralize color mapping rules in one place.

**Where to use**
- Inventory History table
- Any table with semantic delta/status values

---

## 8) Filter Chips (Already Unified)

**From**
- Previously separate:
  - `ProductsFilterChips`
  - `OrdersFilterChips`
  - `InventoryFilterChips`
  - `InventoryHistoryFilterChips`
- Shared base: `components/shared/FilterChips.tsx`

**How**
- Keep `FilterChips` as the single render engine (`items[]` mode + shared hover).
- Feature wrappers remain as thin adapters that only map local filter state to chip items.

**Where to use**
- All current list/history pages with filter chips
- Future pages should not implement custom chip rendering directly

---

## Suggested Rollout Order

1. Accordion Filters Dialog (highest duplication, highest ROI)
2. Filter Action Bar mode extension (`SearchToolbar`)
3. Details Header Block
4. Selectable Card List
5. Paginated Data Block Wrapper
6. Border hierarchy helpers (only where repetition is stable)
7. Status/Delta display helpers

---

## Migration Notes

- Keep existing `data-testid` values stable where automation already depends on them.
- Use adapters/wrappers first, then collapse old feature-specific implementations.
- Avoid cross-feature behavioral changes during extraction; move visuals/structure first, then optimize APIs.
