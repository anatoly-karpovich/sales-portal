# Inventory Implementation Blueprint for Sales Portal

## 0. Goal

Inventory should not be implemented as a simple `quantity` field inside Product.

It should become a separate business module connected with:

- products;
- variants;
- orders;
- reservations;
- analytics;
- future customer checkout.

The current architecture already fits this direction very well:

- Product already contains variants;
- Order already stores `productId`, `variantId`, `quantity`, `unitPrice`, snapshots;
- Product and Order responsibilities are already separated;
- Category and Product domains are already linked through `categoryId` and `rootCategoryId`.

Inventory should therefore become:

```text
Product
Inventory
InventoryAdjustment
Reservation
Settings
```

The goal is to prepare the business logic before storefront implementation, so the storefront can be built on top of a ready, realistic API instead of temporary placeholders.

---

## 1. Core Architecture

## Product

Product is responsible only for catalog data:

- name;
- manufacturer;
- category;
- description;
- image;
- variants;
- product statuses;
- prices.

Product should not become a warehouse entity.

Product answers:

```text
"What is this item in the catalog?"
```

Inventory answers:

```text
"How much of this item exists in the warehouse?"
```

---

## Inventory

Inventory is responsible for the current stock state.

There should be one Inventory document per Product.

Inventory mirrors Product variants.

```ts
Inventory {
  productId: ObjectId;

  totalQuantity: number;
  totalReserved: number;
  totalAvailable: number;

  inventoryStatus:
    | "IN_STOCK"
    | "LOW_STOCK"
    | "OUT_OF_STOCK"
    | "NOT_TRACKED";

  lowStockVariantsCount: number;
  outOfStockVariantsCount: number;

  variants: [
    {
      variantId: ObjectId;

      quantity: number;
      reserved: number;
      available: number;

      lowStockThreshold: number;
      allowSellingOutOfStock: boolean;

      stockStatus:
        | "IN_STOCK"
        | "LOW_STOCK"
        | "OUT_OF_STOCK"
        | "NOT_TRACKED";

      status:
        | "ACTIVE"
        | "ARCHIVED";

      updatedOn: Date;
    }
  ];

  status:
    | "ACTIVE"
    | "ARCHIVED";

  createdOn: Date;
  updatedOn: Date;
}
```

Important:

- `Inventory.totalAvailable` is derived from variants;
- `Inventory.totalReserved` is derived from variants;
- `Inventory.totalQuantity` is derived from variants;
- variant inventory status is calculated, not manually edited;
- parent inventory status is calculated from variant statuses;
- archived inventory variants remain for history and auditability.

---

## InventoryAdjustment

InventoryAdjustment is immutable stock movement history.

```ts
InventoryAdjustment {
  inventoryId: ObjectId;

  productId: ObjectId;
  variantId: ObjectId;

  type:
    | "INITIAL_STOCK"
    | "MANUAL_INCREASE"
    | "MANUAL_DECREASE"
    | "MANUAL_CORRECTION"
    | "RESERVE"
    | "RELEASE"
    | "SALE"
    | "RETURN"
    | "DAMAGE"
    | "EXPIRED_RESERVATION";

  quantityChange: number;

  quantityBefore: number;
  quantityAfter: number;

  reservedBefore: number;
  reservedAfter: number;

  reason?: string;
  comment?: string;

  orderId?: ObjectId;
  reservationId?: ObjectId;

  createdBy: ObjectId;
  createdOn: Date;
}
```

Purpose:

```text
Inventory answers:
"How much stock exists now?"

InventoryAdjustment answers:
"Why did stock become this value?"
```

Rules:

- adjustments are never edited;
- adjustments are never deleted;
- all stock-changing operations create adjustments;
- manual updates are business events, not simple field patches.

---

## Reservation

Reservation is a temporary inventory lock.

It is used for Draft orders and future customer payment flows.

