# Categories Module - UI Requirements

> Purpose: provide a single workspace for managing category hierarchy with safe create/edit/move/delete flows.

## Quick Facts

| Aspect | Details |
| --- | --- |
| Entry point | `#/categories` |
| APIs | `/api/categories`, `/api/categories/nodes/*` |
| Main data | `tree + flat` from `GET /api/categories` |
| Primary rules | direct-products guard, subtree-aware usage, move-to-root support |

## Workspace Layout

- Two-column workspace:
  - left: tree panel (`search`, hierarchy, DnD, `+ Add root category`)
  - right: selected node details (`header`, general info, children, create/edit flows)
- Mobile/tablet collapses to one-column stack.

## Tree Behavior

- Search matches by `name`, `slug`, and full `path`.
- Matching branches are filtered but hierarchy context is preserved through ancestors.
- Row actions:
  - `+ Add child`
  - `Move`
- Drag-and-drop move:
  - drop onto category node to move under that parent
  - drop onto root drop zone to move node to root level (`targetParentId: null`)
- Invalid moves are blocked in UI:
  - self-target
  - target in source subtree
  - target with `directProductsCount > 0`

## Domain Guards in UI

- Category with direct products cannot receive children:
  - tree row add-child is disabled
  - details panel add-child is disabled
  - create-child action shows reason text
- Backend remains source of truth; `409` errors are shown as toasts/messages.

## Details Panel

- Header shows:
  - selected path
  - node title
  - leaf/parent badge
  - `Move` and `Delete` actions
- Usage representation:
  - leaf node: show `directProductsCount` as main products metric
  - parent node: show `productsCount` (subtree) and `directProductsCount`

## Create/Edit/Delete

- Create root category from page header and tree inline button.
- Create child from tree/details when guard rules allow.
- Edit supports `name`, `slug`, `description`, `imageUrl`.
- Delete is disabled when:
  - node has children
  - node is used by products (reported by backend; conflict state retained in UI)

## Deep Link Selection

- Opening `#/categories?selectedId=<id>` should preselect and expand path to the target node.
- After open, user selection is not locked to URL query value.

## Move Dialog

- Supports selecting:
  - target category from autocomplete
  - explicit `Move to root category`
- Confirmation view always shows:
  - source category
  - source path
  - destination preview

