# Categories Implementation Blueprint for Sales Portal

# 0. Goal

Categories should become a separate business module, not just a string field inside Product.

The current Product model stores category as a simple string. This is enough for early CRUD, but it becomes limiting once the project starts adding:

- inventory tracking rules;
- discounts and promotions;
- warranties;
- aftermarket products;
- shipping rules;
- subscriptions;
- category-specific behavior;
- future storefront navigation.

The goal is to turn categories into a controlled catalog structure while keeping the implementation practical and not overengineered.

Final target:

```text
CategoryTree
  → source of truth for category hierarchy and category settings

Product
  → stores categoryId and rootCategoryId

Order
  → does NOT store category information for now
```

---

# 1. Key Architectural Decision

Use a tree-in-document model for categories.

Instead of storing flat categories with `parentId` and rebuilding the tree on every request:

```ts
Category {
  _id,
  name,
  parentId
}
```

use one tree document:

```ts
CategoryTree {
  name: "Main catalog",
  nodes: CategoryNode[]
}
```

Each node can contain child nodes:

```ts
CategoryNode {
  _id,
  name,
  slug,
  description?,
  imageUrl?,
  status,
  settings,
  children: CategoryNode[]
}
```

This approach fits the current project well because:

- categories will be read more often than edited;
- the UI needs the full tree for selects, filters, breadcrumbs, and future navigation;
- the project probably will not have thousands of categories;
- the structure is similar in spirit to Product → variants[];
- the backend does not need to rebuild the category tree from flat rows on every request.

---

# 2. Why Not Flat Category Documents

A flat model with `parentId` is more flexible for huge catalogs, but it adds repeated tree-building logic.

With a flat model, every time the frontend needs a category tree, backend must:

```text
GET categories
→ load all categories
→ build parent/children structure
→ sort nodes
→ return tree
```

This is fine for large enterprise catalogs, but unnecessary for this project right now.

The tree-in-document approach allows:

```text
GET /api/categories/tree
→ return ready-to-use tree
```

The trade-off is that updates to nested nodes require helper functions, but this is acceptable because category editing is not a high-frequency operation.

---

# 3. CategoryTree Model

## 3.1. Collection

Create:

```text
backend/models/category-tree.model.ts
```

## 3.2. Schema

```ts
CategoryTree {
  name: string;
  version: number;

  nodes: CategoryNode[];

  createdOn: Date;
  updatedOn: Date;
}
```

## 3.3. CategoryNode

```ts
CategoryNode {
  _id: ObjectId;

  name: string;
  slug: string;

  description?: string;
  imageUrl?: string;

  status: "Active" | "Archived";

  settings: {
    inventoryTracking: boolean;
    allowWarranty: boolean;
    allowDiscounts: boolean;
    allowSubscriptions: boolean;
    requiresShipping: boolean;
  };

  children: CategoryNode[];

  createdOn: Date;
  updatedOn: Date;
}
```

## 3.4. Why `version`

`version` is useful for future cache invalidation and frontend refresh logic.

Example:

```text
Category tree version = 12
Frontend has version = 11
→ refresh tree
```

For MVP, this can simply increment on every tree update.

---

# 4. Slug

A `slug` is a human-readable identifier.

Example:

```text
Gaming Laptops → gaming-laptops
Home & Kitchen → home-kitchen
```

Rules:

```text
lowercase
spaces replaced with hyphens
special characters removed
```

Usage:

- future storefront URLs;
- readable filters;
- category paths;
- internal stable naming;
- easier debugging.

For now, slug can be globally unique to keep validation simple.

Later, if needed, slugs may become unique only inside the same parent.

---

# 5. Category Settings

Category settings should define high-level business behavior.

```ts
settings: {
  inventoryTracking: boolean;
  allowWarranty: boolean;
  allowDiscounts: boolean;
  allowSubscriptions: boolean;
  requiresShipping: boolean;
}
```

Examples:

