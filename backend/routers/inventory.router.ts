import Router from "express";
import { authmiddleware } from "../middleware/authmiddleware.js";
import { schemaMiddleware } from "../middleware/schemaMiddleware.js";
import InventoryController from "../controllers/inventory.controller.js";
import {
  inventoryAdjustmentValidation,
  inventoryAdjustmentsQueryValidation,
  inventoryListValidation,
  inventoryProductById,
  inventoryReservationsListValidation,
  inventoryVariantById,
} from "../middleware/inventoryMiddleware.js";

const inventoryRouter = Router();

inventoryRouter.get("/inventory", authmiddleware, inventoryListValidation, InventoryController.getList.bind(InventoryController));

inventoryRouter.get(
  "/inventory/reservations",
  authmiddleware,
  inventoryReservationsListValidation,
  InventoryController.getReservationsList.bind(InventoryController),
);

inventoryRouter.get(
  "/inventory/products/:productId",
  authmiddleware,
  inventoryProductById,
  InventoryController.getByProductId.bind(InventoryController),
);

inventoryRouter.post(
  "/inventory/adjustments",
  authmiddleware,
  schemaMiddleware("inventoryAdjustmentCreateSchema"),
  inventoryAdjustmentValidation,
  InventoryController.createAdjustment.bind(InventoryController),
);

inventoryRouter.patch(
  "/inventory/products/:productId/variants/:variantId/settings",
  authmiddleware,
  schemaMiddleware("inventoryVariantSettingsPatchSchema"),
  inventoryVariantById,
  InventoryController.patchVariantSettings.bind(InventoryController),
);

inventoryRouter.get(
  "/inventory/products/:productId/adjustments",
  authmiddleware,
  inventoryProductById,
  inventoryAdjustmentsQueryValidation,
  InventoryController.getProductAdjustments.bind(InventoryController),
);

inventoryRouter.get(
  "/inventory/products/:productId/variants/:variantId/adjustments",
  authmiddleware,
  inventoryVariantById,
  inventoryAdjustmentsQueryValidation,
  InventoryController.getVariantAdjustments.bind(InventoryController),
);