```ts
Reservation {
  orderId: ObjectId;

  type:
    | "ADMIN_DRAFT"
    | "CUSTOMER_PAYMENT";

  status:
    | "ACTIVE"
    | "EXPIRED"
    | "RELEASED"
    | "COMPLETED";

  items: [
    {
      productId: ObjectId;
      variantId: ObjectId;
      quantity: number;
    }
  ];

  expiresAt: Date;

  createdOn: Date;
  updatedOn: Date;
}
```

Indexes:

```ts
ReservationSchema.index({ status: 1, expiresAt: 1 });
ReservationSchema.index({ orderId: 1 }, { unique: true });
```

Purpose:

- fast cron scanning;
- isolated reservation lifecycle;
- no heavy order scans;
- clear separation between order lifecycle and stock lock lifecycle.

---

# 2. Settings

Inventory and reservation rules should not be hardcoded.

```ts
settings.inventory = {
  defaultLowStockThreshold: 5,
  allowSellingOutOfStockByDefault: false,
};

settings.reservations = {
  adminDraftReservationHours: 24,
  customerPaymentReservationMinutes: 15,
  cronIntervalMinutes: 5,
};
```

These settings should be used by:

- Inventory creation flow;
- Inventory variant synchronization;
- manual stock settings;
- admin draft reservations;
- customer checkout reservations;
- reservation expiration cron.

---

# 3. Inventory Creation Flow

## Product Creation

```text
POST /api/products
→ create Product
→ create Inventory document
→ create inventory variant entries
→ create INITIAL_STOCK adjustments if needed
→ return Product DTO
```

Initial variant inventory:

```ts
{
  variantId: productVariant._id,
  quantity: 0,
  reserved: 0,
  available: 0,
  lowStockThreshold: settings.inventory.defaultLowStockThreshold,
  allowSellingOutOfStock: settings.inventory.allowSellingOutOfStockByDefault,
  stockStatus: "OUT_OF_STOCK",
  status: "ACTIVE",
  updatedOn: now,
}
```

Reason:

Creating catalog data does not mean stock physically exists.

Default stock should be zero.

Stock should appear only through inventory adjustments.

---

# 4. Variant Synchronization

Inventory must always mirror Product variants.

Synchronization should be handled by `InventoryService.syncWithProductVariants(product)`.

It should be called after:

- product creation;
- product replacement;
- product patch if variants or category-related data changes;
- variant creation;
- variant replacement;
- variant archive/delete operation;
- product archive operation.

---

## Add Variant

```text
POST /products/:productId/variants
→ add Product variant
→ add Inventory variant entry
→ recalculate inventory summary
```

New inventory variant entry:

```ts
{
  variantId,
  quantity: 0,
  reserved: 0,
  available: 0,
  lowStockThreshold: default,
  allowSellingOutOfStock: default,
  stockStatus: "OUT_OF_STOCK",
  status: "ACTIVE",
  updatedOn: now,
}
```

---

## Replace Variants

When product variants are replaced:

```text
PUT /products/:productId/variants
→ update Product variants
→ sync Inventory variants
→ recalculate inventory summary
```

Rules:

- existing variant inventory entries must be preserved by `variantId`;
- new variants receive new inventory entries with zero stock;
- missing variants should not be physically deleted if they already have inventory history;
- archived variants should stay in inventory for history.

---

## Delete / Archive Variant Strategy

The default strategy should be archive-first.

Do not physically delete inventory variant entries once they exist in Inventory.

Reason:

Even if the variant currently has zero stock, it may already have:

- adjustment history;
- order history;
- reservation history;
- audit value.

Recommended MVP rule:

```text
If a variant has already been persisted and synced with Inventory,
archive/deactivate it instead of physically deleting inventory history.
```

Physical deletion is allowed only for unsaved draft UI variants before the product is saved.

Backend variant deletion should behave as:

```text
DELETE /products/:productId/variants/:variantId
→ if safe and still supported, remove product variant
→ archive corresponding inventory variant
→ preserve adjustments
→ recalculate inventory summary
```

If the project later needs true physical deletion, add it as a separate explicit maintenance/admin action, not as default business behavior.

---

## Archive Product

```text
Product Archived
→ Inventory Archived
→ inventory hidden from default inventory list
→ adjustment history preserved
```

Archived inventory may still be available through:

- product details;
- inventory history;
- admin filters;
- audit views.

---

# 5. Inventory Status Calculations

## Available Formula

```text
available = quantity - reserved
```

`available` should be recalculated after every operation that changes `quantity` or `reserved`.

---

## Variant Stock Status

```text
if allowSellingOutOfStock:
  IN_STOCK

else if available <= 0:
  OUT_OF_STOCK

else if available <= lowStockThreshold:
  LOW_STOCK

else:
  IN_STOCK
```

Notes:

- `allowSellingOutOfStock` affects storefront availability and order validation;
- it does not mean the physical quantity is positive;
- it means the product can still be sold despite insufficient physical stock.

---

## Parent Inventory Status

Avoid marking the whole product as `OUT_OF_STOCK` when only one variant is unavailable.

Recommended parent status logic:

```text
trackedVariants = active variants excluding NOT_TRACKED

if no tracked variants:
  NOT_TRACKED

else if all tracked variants OUT_OF_STOCK:
  OUT_OF_STOCK

else if any tracked variant OUT_OF_STOCK:
  LOW_STOCK

else if any tracked variant LOW_STOCK:
  LOW_STOCK

else:
  IN_STOCK
```

Reason:

If a product has 10 variants and only 1 is out of stock, the whole product should not look completely unavailable.

The product summary should expose exact counters:

```ts
lowStockVariantsCount;
outOfStockVariantsCount;
totalQuantity;
totalReserved;
totalAvailable;
```

This gives both:

- simple badge for lists;
- precise information for details.

---

# 6. Inventory Service

Core methods:

```ts
InventoryService.createForProduct(product);
InventoryService.syncWithProductVariants(product);
InventoryService.getByProductId(productId);
InventoryService.getList(filters, pagination, sorting);

InventoryService.adjustStock(payload, managerId);
InventoryService.updateVariantSettings(productId, variantId, payload);

InventoryService.reserveItems(orderId, items, reservationType);
InventoryService.releaseReservation(reservationId);
InventoryService.completeReservation(reservationId);

InventoryService.recalculateInventorySummary(inventoryId);
InventoryService.recalculateVariantStatus(variant);
```

Recommended internal helpers:

```ts
InventoryService.getVariantOrThrow(inventory, variantId);
InventoryService.createAdjustment(payload);
InventoryService.applyVariantStockChange(params);
InventoryService.applyVariantReservedChange(params);
InventoryService.assertManualDecreaseAllowed(params);
InventoryService.assertEnoughAvailableStock(params);
```

The service should own stock business rules.

Controllers should not perform stock calculations.

---

# 7. Atomic Reservation Logic

Critical business rule.

Never do:

```text
1. Read inventory
2. Validate availability
3. Update reserved
```

This creates race conditions.

Instead:

```text
Atomically update reserved only if enough available stock exists.
```

Conceptual flow:

```text
findOneAndUpdate(
  {
    productId,
    "variants.variantId": variantId,
    "variants.status": "ACTIVE",
    "variants.available": { $gte: requestedQuantity }
  },
  {
    $inc: {
      "variants.$.reserved": requestedQuantity,
      "variants.$.available": -requestedQuantity
    },
    $set: {
      "variants.$.updatedOn": now,
      updatedOn: now
    }
  }
)
```

If update fails:

```text
Not enough stock.
```

Important:

- this belongs to reservation/order flow;
- do not mix this complexity into basic manual adjustment implementation;
- use it when implementing `reserveItems`.

---

# 8. Order Integration

## Draft Order Creation

