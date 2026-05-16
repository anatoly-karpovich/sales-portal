# Inventory Implementation Blueprint for Sales Portal

# 0. Goal

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
- Product and Order responsibilities are already separated.

Inventory should therefore become:

```text
Product
Inventory
InventoryAdjustment
Reservation
Settings
```

---

# 1. Core Architecture

## Product

Responsible only for catalog data:

- name;
- manufacturer;
- category;
- description;
- image;
- variants;
- statuses;
- prices.

Product should NOT become a warehouse entity.

---

## Inventory

Responsible for current stock state.

One Inventory document per Product.

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

      updatedOn: Date;
    }
  ];

  status: "ACTIVE" | "ARCHIVED";

  createdOn: Date;
  updatedOn: Date;
}
```

---

## InventoryAdjustment

Immutable stock movement history.

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
“How much stock exists now?”

InventoryAdjustment answers:
“Why did stock become this value?”
```

---

## Reservation

Temporary inventory lock. Used for Draft orders

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
- no heavy order scans.

---

# 2. Settings

```ts
inventory: {
  defaultLowStockThreshold: 5;
  allowSellingOutOfStockByDefault: false;
}

reservations: {
  adminDraftReservationHours: 24;
  customerPaymentReservationMinutes: 15;
  cronIntervalMinutes: 5;
}
```

Business rules must not be hardcoded.

---

# 3. Inventory Creation Flow

## Product Creation

```text
POST /api/products
→ create Product
→ create Inventory document
→ create inventory variant entries
→ return Product DTO
```

Initial variant inventory:

```ts
{
  quantity: 0,
  reserved: 0,
  available: 0,
  lowStockThreshold: default,
  allowSellingOutOfStock: default,
  stockStatus: "OUT_OF_STOCK"
}
```

Reason:

Creating catalog data does not mean stock physically exists.

---

# 4. Variant Synchronization

Inventory must always mirror Product variants.

---

## Add Variant

```text
POST /products/:productId/variants
→ add Product variant
→ add Inventory variant entry
```

---

## Delete Variant

If variant:

- never existed in orders;
- has no stock;
- has no adjustments;

then it may be removed physically.

Otherwise:

```text
Archive inventory variant.
```

Do not destroy inventory history.

---

## Archive Product

```text
Product Archived
→ Inventory Archived
→ hidden from default inventory list
→ history preserved
```

---

# 5. Inventory Status Calculations

## Available Formula

```text
available = quantity - reserved
```

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

---

## Parent Inventory Status

```text
if all variants NOT_TRACKED:
  NOT_TRACKED

else if any variant OUT_OF_STOCK:
  OUT_OF_STOCK

else if any variant LOW_STOCK:
  LOW_STOCK

else:
  IN_STOCK
```

Inventory summary should also include:

```ts
lowStockVariantsCount;
outOfStockVariantsCount;
totalAvailable;
```

---

# 6. Inventory Service

Core methods:

```ts
InventoryService.createForProduct(product);
InventoryService.syncWithProductVariants(product);
InventoryService.getByProductId(productId);
InventoryService.getList(filters, pagination, sorting);
InventoryService.adjustStock(payload, managerId);
InventoryService.reserveItems(orderId, items, reservationType);
InventoryService.releaseReservation(reservationId);
InventoryService.completeReservation(reservationId);
InventoryService.recalculateInventorySummary(inventoryId);
InventoryService.recalculateVariantStatus(variant);
```

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
  available >= requestedQuantity
)
→ increment reserved
```

If update fails:

```text
Not enough stock.
```

---

# 8. Order Integration

---

## Draft Order Creation

```text
Manager creates Draft order
→ validate stock
→ reserve inventory
→ create Reservation
→ create InventoryAdjustment RESERVE
→ create Draft order
```

Reservation expiration:

```text
now + adminDraftReservationHours
```

---

## Draft Order Edit

While Draft:

- products may change;
- reservation recalculated.

MVP approach:

```text
Release old reservation
→ reserve new products
→ update order
```

Advanced approach:

```text
Calculate reservation diff.
```

---

## Draft → In Process

```text
Order becomes locked.
Reservation for order (Temporary inventory lock) COMPLETED
```

No additional stock validation required.

Reason:

Stock was already reserved.

---

## Cancel Order

```text
Release reserved inventory
→ Reservation RELEASED
→ create RELEASE adjustments
→ Order Cancelled
```

---

## Complete Order

```text
quantity -= sold quantity
reserved -= sold quantity
→ create SALE adjustments
```

Reserved stock becomes real warehouse reduction.

---

# 9. Reservation Expiration Cron

## Job

```text
ExpireReservationsJob
```

Runs every:

```text
5–10 minutes
```

---

## Flow

```text
Find ACTIVE reservations where expiresAt <= now
→ release inventory
→ create adjustments
→ mark reservation EXPIRED
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