/**
 * @swagger
 * tags:
 *   - name: Inventory
 *     description: Inventory tracking and stock adjustments
 * components:
 *   schemas:
 *     InventoryProductSnapshot:
 *       type: object
 *       required: [_id, name, manufacturer, status]
 *       properties:
 *         _id:
 *           type: string
 *         name:
 *           type: string
 *         manufacturer:
 *           type: string
 *         status:
 *           type: string
 *           enum: [Draft, Active, Archived]
 *     InventoryListItem:
 *       type: object
 *       required: [_id, productId, product, status, inventoryStatus, variantsCount, lowStockVariantsCount, outOfStockVariantsCount, updatedOn]
 *       properties:
 *         _id:
 *           type: string
 *         productId:
 *           type: string
 *         product:
 *           $ref: '#/components/schemas/InventoryProductSnapshot'
 *         status:
 *           type: string
 *           enum: [Active, Archived]
 *         inventoryStatus:
 *           type: string
 *           enum: [In Stock, Low Stock, Out Of Stock, Not Tracked]
 *         variantsCount:
 *           type: integer
 *         lowStockVariantsCount:
 *           type: integer
 *         outOfStockVariantsCount:
 *           type: integer
 *         updatedOn:
 *           type: string
 *           format: date-time
 *     InventoryVariant:
 *       type: object
 *       required: [variantId, quantity, reserved, available, lowStockThreshold, allowSellingOutOfStock, stockStatus, status, updatedOn]
 *       properties:
 *         variantId:
 *           type: string
 *         quantity:
 *           type: integer
 *           minimum: 0
 *         reserved:
 *           type: integer
 *           minimum: 0
 *         available:
 *           type: integer
 *           minimum: 0
 *         lowStockThreshold:
 *           type: integer
 *           minimum: 0
 *         allowSellingOutOfStock:
 *           type: boolean
 *         stockStatus:
 *           type: string
 *           enum: [In Stock, Low Stock, Out Of Stock, Not Tracked]
 *         status:
 *           type: string
 *           enum: [Active, Archived]
 *         updatedOn:
 *           type: string
 *           format: date-time
 *     InventoryItem:
 *       type: object
 *       required: [productId, totalQuantity, totalReserved, totalAvailable, inventoryStatus, lowStockVariantsCount, outOfStockVariantsCount, variants, status, createdOn, updatedOn]
 *       properties:
 *         _id:
 *           type: string
 *         productId:
 *           type: string
 *         totalQuantity:
 *           type: integer
 *         totalReserved:
 *           type: integer
 *         totalAvailable:
 *           type: integer
 *         inventoryStatus:
 *           type: string
 *           enum: [In Stock, Low Stock, Out Of Stock, Not Tracked]
 *         lowStockVariantsCount:
 *           type: integer
 *         outOfStockVariantsCount:
 *           type: integer
 *         variants:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/InventoryVariant'
 *         status:
 *           type: string
 *           enum: [Active, Archived]
 *         createdOn:
 *           type: string
 *           format: date-time
 *         updatedOn:
 *           type: string
 *           format: date-time
 *         product:
 *           $ref: '#/components/schemas/InventoryProductSnapshot'
 *     InventoryResponse:
 *       type: object
 *       required: [Inventory, IsSuccess, ErrorMessage]
 *       properties:
 *         Inventory:
 *           $ref: '#/components/schemas/InventoryItem'
 *         IsSuccess:
 *           type: boolean
 *         ErrorMessage:
 *           type: string
 *           nullable: true
 *     InventoryListResponse:
 *       type: object
 *       required: [Inventories, total, page, limit, search, manufacturer, productStatus, inventoryStatus, sorting, IsSuccess, ErrorMessage]
 *       properties:
 *         Inventories:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/InventoryListItem'
 *         total:
 *           type: number
 *         page:
 *           type: number
 *         limit:
 *           type: number
 *         search:
 *           type: string
 *         manufacturer:
 *           type: array
 *           items:
 *             type: string
 *         productStatus:
 *           type: array
 *           items:
 *             type: string
 *             enum: [Draft, Active, Archived]
 *         inventoryStatus:
 *           type: array
 *           items:
 *             type: string
 *             enum: [In Stock, Low Stock, Out Of Stock, Not Tracked]
 *         sorting:
 *           type: object
 *           required: [sortField, sortOrder]
 *           properties:
 *             sortField:
 *               type: string
 *               enum: [updatedOn, inventoryStatus, product.name, manufacturer]
 *             sortOrder:
 *               type: string
 *               enum: [asc, desc]
 *         IsSuccess:
 *           type: boolean
 *         ErrorMessage:
 *           type: string
 *           nullable: true
 *     InventoryManualAdjustmentType:
 *       type: string
 *       enum: [Manual Increase, Manual Decrease, Manual Correction, Damage, Return]
 *     InventoryAdjustmentType:
 *       type: string
 *       enum: [Initial Stock, Manual Increase, Manual Decrease, Manual Correction, Reserve, Release, Sale, Return, Damage, Expired Reservation]
 *     InventoryAdjustment:
 *       type: object
 *       required: [inventoryId, productId, variantId, type, quantityChange, quantityBefore, quantityAfter, reservedBefore, reservedAfter, createdBy, createdOn]
 *       properties:
 *         _id:
 *           type: string
 *         inventoryId:
 *           type: string
 *         productId:
 *           type: string
 *         variantId:
 *           type: string
 *         type:
 *           $ref: '#/components/schemas/InventoryAdjustmentType'
 *         quantityChange:
 *           type: integer
 *         quantityBefore:
 *           type: integer
 *         quantityAfter:
 *           type: integer
 *         reservedBefore:
 *           type: integer
 *         reservedAfter:
 *           type: integer
 *         reason:
 *           type: string
 *           nullable: true
 *         comment:
 *           type: string
 *           nullable: true
 *         orderId:
 *           type: string
 *           nullable: true
 *         reservationId:
 *           type: string
 *           nullable: true
 *         createdBy:
 *           type: string
 *         createdOn:
 *           type: string
 *           format: date-time
 *     InventoryAdjustmentsListResponse:
 *       type: object
 *       required: [Adjustments, total, page, limit, sortOrder, IsSuccess, ErrorMessage]
 *       properties:
 *         Adjustments:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/InventoryAdjustment'
 *         total:
 *           type: number
 *         page:
 *           type: number
 *         limit:
 *           type: number
 *         sortOrder:
 *           type: string
 *           enum: [asc, desc]
 *         IsSuccess:
 *           type: boolean
 *         ErrorMessage:
 *           type: string
 *           nullable: true
 *     InventoryReservationType:
 *       type: string
 *       enum: [Admin Draft, Order Processing, Customer Draft]
 *     InventoryReservationLine:
 *       type: object
 *       required: [productId, variantId, productName, manufacturer, variantLabel, reservedQuantity]
 *       properties:
 *         productId:
 *           type: string
 *         variantId:
 *           type: string
 *         productName:
 *           type: string
 *         manufacturer:
 *           type: string
 *         variantLabel:
 *           type: string
 *         reservedQuantity:
 *           type: integer
 *           minimum: 0
 *     InventoryReservationItem:
 *       type: object
 *       required: [_id, orderId, type, expiresAt, createdOn, updatedOn, customer, items, reservedProductsCount, reservedUnits, isExpired]
 *       properties:
 *         _id:
 *           type: string
 *         orderId:
 *           type: string
 *         type:
 *           $ref: '#/components/schemas/InventoryReservationType'
 *         expiresAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         createdOn:
 *           type: string
 *           format: date-time
 *         updatedOn:
 *           type: string
 *           format: date-time
 *         customer:
 *           type: object
 *           nullable: true
 *           properties:
 *             _id:
 *               type: string
 *             name:
 *               type: string
 *             email:
 *               type: string
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/InventoryReservationLine'
 *         reservedProductsCount:
 *           type: integer
 *           minimum: 0
 *         reservedUnits:
 *           type: integer
 *           minimum: 0
 *         isExpired:
 *           type: boolean
 *     InventoryReservationsSummary:
 *       type: object
 *       required: [activeReservations, expiringSoon, processing, reservedUnits]
 *       properties:
 *         activeReservations:
 *           type: integer
 *           minimum: 0
 *         expiringSoon:
 *           type: integer
 *           minimum: 0
 *         processing:
 *           type: integer
 *           minimum: 0
 *         reservedUnits:
 *           type: integer
 *           minimum: 0
 *     InventoryReservationsListResponse:
 *       type: object
 *       required: [Reservations, summary, total, page, limit, search, type, fromDate, toDate, expiresBefore, sorting, IsSuccess, ErrorMessage]
 *       properties:
 *         Reservations:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/InventoryReservationItem'
 *         summary:
 *           $ref: '#/components/schemas/InventoryReservationsSummary'
 *         total:
 *           type: integer
 *           minimum: 0
 *         page:
 *           type: integer
 *           minimum: 1
 *         limit:
 *           type: integer
 *           minimum: 1
 *         search:
 *           type: string
 *         type:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/InventoryReservationType'
 *         fromDate:
 *           type: string
 *         toDate:
 *           type: string
 *         expiresBefore:
 *           type: string
 *         sorting:
 *           type: object
 *           required: [sortField, sortOrder]
 *           properties:
 *             sortField:
 *               type: string
 *               enum: [createdOn, expiresAt]
 *             sortOrder:
 *               type: string
 *               enum: [asc, desc]
 *         IsSuccess:
 *           type: boolean
 *         ErrorMessage:
 *           type: string
 *           nullable: true
 *     InventoryVariantSettingsPatchPayload:
 *       type: object
 *       additionalProperties: false
 *       properties:
 *         lowStockThreshold:
 *           type: integer
 *           minimum: 0
 *         allowSellingOutOfStock:
 *           type: boolean
 *       anyOf:
 *         - required: [lowStockThreshold]
 *         - required: [allowSellingOutOfStock]
 *     InventoryAdjustmentCreatePayload:
 *       type: object
 *       additionalProperties: false
 *       required: [productId, variantId, type, quantity]
 *       properties:
 *         productId:
 *           type: string
 *         variantId:
 *           type: string
 *         type:
 *           $ref: '#/components/schemas/InventoryManualAdjustmentType'
 *         quantity:
 *           type: integer
 *           minimum: 1
 *         reason:
 *           type: string
 *         comment:
 *           type: string
 *     InventoryErrorResponse:
 *       type: object
 *       required: [IsSuccess, ErrorMessage]
 *       properties:
 *         IsSuccess:
 *           type: boolean
 *           example: false
 *         ErrorMessage:
 *           type: string
 *
 * /api/inventory:
 *   get:
 *     summary: Get paginated inventory list
 *     tags: [Inventory]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by product name or manufacturer
 *       - in: query
 *         name: manufacturer
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         style: form
 *         explode: true
 *         description: Filter by manufacturer
 *       - in: query
 *         name: productStatus
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *             enum: [Draft, Active, Archived]
 *         style: form
 *         explode: true
 *         description: Filter by product status
 *       - in: query
 *         name: inventoryStatus
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *             enum: [In Stock, Low Stock, Out Of Stock, Not Tracked]
 *         style: form
 *         explode: true
 *         description: Filter by inventory status
 *       - in: query
 *         name: sortField
 *         schema:
 *           type: string
 *           enum: [updatedOn, inventoryStatus, product.name, manufacturer]
 *         description: Sort field (`inventoryStatus` uses severity order Out Of Stock -> Low Stock -> In Stock -> Not Tracked)
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *       - in: query
 *         name: page
 *         schema:
 *           type: string
 *           example: "1"
 *       - in: query
 *         name: limit
 *         schema:
 *           type: string
 *           example: "10"
 *     responses:
 *       200:
 *         description: Inventory list fetched
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InventoryListResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InventoryErrorResponse'
 *       401:
 *         description: Unauthorized, missing or invalid token
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InventoryErrorResponse'
 *
 * /api/inventory/reservations:
 *   get:
 *     summary: Get paginated inventory reservations list
 *     tags: [Inventory]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by order id (Mongo ObjectId string)
 *       - in: query
 *         name: type
 *         schema:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/InventoryReservationType'
 *         style: form
 *         explode: true
 *         description: Filter by reservation type
 *       - in: query
 *         name: fromDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Include reservations created on or after this date-time
 *       - in: query
 *         name: toDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Include reservations created on or before this date-time
 *       - in: query
 *         name: expiresBefore
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Include reservations with expiresAt less than or equal to this date-time
 *       - in: query
 *         name: sortField
 *         schema:
 *           type: string
 *           enum: [createdOn, expiresAt]
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *       - in: query
 *         name: page
 *         schema:
 *           type: string
 *           example: "1"
 *       - in: query
 *         name: limit
 *         schema:
 *           type: string
 *           example: "10"
 *     responses:
 *       200:
 *         description: Reservations list fetched
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InventoryReservationsListResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InventoryErrorResponse'
 *       401:
 *         description: Unauthorized, missing or invalid token
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InventoryErrorResponse'
 *
 * /api/inventory/products/{productId}:
 *   get:
 *     summary: Get inventory details by product id
 *     tags: [Inventory]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         description: Product id
 *     responses:
 *       200:
 *         description: Inventory details fetched
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InventoryResponse'
 *       400:
 *         description: Invalid path params
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InventoryErrorResponse'
 *       401:
 *         description: Unauthorized, missing or invalid token
 *       404:
 *         description: Product not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InventoryErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InventoryErrorResponse'
 *
 * /api/inventory/adjustments:
 *   post:
 *     summary: Create manual inventory adjustment
 *     tags: [Inventory]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/InventoryAdjustmentCreatePayload'
 *     responses:
 *       200:
 *         description: Inventory adjusted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InventoryResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InventoryErrorResponse'
 *       409:
 *         description: Business conflict (for example insufficient stock or invalid invariant transition)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InventoryErrorResponse'
 *       401:
 *         description: Unauthorized, missing or invalid token
 *       404:
 *         description: Product, variant, or inventory was not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InventoryErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InventoryErrorResponse'
 *
 * /api/inventory/products/{productId}/variants/{variantId}/settings:
 *   patch:
 *     summary: Update inventory variant settings
 *     tags: [Inventory]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         description: Product id
 *       - in: path
 *         name: variantId
 *         required: true
 *         schema:
 *           type: string
 *         description: Variant id
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/InventoryVariantSettingsPatchPayload'
 *     responses:
 *       200:
 *         description: Variant settings updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InventoryResponse'
 *       400:
 *         description: Validation error or invalid path params
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InventoryErrorResponse'
 *       409:
 *         description: Business conflict (for example disabling out-of-stock selling when quantity is below reserved)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InventoryErrorResponse'
 *       401:
 *         description: Unauthorized, missing or invalid token
 *       404:
 *         description: Product, variant, or inventory was not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InventoryErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InventoryErrorResponse'
 *
 * /api/inventory/products/{productId}/adjustments:
 *   get:
 *     summary: Get product inventory adjustments history
 *     tags: [Inventory]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         description: Product id
 *       - in: query
 *         name: type
 *         schema:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/InventoryAdjustmentType'
 *         style: form
 *         explode: true
 *         description: Filter by adjustment type
 *       - in: query
 *         name: orderId
 *         schema:
 *           type: string
 *         description: Filter by order id
 *       - in: query
 *         name: reservationId
 *         schema:
 *           type: string
 *         description: Filter by reservation id
 *       - in: query
 *         name: createdBy
 *         schema:
 *           type: string
 *         description: Filter by manager id
 *       - in: query
 *         name: fromDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Include adjustments created on or after this date-time
 *       - in: query
 *         name: toDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Include adjustments created on or before this date-time
 *       - in: query
 *         name: page
 *         schema:
 *           type: string
 *           example: "1"
 *       - in: query
 *         name: limit
 *         schema:
 *           type: string
 *           example: "10"
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *     responses:
 *       200:
 *         description: Adjustments history fetched
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InventoryAdjustmentsListResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InventoryErrorResponse'
 *       401:
 *         description: Unauthorized, missing or invalid token
 *       404:
 *         description: Product not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InventoryErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InventoryErrorResponse'
 *
 * /api/inventory/products/{productId}/variants/{variantId}/adjustments:
 *   get:
 *     summary: Get variant inventory adjustments history
 *     tags: [Inventory]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         description: Product id
 *       - in: path
 *         name: variantId
 *         required: true
 *         schema:
 *           type: string
 *         description: Variant id
 *       - in: query
 *         name: type
 *         schema:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/InventoryAdjustmentType'
 *         style: form
 *         explode: true
 *         description: Filter by adjustment type
 *       - in: query
 *         name: orderId
 *         schema:
 *           type: string
 *         description: Filter by order id
 *       - in: query
 *         name: reservationId
 *         schema:
 *           type: string
 *         description: Filter by reservation id
 *       - in: query
 *         name: createdBy
 *         schema:
 *           type: string
 *         description: Filter by manager id
 *       - in: query
 *         name: fromDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Include adjustments created on or after this date-time
 *       - in: query
 *         name: toDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Include adjustments created on or before this date-time
 *       - in: query
 *         name: page
 *         schema:
 *           type: string
 *           example: "1"
 *       - in: query
 *         name: limit
 *         schema:
 *           type: string
 *           example: "10"
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *     responses:
 *       200:
 *         description: Adjustments history fetched
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InventoryAdjustmentsListResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InventoryErrorResponse'
 *       401:
 *         description: Unauthorized, missing or invalid token
 *       404:
 *         description: Product or variant not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InventoryErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InventoryErrorResponse'
 */

export default inventoryRouter;