```text
Manager creates Draft order
→ validate stock
→ reserve inventory atomically
→ create Reservation ADMIN_DRAFT
→ create InventoryAdjustment RESERVE
→ create Draft order
```

Reservation expiration:

```text
now + settings.reservations.adminDraftReservationHours
```

If stock cannot be reserved:

```http
409 Conflict
```

```json
{
  "IsSuccess": false,
  "ErrorMessage": "Not enough stock"
}
```

---

## Draft Order Edit

While Draft:

- products may change;
- reservation should be recalculated.

Recommended MVP approach:

```text
Release old reservation
→ reserve new products
→ update order
```

Reason:

This is easier to reason about, easier to test, and good enough for this project.

Advanced future approach:

```text
Calculate reservation diff
→ reserve additional quantity
→ release removed quantity
→ preserve unchanged reservation lines
```

This can be added later if needed.

---

## Draft → In Process

```text
Order becomes locked
→ Reservation status becomes COMPLETED
```

No additional stock validation required.

Reason:

Stock was already reserved.

Important:

- `COMPLETED` reservation still means the reservation lifecycle is done;
- stock is still physically reduced later on order completion/sale;
- do not release reserved quantity on Draft → In Process.

---

## Cancel Order

```text
If order has active/completed reservation and stock has not been sold:
  release reserved inventory
  Reservation → RELEASED
  create RELEASE adjustments
  Order → Cancelled
```

Cancellation should be idempotent.

Do not release reservation twice.

---

## Complete Order

```text
quantity -= sold quantity
reserved -= sold quantity
→ create SALE adjustments
→ Order → Completed
```

Reserved stock becomes real warehouse reduction.

Important validation:

```text
quantityAfter must not become negative unless overselling is explicitly allowed.
reservedAfter must not become negative.
```

---

# 9. Reservation Expiration Cron

## Job

```text
ExpireReservationsJob
```

Runs every:

```text
settings.reservations.cronIntervalMinutes
```

Recommended default:

```text
5 minutes
```

---

## Flow

```text
Find ACTIVE reservations where expiresAt <= now
→ release inventory
→ create EXPIRED_RESERVATION adjustments
→ Reservation status → EXPIRED
→ update order status
→ add order history entry
```

---

## Important

Job must be idempotent.

Never release reservation twice.

Always require:

```text
Reservation.status === ACTIVE
```

Before release.

Recommended atomic guard:

```text
findOneAndUpdate(
  { _id: reservationId, status: "ACTIVE" },
  { status: "EXPIRED", updatedOn: now }
)
```

Only the process that successfully changes status may release stock.

---

# 10. Customer Checkout Flow

## Cart

```text
Cart does NOT reserve inventory.
```

Reason:

Cart is weak intent.

Otherwise users can block warehouse stock without real checkout intent.

---

## Checkout Started

```text
Customer starts checkout
→ validate stock
→ reserve inventory atomically
→ create Pending Payment order
→ create Reservation CUSTOMER_PAYMENT
→ expiresAt = now + settings.reservations.customerPaymentReservationMinutes
```

Recommended default:

```text
15 minutes
```

---

## Payment Success

```text
Order → In Process
Reservation → COMPLETED
```

Stock stays reserved until order completion/sale.

---

## Payment Failed / Payment Expired

```text
Release reservation
→ Reservation → RELEASED or EXPIRED
→ Order → Cancelled / Payment Expired
```

---

# 11. API Endpoints

## Inventory List

```http
GET /api/inventory
```

Filters:

```text
search
manufacturer
categoryId
rootCategoryId
inventoryStatus
lowStockOnly
outOfStockOnly
includeArchived
page
limit
sortField
sortOrder
```

Sorting:

```text
totalAvailable
totalReserved
updatedOn
lowStockVariantsCount
outOfStockVariantsCount
```

---

## Product Inventory Details

```http
GET /api/inventory/products/:productId
```