---

# 10. Customer Checkout Flow (Future)

---

## Cart

```text
Cart does NOT reserve inventory.
```

Reason:

Cart is weak intent.

Otherwise users block warehouse stock.

---

## Checkout Started

```text
Customer starts checkout
→ validate stock
→ reserve inventory
→ create Pending Payment order
→ create Reservation CUSTOMER_PAYMENT
→ expiresAt = now + 15min
```

---

## Payment Success

```text
Order → In Process
Reservation remains ACTIVE
```

---

## Payment Failed/Expired

```text
Release reservation
→ order cancelled/expired
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
category
inventoryStatus
lowStockOnly
outOfStockOnly
page
limit
sortField
sortOrder
```

---

## Product Inventory Details

```http
GET /api/inventory/products/:productId
```

Returns:

- product info;
- inventory summary;
- variant inventory state.

---

## Manual Adjustment

```http
POST /api/inventory/adjustments
```

Purpose:

Inventory changes are business events.

Not simple PATCH operations.

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

---

## Inventory History

```http
GET /api/inventory/products/:productId/adjustments
GET /api/inventory/products/:productId/variants/:variantId/adjustments
```

---

# 12. Error Handling

---

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

---

# 13. Frontend Architecture

---

# Sidebar

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

# Products List Integration

Do NOT transform Products list into inventory table.

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

# Product Details Integration

Do not overload Product Details.

Add only:

- inventory badges;
- available counts;
- Manage Inventory action.

Variants table example:

```text
Variant | Price | Status | Available | Inventory Badge
```

---

# Product Inventory Page

Main warehouse screen for one product.

Route:

```text
/products/:productId/inventory
```

---

## Header

```text
Product name
Manufacturer
Category
Status
```

Actions:

```text
Adjust stock
View history
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

# Adjust Stock Modal

Do NOT create separate pages per variant.

Use modal/drawer.

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

Adjustment types:

```text
Increase stock
Decrease stock
Set exact quantity
Damaged
Return
```

---

# Inventory Variant Settings Modal

Fields:

```text
Low stock threshold
Allow selling out of stock
```

---

# Global Inventory Page

Route:

```text
/inventory
```

Purpose:

Warehouse overview.

---

## Table

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

---

## Filters

```text
Search
Category
Manufacturer
Inventory status
Low stock only
Out of stock only
```

---

## Sorting

```text
Available
Reserved
Updated on
Low stock count
Out of stock count
```

---

# Inventory History UI

Prefer tabs:

```text
Overview | Adjustments history
```

Columns:

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

# Orders Integration UI

---

## Draft Orders

Show:

```text
Reserved until: 12 May 2026 18:30
```

Warning:

```text
Reservation expires in 2h 15m
```

---

## Create Order Flow

When selecting variants:

```text
Available: 8
Reserved: 2
```

Backend still performs final validation.

---

# Product Deletion Strategy

If product:

- has inventory history;
- participated in orders;
- contains adjustments;

then:

```text
Archive instead of delete.
```

Reason:

Inventory and order history should not disappear.

---

# Metrics

Orders metrics:

```text
Revenue
Orders count
Average order value
Top selling products
```

Inventory metrics:

```text
Current stock
Reserved stock
Low stock products
Dead stock
Damaged stock
Inventory movement
```

Orders answer:

```text
What was sold?
```

Inventory answers:

```text
What happened in the warehouse?
```

---

# Future Extensions

Inventory architecture already prepares the project for:

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

# What NOT To Build Now

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

---

# Recommended Implementation Order

## Phase 1

Core inventory:

```text
Inventory model
InventoryAdjustment model
Inventory service
Inventory creation on Product create
Product inventory page
Manual adjustments
```

---

## Phase 2

UI integration:

```text
Products list inventory summary
Inventory badges
Global inventory page
Manage inventory links
```

---

## Phase 3

Reservation system:

```text
Reservation model
Reserve on Draft order
Release on Cancel
Complete on Order complete
```

---

## Phase 4

Expiration system:

```text
Cron job
Reservation expiration
Auto release
Expired orders
```

---

## Phase 5

Customer checkout:

```text
Pending Payment
Short reservation window
Payment expiration
Reservation release
```

---

# Final Architecture

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
```

This architecture keeps the project:

- scalable;
- understandable;
- cleanly separated by business domains;
- realistic for modern e-commerce systems;
- powerful without becoming ERP-level overengineering.
