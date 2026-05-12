# Categories Module - API Requirements

> Purpose: manage product categories as a singleton tree with nested nodes.

## Quick Facts

| Aspect | Details |
| --- | --- |
| Base path | `/api/categories` |
| Auth | Required |
| Persistence model | Singleton document in `CategoryTree` collection |
| Node statuses | `Active`, `Archived` |
| Node creation | Always created as `Active` |
| Settings field | Not used in current model |

## Category Tree Contract

```ts
CategoryTree {
  nodes: CategoryNode[];
  createdOn: Date;
  updatedOn: Date;
}

CategoryNode {
  _id: ObjectId;
  name: string;
  slug: string; // globally unique, case-insensitive
  description?: string;
  imageUrl?: string;
  status: "Active" | "Archived";
  children: CategoryNode[];
  createdOn: Date;
  updatedOn: Date;
}
```

## Endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/categories/tree` | Returns nested category tree. |
| GET | `/api/categories/flat` | Returns flattened list with path metadata. |
| GET | `/api/categories/nodes/:categoryId` | Returns one node by id. |
| POST | `/api/categories/nodes` | Creates category node (`status` always `Active`). |
| PATCH | `/api/categories/nodes/:categoryId` | Updates node fields (`name`, `slug`, `description`, `imageUrl`). |
| PATCH | `/api/categories/nodes/:categoryId/status` | Changes status (`Active <-> Archived`). |
| POST | `/api/categories/nodes/:categoryId/move` | Moves node to another parent or root. |
| DELETE | `/api/categories/nodes/:categoryId` | Deletes node if guards pass. |
| GET | `/api/categories/nodes/:categoryId/products` | Returns products in node subtree. |

## Query Parameters

### `GET /api/categories/tree`
- `includeArchived` (optional, default `true`)
  - `true`: return all nodes
  - `false`: prune archived branches

### `GET /api/categories/flat`
- `status` (optional, default `Active`)
  - `Active`, `Archived`, `All`

## Validation Rules

### Create node
- `name` is required.
- `slug` is optional; when omitted it is generated from `name`.
- slug must be globally unique (case-insensitive).
- `parentId` is optional; when provided parent must exist.
- created node status is always `Active`.

### Update node
- node must exist.
- `slug` (if provided) must remain globally unique.
- archived nodes can still be edited.

### Status update
- node must exist.
- allowed transitions:
  - `Active -> Archived`
  - `Archived -> Active`

### Delete node
- blocked when node has children.
- blocked when any product references this node as `categoryId` or `rootCategoryId`.

### Move node
- source node must exist.
- target parent (if provided) must exist.
- cannot move node into itself or into its own subtree.
- when root section changes, affected products keep `categoryId` and get recalculated `rootCategoryId`.

## Subtree Product Endpoint

`GET /api/categories/nodes/:categoryId/products`:
- accepts any node level (root or nested);
- returns products where `product.categoryId` belongs to node subtree (`node + descendants`).