Returns:

- product info;
- inventory summary;
- variant inventory state;
- calculated statuses.

---

## Manual Adjustment

```http
POST /api/inventory/adjustments
```

Purpose:

Inventory changes are business events.

Not simple PATCH operations.

Payload example:

```ts
{
  productId: string;
  variantId: string;
  type:
    | "MANUAL_INCREASE"
    | "MANUAL_DECREASE"
    | "MANUAL_CORRECTION"
    | "DAMAGE"
    | "RETURN";
  quantity: number;
  reason?: string;
  comment?: string;
}
```

Rules:

- increase adds to quantity;
- decrease removes from quantity;
- correction sets exact quantity;
- damage decreases quantity;
- return increases quantity.

---

## Inventory Variant Settings

```http
PATCH /api/inventory/products/:productId/variants/:variantId/settings
```

Settings:

```text
lowStockThreshold
allowSellingOutOfStock
```

Changing settings should recalculate:

- variant stock status;
- parent inventory status;
- inventory summary.

---

## Inventory History

```http
GET /api/inventory/products/:productId/adjustments
GET /api/inventory/products/:productId/variants/:variantId/adjustments
```

Filters:

```text
type
orderId
reservationId
createdBy
fromDate
toDate
page
limit
sortOrder
```

---

# 12. Error Handling

## Not Enough Stock

```http
409 Conflict
```

Payload:

```json
{
  "IsSuccess": false,
  "ErrorMessage": "Not enough stock"
}
```

---

## Invalid Manual Decrease

Prevent:

```text
quantity < reserved
```

unless overselling is allowed.

Recommended error:

```http
409 Conflict
```

```json
{
  "IsSuccess": false,
  "ErrorMessage": "Quantity cannot be lower than reserved amount"
}
```

---

## Missing Inventory

If a product exists but inventory does not exist:

```text
InventoryService should be able to repair/sync it.
```

For admin-facing flows:

```text
GET /api/inventory/products/:productId
→ if Inventory does not exist
→ create/sync Inventory
→ return Inventory
```

This makes the system more resilient during migration from older data.

---

# 13. Frontend Architecture

## Sidebar

Add:

```text
Inventory
```

Route:

```text
/inventory
```

Purpose:

Global warehouse management.

---

## Products List Integration

Do not transform Products list into inventory table.

Only add compact inventory summary.

Example:

```text
Inventory: LOW_STOCK
Available: 12
Low: 2 variants
```

Actions:

```text
Manage inventory
```

Route:

```text
/products/:productId/inventory
```

---

## Product Details Integration

Do not overload Product Details.

Add only:

- inventory badges;
- available counts;
- reserved counts;
- Manage Inventory action.

Variants table example:

```text
Variant | Price | Product Status | Available | Reserved | Inventory Badge
```

---

## Product Inventory Page

Main warehouse screen for one product.

Route:

```text
/products/:productId/inventory
```

---

## Product Inventory Header

```text
Product name
Manufacturer
Category
Product status
Inventory status
```

Actions:

```text
Adjust stock
View history
Back to product
```

---

## Summary Cards

```text
Total quantity
Reserved
Available
Low stock variants
Out of stock variants
```

---

## Variants Table

Columns:

```text
Variant
Attributes
Price
Product status
Quantity
Reserved
Available
Low stock threshold
Allow oversell
Stock status
Actions
```

Actions:

```text
Adjust
Settings
History
```

---

## Adjust Stock Modal

Do not create separate pages per variant.

Use modal or drawer.

Fields:

```text
Current quantity
Reserved
Available
Adjustment type
Quantity
Reason
Comment
```

Adjustment types in UI:

```text
Increase stock
Decrease stock
Set exact quantity
Damaged
Return
```

Backend maps UI labels to adjustment types.

---

## Inventory Variant Settings Modal

Fields:

```text
Low stock threshold
Allow selling out of stock
```

After save:

- refresh product inventory;
- update badges;
- update product list summary if cached.

---

## Global Inventory Page

Route:

```text
/inventory
```

Purpose:

Warehouse overview.

---

## Global Inventory Table

Columns:

```text
Product
Manufacturer
Category
Inventory status
Total quantity
Reserved
Available
Low stock variants
Out of stock variants
Updated on
Actions
```

Actions:

```text
Manage inventory
Open product
View history
```

---

## Global Inventory Filters

```text
Search
Category
Manufacturer
Inventory status
Low stock only
Out of stock only
Include archived
```

---

## Global Inventory Sorting

```text
Available
Reserved
Updated on
Low stock count
Out of stock count
```

---

## Inventory History UI

Prefer tabs inside Product Inventory page:

```text
Overview | Adjustments history
```

History columns:

```text
Date
Variant
Type
Change
Quantity before
Quantity after
Reserved before
Reserved after
Reason
Manager
Order
Comment
```

---

# 14. Orders Integration UI

## Draft Orders

Show:

```text
Reserved until: 12 May 2026 18:30
```

Warning:

```text
Reservation expires in 2h 15m
```

If reservation expired:

```text
Reservation expired
Products are no longer locked
```

---

## Create Order Flow

When selecting variants:

```text
Available: 8
Reserved: 2
```

Backend still performs final validation.

UI availability is informative.

Backend validation is authoritative.

---

## Order Details

Add inventory/reservation block:

```text
Reservation status
Reserved until
Reserved items
Stock release / sale events
```

Keep it compact.

Do not turn Order Details into Inventory page.

---

# 15. Product Deletion Strategy

Default strategy:

```text
Archive instead of delete.
```

If product:

- has inventory;
- has inventory history;
- participated in orders;
- contains adjustments;
- has reservations;

then:

```text
Archive Product
Archive Inventory
Preserve InventoryAdjustment history
Preserve Order history
```

Reason:

Inventory and order history should not disappear.

Physical deletion should be limited to development/maintenance scenarios or products that were never truly used.

Recommended admin behavior:

```text
Delete button may become Archive button when product has business history.
```

---

# 16. Metrics

Orders metrics answer:

```text
What was sold?
```

Examples:

```text
Revenue
Orders count
Average order value
Top selling products
```

Inventory metrics answer:

```text
What happened in the warehouse?
```

Examples:

```text
Current stock
Reserved stock
Low stock products
Out of stock products
Dead stock
Damaged stock
Inventory movement
Manual corrections
Returns
```

Do not mix order revenue logic into Inventory.

Do not mix warehouse movement logic into Orders metrics.

---

# 17. Future Extensions

Inventory architecture prepares the project for:

```text
Discounts
Promotion engine
Subscriptions
Warranty products
Service products
Customer checkout
Warehouse analytics
Activity feeds
Pickup spots later
```

---

# 18. What Not To Build Now

Avoid:

```text
Warehouse locations
Pickup spots
FIFO/LIFO
Accounting systems
Profit calculation engine
Supplier batches
Real ERP logic
Cart reservation
Separate pages per variant
Inventory inside Product model
```

The project should be realistic, but not ERP-level.

---

# 19. Recommended Implementation Order

The full scope should be implemented, but in smaller phases to reduce risk.

---

## Phase 1A — Inventory Foundation

Goal:

```text
Create the Inventory domain without UI overload.
```

Scope:

```text
Inventory model
InventoryAdjustment model
Inventory DTOs
Inventory service foundation
Inventory creation on Product create
Inventory sync with Product variants
GET inventory by productId
Basic recalculation helpers
```

Backend methods:

```ts
InventoryService.createForProduct(product);
InventoryService.syncWithProductVariants(product);
InventoryService.getByProductId(productId);
InventoryService.recalculateInventorySummary(inventoryId);
InventoryService.recalculateVariantStatus(variant);
```

Definition of done:

```text
Every new product automatically has Inventory.
Every product variant has matching inventory variant entry.
Inventory summary is calculated correctly.
Existing products can be repaired/synced.
```

---

## Phase 1B — Manual Adjustments

Goal:

```text
Make Inventory usable from admin side.
```

Scope:

```text
POST /api/inventory/adjustments
Manual increase
Manual decrease
Manual correction
Damage
Return
Adjustment history creation
Validation against quantity < reserved
Recalculation after adjustment
```

Definition of done:

```text
Stock cannot be changed without InventoryAdjustment.
Every manual stock change is auditable.
Invalid decreases are blocked.
```

---

## Phase 1C — Product Inventory Page

Goal:

```text
Give admin a focused screen for managing one product's warehouse state.
```

Scope:

```text
Route /products/:productId/inventory
Product inventory header
Summary cards
Variants inventory table
Adjust stock modal/drawer
Variant settings modal
Overview / history tabs
```

Definition of done:

```text
Manager can view and update stock for each variant.
Manager can change low stock threshold and oversell setting.
Manager can see inventory movement history.
```

---

## Phase 2 — Inventory Integration Across Admin

Goal:

```text
Expose inventory state in existing admin flows without overloading them.
```

Scope:

```text
Products list inventory summary
Product details inventory badges
Manage inventory links
Global Inventory page
Inventory filters
Inventory sorting
Archived inventory visibility through filters
```

Definition of done:

```text
Products list remains catalog-focused.
Inventory page becomes warehouse-focused.
Product details shows compact inventory information only.
```

---

## Phase 3 — Reservation System

Goal:

```text
Introduce temporary stock locks for orders.
```

Scope:

```text
Reservation model
Reservation DTOs
InventoryService.reserveItems
InventoryService.releaseReservation
InventoryService.completeReservation
Atomic reservation updates
Reserve on Draft order creation
Release on Cancel
Complete reservation on Draft → In Process
```

Definition of done:

```text
Draft orders reserve inventory.
Cancelled orders release inventory.
Reservation status lifecycle is isolated from Order.
Race-prone read-validate-update flow is avoided.
```

---

## Phase 4 — Reservation Expiration System

Goal:

```text
Automatically release stale reservations.
```

Scope:

```text
ExpireReservationsJob
Cron interval from settings
Find expired ACTIVE reservations
Atomic status guard
Release inventory
Create EXPIRED_RESERVATION adjustments
Update order status/history
```

Definition of done:

```text
Expired reservations are released automatically.
Cron job is idempotent.
Reservation cannot be released twice.
```

---

## Phase 5 — Admin Order UI Integration

Goal:

```text
Make reservation behavior visible and testable in admin.
```

Scope:

```text
Create Order availability display
Draft order reserved-until display
Reservation status on Order Details
Expired reservation warning
Cancel order release behavior visible in UI
Complete order SALE behavior visible in history
```

Definition of done:

```text
Admin UI can fully test reservation and sale lifecycle before storefront starts.
```

---

## Phase 6 — Customer Checkout Readiness

Goal:

```text
Prepare backend behavior for storefront checkout.
```

Scope:

```text
CUSTOMER_PAYMENT reservation type
Pending Payment order state if needed
Short reservation window
Payment success flow
Payment failed/expired flow
Checkout stock validation API shape
```

Definition of done:

```text
Storefront can use ready inventory/reservation/order logic without temporary backend placeholders.
```

---

# 20. Final Architecture

```text
Product
  → catalog data

Inventory
  → current warehouse state

InventoryAdjustment
  → immutable stock movement history

Reservation
  → temporary stock lock

Order
  → business order lifecycle

Settings
  → configurable inventory and reservation rules
```

This architecture keeps the project:

- scalable;
- understandable;
- cleanly separated by business domains;
- realistic for modern e-commerce systems;
- useful for automation testing education;
- ready for storefront implementation;
- powerful without becoming ERP-level overengineering.
