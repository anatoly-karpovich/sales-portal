# Categories Module - API Requirements

> Purpose: manage product categories as a hierarchical catalog with stable API contracts for admin frontend.

## Quick Facts

| Aspect | Details |
| --- | --- |
| Base path | `/api/categories` |
| Auth | Required |
| Persistence model | One category = one document in `Category` collection (`parentId/rootId/ancestors/path`) |
| Category nature | Structural tree nodes without status field |
| Read optimization | In-memory TTL cache for tree/flat responses (service-level) |

## Persistence Shape (Backend Internal)

```ts
Category {
  _id: ObjectId;
  name: string;
  slug: string;
  slugLower: string; // unique, case-insensitive guard
  description?: string;
  imageUrl?: string;

  parentId: ObjectId | null;
  rootId: ObjectId;
  depth: number;
  ancestors: ObjectId[]; // from root to parent
  path: { _id: ObjectId; name: string; slug: string }[]; // from root to self
  pathSlugs: string[];

  childrenCount: number;
  isLeaf: boolean;
  createdOn: Date;
  updatedOn: Date;
}
```

Notes:
- `productsCount` (subtree) and `directProductsCount` are calculated on read and returned in tree DTO.
- Product index guards rely on `Product.categoryId` and `Product.rootCategoryId`.

## API DTO Contract

```ts
CategoryTreeNode {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  directProductsCount: number;
  productsCount: number;
  children: CategoryTreeNode[];
  createdOn: string;
  updatedOn: string;
}

CategoryFlatNode {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  parentId?: string;
  path: { _id: string; name: string; slug: string }[];
  createdOn: string;
  updatedOn: string;
}
```

## Endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/categories` | Returns combined payload with both nested tree and flat list. |
| GET | `/api/categories/tree` | Returns nested category tree (`directProductsCount` + `productsCount`). |
| GET | `/api/categories/flat` | Returns flattened list with `path` metadata. |
| GET | `/api/categories/nodes/:categoryId` | Returns one category subtree node by id. |
| POST | `/api/categories/nodes` | Creates a category node (root or child). |
| PATCH | `/api/categories/nodes/:categoryId` | Updates node fields (`name`, `slug`, `description`, `imageUrl`). |
| POST | `/api/categories/nodes/:categoryId/move` | Moves node to another parent or to root (`targetParentId: null`). |
| DELETE | `/api/categories/nodes/:categoryId` | Deletes node if guards pass. |
| GET | `/api/categories/nodes/:categoryId/products` | Returns products in selected node subtree. |

## Validation Rules

### Create node
- `name` is required.
- `slug` is optional; when omitted it is generated from `name`.
- slug must be globally unique (case-insensitive).
- `parentId` is optional; when provided parent must exist.
- creation is blocked when parent has direct products (`directProductsCount > 0`).

### Update node
- node must exist.
- `slug` (if provided) must remain globally unique.
- when `name` or `slug` changes, `path/pathSlugs` are updated for the entire subtree.

### Delete node
- blocked when node has children.
- blocked when any product references this node as `categoryId` or `rootCategoryId`.

### Move node
- source node must exist.
- target parent (if provided) must exist.
- cannot move node into itself or into its own subtree.
- move is blocked when target parent has direct products (`directProductsCount > 0`).
- when root section changes, affected products keep `categoryId` and get recalculated `rootCategoryId`.

## Subtree Product Endpoint

`GET /api/categories/nodes/:categoryId/products`:
- accepts any node level (root or nested);
- returns products where `product.categoryId` belongs to node subtree (`node + descendants`).