```text
Electronics:
  inventoryTracking: true
  allowWarranty: true
  allowDiscounts: true
  allowSubscriptions: false
  requiresShipping: true

Digital Products:
  inventoryTracking: false
  allowWarranty: false
  allowDiscounts: true
  allowSubscriptions: true
  requiresShipping: false

Services:
  inventoryTracking: false
  allowWarranty: false
  allowDiscounts: true
  allowSubscriptions: false
  requiresShipping: false
```

Important: not every setting must be used immediately.

The settings exist as a foundation for inventory, discounts, warranties, subscriptions, and delivery rules.

---

# 6. Product Category Fields

## 6.1. Product Should Not Store Category Name

Product should not store full category snapshot because categories are reference data.

If a category is renamed, products should automatically show the new name without updating every product.

Therefore Product should store IDs only.

## 6.2. Recommended Product Fields

```ts
Product {
  categoryId: ObjectId;
  rootCategoryId: ObjectId;
}
```

Where:

```text
categoryId
  → selected final category node

rootCategoryId
  → top-level category node
```

Example category path:

```text
Electronics / Laptops / Gaming Laptops
```

Product stores:

```ts
{
  categoryId: "gaming-laptops-id",
  rootCategoryId: "electronics-id"
}
```

## 6.3. Why Store `rootCategoryId`

It makes filtering by large category sections fast and simple.

Example:

```text
Show all products under Electronics
```

Backend can query:

```ts
Product.find({ rootCategoryId: electronicsId })
```

No need to scan the category tree or calculate all descendant IDs for common top-level filters.

## 6.4. Why Not Store Full Path in Product

Full path can become stale if categories are moved.

Example:

```text
Electronics / Laptops / Gaming Laptops
```

Later:

```text
Computers / Laptops / Gaming Laptops
```

If Product stores full path, all products need to be updated.

Instead:

```text
Product stores IDs
Backend enriches DTO with current category data
```

---

# 7. Order Category Data

Do not store category data in Order for now.

The existing order product snapshot should remain focused on the actual purchased product data:

```ts
productId
variantId
manufacturer
name
attributes
unitPrice
quantity
received
imageUrl
```

Category is not required unless the project needs historical category analytics.

Avoid storing category in Order because:

- category moves should not force order updates;
- category renames should not affect existing orders;
- order product snapshot is already sufficient for order management;
- category is not currently needed for invoice/export/returns.

If future analytics require historical category-at-sale-time, then add category snapshot later.

For now:

```text
Product:
  categoryId
  rootCategoryId

Order:
  no category fields
```

---

# 8. CategoryTree Helper Functions

Because the tree is nested, backend needs helper functions.

Create a utility or service layer with:

```ts
findNodeById(tree, categoryId)
findNodeBySlug(tree, slug)
findParentNodeByChildId(tree, categoryId)
findRootNodeByNodeId(tree, categoryId)
updateNodeById(tree, categoryId, patch)
archiveNodeById(tree, categoryId)
removeNodeById(tree, categoryId)
moveNode(tree, categoryId, targetParentId)
flattenTree(tree)
getNodePath(tree, categoryId)
getDescendantIds(tree, categoryId)
validateUniqueSlug(tree, slug, ignoredNodeId?)
validateNoCycles(tree)
```

These helpers are critical because they keep service logic clean.

---

# 9. CategoryService

Create:

```text
backend/services/categories.service.ts
```

Core methods:

```ts
CategoriesService.getTree()
CategoriesService.getFlatList()
CategoriesService.getNodeById(categoryId)
CategoriesService.createNode(payload)
CategoriesService.updateNode(categoryId, payload)
CategoriesService.archiveNode(categoryId)
CategoriesService.deleteNode(categoryId)
CategoriesService.moveNode(categoryId, targetParentId)
CategoriesService.getPath(categoryId)
CategoriesService.getRootCategoryId(categoryId)
CategoriesService.validateCategoryCanBeUsed(categoryId)
```

---

