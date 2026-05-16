# Categories Implementation Blueprint for Sales Portal

## 0. Goal

Move categories from free-text product field to dedicated catalog tree.

Target model:

```text
CategoryTree
  -> source of truth for hierarchy

Product
  -> categoryId
  -> rootCategoryId

Order
  -> no category fields
```

Scope note:
- Category `status` removed.
- Category `settings` removed.
- Inventory/warranty/discount/promotions/delivery-rule foundations removed from this blueprint.
- Migration/compatibility period removed from this blueprint.

---

## 1. Architecture Decision

Use tree-in-document (`CategoryTree`) instead of flat rows with `parentId` joins on every read.

Reason:
- categories are read more often than edited;
- admin/frontend often needs full tree;
- expected category volume does not require large-catalog flat model complexity.

---

## 2. Data Model

### 2.1 CategoryTree

```ts
CategoryTree {
  nodes: CategoryNode[];
  createdOn: Date;
  updatedOn: Date;
}
```

### 2.2 CategoryNode

```ts
CategoryNode {
  _id: ObjectId;
  name: string;
  slug: string; // globally unique, case-insensitive
  description?: string;
  imageUrl?: string;
  children: CategoryNode[];
  createdOn: Date;
  updatedOn: Date;
}
```

### 2.3 Product Category Fields

```ts
Product {
  categoryId: ObjectId;
  rootCategoryId: ObjectId;
}
```

`rootCategoryId` is calculated by backend from current tree root.

---

## 3. Slug Rules

Slug generation and validation:
- lowercase;
- spaces -> `-`;
- non-alphanumeric symbols removed;
- duplicate slug conflict returns `409`.

Slug is globally unique across all nodes.

---

## 4. Backend API

Implemented endpoints:

```http
GET    /api/categories/tree
GET    /api/categories/flat
GET    /api/categories/nodes/:categoryId

POST   /api/categories/nodes
PATCH  /api/categories/nodes/:categoryId
DELETE /api/categories/nodes/:categoryId

POST   /api/categories/nodes/:categoryId/move
GET    /api/categories/nodes/:categoryId/products
```

Notes:
- `POST /nodes` creates node, optionally under `parentId`.
- No category status endpoint.
- Tree and flat responses are sorted by name (A-Z).

---

## 5. Core Rules

### 5.1 Delete Guards

Category cannot be deleted if:
- it has `children`;
- any product references it by `categoryId`;
- any product references it by `rootCategoryId`.

### 5.2 Move Rules

`POST /nodes/:categoryId/move`:
- source must exist;
- target parent must exist (or `null` for move to root);
- cannot move into itself;
- cannot move into own subtree;
- if root changes, update `Product.rootCategoryId` for entire moved subtree.

### 5.3 Product Validation

On product create/replace/category-change patch:
- `categoryId` must be valid ObjectId;
- category must exist in tree;
- backend calculates/stores `rootCategoryId`.

---

## 6. Product API Integration

### 6.1 Filters

Products list uses:
- `categoryId`
- `rootCategoryId`

Search remains by product fields (`name`, `manufacturer`) only.

### 6.2 DTO Enrichment

Product details include:
- `categoryId`
- `rootCategoryId`
- `categoryPath` (readable path)
- `category` object with `{ _id, name, slug, path[] }`
- `rootCategory` object with `{ _id, name, slug }`

### 6.3 Export

Products export includes readable `categoryPath`.

---

## 7. Implementation Components

Backend files:
- `backend/models/category-tree.model.ts`
- `backend/services/categories.service.ts`
- `backend/controllers/categories.controller.ts`
- `backend/routers/categories.router.ts`
- `backend/data/jsonSchemas/categories.schema.ts`
- `backend/data/types/category.type.ts`
- `backend/data/types/dto/categories.dto.ts`

Integration:
- register categories router in `backend/index.ts` and `backend/routers/index.ts`;
- ensure singleton tree in `seed()` (`backend/mongo/init.ts`);
- product model/service/controller/middleware/docs switched to `categoryId/rootCategoryId`.

---

## 8. Swagger and Docs

Updated:
- categories Swagger with full request/response schemas and statuses;
- products requirements doc;
- categories requirements doc;
- backend AGENTS notes aligned with removed category status and removed migration instructions.

---

## 9. Explicitly Out of Scope

Not part of this blueprint:
- category status lifecycle;
- category settings payload;
- inventory/warranty/discount/promotions/delivery behavior by category;
- migrations from legacy `category: string`;
- compatibility period for dual fields;
- category counters caching;
- custom ordering field for manual drag/drop sort.

---

## 10. Final Recommendation

Keep categories as pure structural tree entities.

Use `categoryId/rootCategoryId` in products, compute readable path at response time, and enforce strict delete/move guards to preserve integrity without overengineering.