# 10. Category Controller and Router

Create:

```text
backend/controllers/categories.controller.ts
backend/routers/categories.router.ts
```

## 10.1. API Endpoints

```http
GET    /api/categories/tree
GET    /api/categories/flat
GET    /api/categories/nodes/:categoryId

POST   /api/categories/nodes
PATCH  /api/categories/nodes/:categoryId
PATCH  /api/categories/nodes/:categoryId/status
DELETE /api/categories/nodes/:categoryId

POST   /api/categories/nodes/:categoryId/move
GET    /api/categories/nodes/:categoryId/products
```

## 10.2. Why Both Tree and Flat Endpoints

Tree endpoint:

```text
Used by category management UI, selects, future navigation.
```

Flat endpoint:

```text
Used by product filters, autocomplete, validation, admin tables.
```

---

# 11. Category Node Creation Flow

## 11.1. Business Flow

```text
Manager opens Categories page
→ clicks Add Category
→ enters name
→ optionally selects parent category
→ configures settings
→ saves
→ backend creates node in tree
→ tree version increments
```

## 11.2. Backend Steps

```text
validate name
generate slug
validate slug uniqueness
validate parent exists if provided
create node
insert into root nodes or parent.children
increment tree version
update updatedOn
return updated tree or created node
```

## 11.3. Default Settings

If no settings provided:

```ts
{
  inventoryTracking: true,
  allowWarranty: false,
  allowDiscounts: true,
  allowSubscriptions: false,
  requiresShipping: true
}
```

Defaults can later come from global Settings.

---

# 12. Category Update Flow

## 12.1. Editable Fields

```text
name
slug
description
imageUrl
settings
status
```

## 12.2. Important Rule

Updating category name does not update products.

Products store only IDs.

Frontend receives updated category name through DTO enrichment.

## 12.3. Slug Update

If slug changes:

```text
validate new slug uniqueness
update node
increment tree version
```

For future storefront, slug changes may need redirects, but this is not needed now.

---

# 13. Category Archive and Delete

## 13.1. Preferred Strategy

Archive is safer than delete.

If category has products:

```text
Archive only
```

If category has children:

```text
Archive subtree or reject operation
```

Recommended rule for MVP:

```text
Do not physically delete a category if:
- it has products;
- it has children;
- it is used as rootCategoryId;
- it is used as categoryId.
```

## 13.2. Archive Flow

```text
Manager archives category
→ backend checks usage
→ sets status = Archived
→ optionally archives all children
→ products remain linked but category becomes unavailable for new products
```

## 13.3. Product Behavior for Archived Category

Existing products can still reference archived categories.

But product create/edit should not allow selecting archived categories.

---

# 14. Moving Categories

Moving category means changing its position in the tree.

Example:

```text
Electronics / Laptops / Gaming Laptops
```

Move to:

```text
Computers / Laptops / Gaming Laptops
```

## 14.1. Product Impact

Products do not need update if they store:

```text
categoryId
rootCategoryId
```

But if root changes, `rootCategoryId` in products must be updated.

Therefore moving a node across root categories requires product update.

## 14.2. Important Rule

If a category is moved within the same root category:

```text
Product.categoryId unchanged
Product.rootCategoryId unchanged
No product update needed
```

If category is moved under a different root:

```text
Product.categoryId unchanged
Product.rootCategoryId must be updated
```

## 14.3. Move Flow

```text
validate category exists
validate target parent exists
validate target parent is not inside moved subtree
move node
recalculate root for moved subtree
update rootCategoryId for affected products if root changed
increment tree version
```

For MVP, category move can be postponed.

---

# 15. Product Create/Edit Integration

## 15.1. Product Create Form

Replace free-text category input with category select/autocomplete.

Product create payload should send:

```ts
{
  categoryId
}
```

Backend calculates:

```ts
rootCategoryId = CategoriesService.getRootCategoryId(categoryId)
```

Product stores:

```ts
{
  categoryId,
  rootCategoryId
}
```

## 15.2. Product Edit Form

Category can be changed only by selecting another active category.

Backend validates:

```text
category exists
category is active
category can be used
```

Then updates:

```ts
categoryId
rootCategoryId
updatedOn
```

---

# 16. Product DTO Enrichment

Product model stores only:

```ts
categoryId
rootCategoryId
```

But frontend needs readable data.

So Product DTO should include:

```ts
category: {
  _id: string;
  name: string;
  slug: string;
  path: [
    {
      _id: string;
      name: string;
      slug: string;
    }
  ];
}

rootCategory: {
  _id: string;
  name: string;
  slug: string;
}
```

This enrichment happens in service/controller layer.

Do not duplicate this data in Product collection.

---

# 17. Product List Integration

## 17.1. Filters

Replace current text category filter with real category filters.

Supported filters:

```text
rootCategoryId
categoryId
includeSubcategories
```

## 17.2. Recommended MVP Filters

For MVP:

```text
rootCategoryId
categoryId
```

No `includeSubcategories` yet.

## 17.3. Later Filter

Later:

```text
categoryId + includeSubcategories = true
```

Backend uses:

```ts
getDescendantIds(categoryId)
```

and queries:

```ts
Product.find({
  categoryId: { $in: [categoryId, ...descendantIds] }
})
```

---

# 18. Inventory Integration

Inventory creation depends on category settings.

## 18.1. Product Creation

```text
Create Product
→ get category settings
→ if inventoryTracking = true:
     create Inventory
   else:
     do not create Inventory
```

## 18.2. Product Category Change

If product changes category:

### Case 1

Old category had inventory tracking, new category also has inventory tracking:

```text
Keep existing inventory
```

### Case 2

Old category had no inventory tracking, new category has inventory tracking:

```text
Create Inventory
```

### Case 3

Old category had inventory tracking, new category has no inventory tracking:

```text
Do not delete inventory automatically
Archive or mark inventory as not tracked
```

Reason:

Stock history must not disappear silently.

## 18.3. UI Behavior

Products with `inventoryTracking = false` show:

```text
Inventory: Not tracked
```

---

# 19. Warranty / Aftermarket Integration

Category setting:

```ts
allowWarranty: boolean
```

Later business flow:

```text
If product.category.allowWarranty = true
→ allow adding warranty products/services
```

Examples:

```text
Laptops → extended warranty
Phones → screen protection
Furniture → assembly service
Digital products → no warranty
```

For now, only store setting and show it in category details.

Do not implement warranty logic yet.

---

# 20. Discounts and Promotions Integration

Category setting:

```ts
allowDiscounts: boolean
```

Later promotion rules may target:

```text
rootCategoryId
categoryId
category subtree
```

Example:

```text
10% off Electronics
Free shipping for Furniture over $2000
Warranty discount for Laptops
```

For now, only prepare category IDs and settings.

Do not build promotion engine yet.

---

# 21. Delivery Rules Integration

Category setting:

```ts
requiresShipping: boolean
```

Later shipping rules may use:

```text
category
rootCategory
order value
subscription status
state
delivery type
```

Examples:

```text
Digital product → no delivery
Furniture → oversized delivery
Electronics → standard delivery
Order over $2000 → in-state free shipping
```

For now, only store `requiresShipping`.

---

# 22. Frontend: Categories List Page

Route:

```text
/categories
```

## 22.1. Purpose

Manage catalog structure.

## 22.2. Layout

Recommended layout:

```text
Header
  Add Category button

Left / Main:
  Category tree

Right / Details panel:
  Selected category details
```

Alternative MVP layout:

```text
Flat table with parent path column
```

But because backend stores tree, a tree UI is more natural.

## 22.3. Tree Node Display

Each node:

```text
Category name
Status badge
Business rule icons
Product count
```

Business rule icons:

```text
Inventory
Warranty
Discounts
Subscription
Shipping
```

---

# 23. Frontend: Category Details

Route:

```text
/categories/:categoryId
```

Or as side panel from category tree.

Sections:

```text
General info
Business settings
Products in category
Child categories
Danger zone
```

## 23.1. General Info

```text
Name
Slug
Description
Status
Path
Created on
Updated on
```

## 23.2. Business Settings

```text
Inventory tracking
Allow warranty
Allow discounts
Allow subscriptions
Requires shipping
```

## 23.3. Products in Category

Show table:

```text
Product
Status
Inventory status
Variants count
Updated on
```

Action:

```text
Open product
```

---

# 24. Frontend: Category Create/Edit Form

Fields:

```text
Name
Slug
Parent category
Description
Image URL
Status
Inventory tracking
Allow warranty
Allow discounts
Allow subscriptions
Requires shipping
```

## 24.1. Slug UX

Auto-generate from name.

Allow manual override.

Show preview:

```text
gaming-laptops
```

## 24.2. Parent Category

Use tree select.

Prevent selecting archived parent.

Prevent selecting itself or child nodes while editing/moving.

---

# 25. Frontend: Product Form Integration

Replace category text input with category select.

## 25.1. Select Behavior

Display tree path:

```text
Electronics / Laptops / Gaming Laptops
```

Search by:

```text
name
slug
path
```

## 25.2. On Category Select

Show category rules preview:

```text
Inventory tracking: enabled
Warranty: allowed
Shipping: required
```

This helps managers understand what selecting category means.

---

# 26. Frontend: Products List Integration

Category filter becomes controlled.

Filters:

```text
Root category
Specific category
```

Optionally later:

```text
Include subcategories
```

Product row displays:

```text
Category path
```

Example:

```text
Electronics / Laptops
```

---

# 27. Frontend: Product Details Integration

Product details should show category as linked entity.

Example:

```text
Category: Electronics / Laptops / Gaming Laptops
```

Click opens category details.

Also show category business settings in compact form if useful:

```text
Inventory tracked
Warranty allowed
Shipping required
```

Do not overload product details.

---

# 28. Migration Plan

Current Product category:

```ts
category: string
```

Target:

```ts
categoryId: ObjectId
rootCategoryId: ObjectId
```

## 28.1. Migration Steps

### Step 1

Create CategoryTree model.

### Step 2

Extract unique category strings from products.

Example:

```text
Phones
Laptops
Accessories
```

### Step 3

Create root category nodes for each unique category.

For MVP, existing categories become root categories.

### Step 4

Update each product:

```text
product.category = "Laptops"
```

becomes:

```ts
product.categoryId = laptopsNodeId
product.rootCategoryId = laptopsNodeId
```

### Step 5

Update Product DTOs and frontend.

### Step 6

Remove old string category field after compatibility period.

## 28.2. Compatibility Period

For some time Product may contain both:

```ts
category: string
categoryId: ObjectId
rootCategoryId: ObjectId
```

But frontend should switch to new fields immediately.

After migration is verified:

```text
remove category string
```

---

# 29. Backend Validation Rules

## 29.1. Create Category

Validate:

```text
name is required
slug is unique
parent exists if provided
parent is active
```

## 29.2. Update Category

Validate:

```text
node exists
slug remains unique
settings are valid booleans
archived category cannot be used for new products
```

## 29.3. Product Create/Edit

Validate:

```text
categoryId exists
category status is Active
category is selectable
rootCategoryId calculated by backend
```

Frontend must not send `rootCategoryId` as trusted data.

Backend computes it.

---

# 30. Category Node Selectability

Not every node should necessarily be selectable.

Later, you may add:

```ts
selectable: boolean
```

Example:

```text
Electronics
  selectable: false

Electronics / Laptops
  selectable: true
```

For MVP, all active nodes can be selectable.

---

# 31. Product Count

Product count can be calculated in two ways.

## 31.1. On Demand

```text
Product.countDocuments({ categoryId })
```

Pros:

- always accurate;
- no duplicated data.

Cons:

- more queries.

## 31.2. Cached in Category Node

```ts
productCount: number
```

Pros:

- fast UI.

Cons:

- must update on product create/edit/delete/archive.

## 31.3. Recommendation

For MVP:

```text
Calculate product counts on demand for selected category/details.
```

Do not cache counts in the tree yet.

For the list/tree UI, product counts are optional.

---

# 32. Sorting

Each category node may have:

```ts
order: number
```

For MVP, sort alphabetically.

Later, add manual ordering.

---

# 33. Access Rules

Only authorized managers/admins can modify categories.

Recommended permissions later:

```text
VIEW_CATEGORIES
MANAGE_CATEGORIES
```

For MVP, use the same auth middleware as products.

---

# 34. Swagger / API Docs

Add schemas:

```text
CategoryNode
CategoryTree
CategoryNodeCreatePayload
CategoryNodePatchPayload
CategoryMovePayload
CategoryResponse
CategoryTreeResponse
```

Document:

```text
GET /api/categories/tree
POST /api/categories/nodes
PATCH /api/categories/nodes/:categoryId
DELETE /api/categories/nodes/:categoryId
POST /api/categories/nodes/:categoryId/move
```

---

# 35. Testing Strategy

## 35.1. Unit Tests

Test tree helpers:

```text
findNodeById
getNodePath
getRootCategoryId
getDescendantIds
updateNodeById
archiveNodeById
moveNode
validateUniqueSlug
```

## 35.2. API Tests

Test:

```text
create category
create child category
update category
archive category
delete used category fails
product cannot use archived category
product stores correct rootCategoryId
```

## 35.3. Integration Tests

Test:

```text
create category
create product with category
get product list
category DTO is enriched
change category name
product DTO shows new category name
```

---

# 36. Recommended Implementation Order

## Phase 1 — Category Backend Core

```text
1. CategoryTree model
2. Category tree helpers
3. CategoriesService
4. CategoriesController
5. CategoriesRouter
6. GET tree
7. POST node
8. PATCH node
9. archive node
```

## Phase 2 — Category UI

```text
1. Categories page
2. Category tree display
3. Create category form
4. Edit category form
5. Archive category action
```

## Phase 3 — Product Migration

```text
1. Add categoryId/rootCategoryId to Product model
2. Migration from string category
3. Product DTO enrichment
4. Product create/edit uses categoryId
5. Products list uses category filters
```

## Phase 4 — Business Rules Foundation

```text
1. Use inventoryTracking during Product creation
2. Show category settings in Product form/details
3. Prepare allowWarranty/allowDiscounts/requiresShipping for future features
```

## Phase 5 — Advanced Tree Management

```text
1. Move category
2. Manual ordering
3. Include subcategories filter
4. Product counts
5. Category-specific rules
```

---

# 37. What NOT To Build Now

Avoid at this stage:

```text
complex category attribute schemas
category-specific product validation engine
drag-and-drop tree editor
SEO metadata
storefront category pages
tax rules
accounting rules
category-level profit analytics
automatic order category snapshots
complex product count caching
multi-tree catalogs
```

---

# 38. Final Architecture

```text
CategoryTree
  source of truth for category hierarchy and settings

Product
  categoryId
  rootCategoryId

Order
  no category data for now

Inventory
  created or skipped based on category.settings.inventoryTracking

Promotions / Warranty / Delivery
  later use categoryId/rootCategoryId and category settings
```

---

# 39. Final Recommendation

Implement categories as a tree-in-document module.

Store in Product:

```ts
categoryId
rootCategoryId
```

Do not store category names or full paths in Product.

Do not store category data in Order for now.

Use backend DTO enrichment when frontend needs readable category data.

This gives the project:

- fast category tree reads;
- clean product references;
- easy category renaming;
- future business-rule foundation;
- simple filtering by root category;
- no unnecessary order updates;
- no premature ERP-level complexity.
