import Router from "express";
import OrderController from "../controllers/order.controller.js";
import { authmiddleware } from "../middleware/authmiddleware.js";
import { orderById, orderValidations, orderUpdateValidations } from "../middleware/orderMiddleware.js";
import { schemaMiddleware } from "../middleware/schemaMiddleware.js";
import { isManager, managerById } from "../middleware/managersMiddleware.js";

const orderRouter = Router();

orderRouter.post(
  "/orders",
  authmiddleware,
  schemaMiddleware("orderCreateSchema"),
  orderValidations,
  OrderController.create.bind(OrderController),
);

orderRouter.get("/orders", authmiddleware, OrderController.getAll.bind(OrderController));

orderRouter.post("/orders/export", authmiddleware, OrderController.export.bind(OrderController));

orderRouter.get("/orders/:orderId", authmiddleware, orderById, OrderController.getOrder.bind(OrderController));

orderRouter.patch(
  "/orders/:orderId",
  authmiddleware,
  schemaMiddleware("orderUpdateSchema"),
  orderById,
  orderUpdateValidations,
  orderValidations,
  OrderController.update.bind(OrderController),
);
orderRouter.delete("/orders/:orderId", authmiddleware, orderById, OrderController.delete.bind(OrderController));

orderRouter.put(
  "/orders/:orderId/assign-manager/:managerId",
  authmiddleware,
  orderById,
  managerById,
  isManager,
  OrderController.assignManager.bind(OrderController),
);
orderRouter.put(
  "/orders/:orderId/unassign-manager",
  authmiddleware,
  orderById,
  OrderController.unassignManager.bind(OrderController),
);

/**
 * @swagger
 * tags:
 *   - name: Orders
 *     description: Orders management service
 * components:
 *   schemas:
 *     OrderCustomerSnapshot:
 *       type: object
 *       required: [_id, email, name]
 *       properties:
 *         _id:
 *           type: string
 *         email:
 *           type: string
 *         name:
 *           type: string
 *     OrderCustomerFull:
 *       type: object
 *       required: [_id, email, name, state, city, street, house, zipCode, phone, createdOn]
 *       properties:
 *         _id:
 *           type: string
 *         email:
 *           type: string
 *         name:
 *           type: string
 *         state:
 *           type: string
 *           enum: [AL, AK, AZ, AR, CA, CO, CT, DE, FL, GA, HI, ID, IL, IN, IA, KS, KY, LA, ME, MD, MA, MI, MN, MS, MO, MT, NE, NV, NH, NJ, NM, NY, NC, ND, OH, OK, OR, PA, RI, SC, SD, TN, TX, UT, VT, VA, WA, WV, WI, WY]
 *         city:
 *           type: string
 *         street:
 *           type: string
 *         house:
 *           type: number
 *         apartment:
 *           type: number
 *           nullable: true
 *         zipCode:
 *           type: string
 *           pattern: ^\\d{5}(-\\d{4})?$
 *         phone:
 *           type: string
 *         createdOn:
 *           type: string
 *           format: date-time
 *         notes:
 *           type: string
 *           nullable: true
 *     ManagerSnapshot:
 *       type: object
 *       required: [_id, username, firstName, lastName, roles, createdOn]
 *       properties:
 *         _id:
 *           type: string
 *         username:
 *           type: string
 *         firstName:
 *           type: string
 *         lastName:
 *           type: string
 *         roles:
 *           type: array
 *           items:
 *             type: string
 *         createdOn:
 *           type: string
 *           format: date-time
 *     ProductInOrder:
 *       type: object
 *       required: [product, unitPrice, quantity, received]
 *       properties:
 *         product:
 *           type: object
 *           required: [_id, name, manufacturer]
 *           properties:
 *             _id:
 *               type: string
 *             name:
 *               type: string
 *             manufacturer:
 *               type: string
 *               enum: [Apple, Samsung, Google, Microsoft, Sony, Xiaomi, Amazon, Tesla]
 *         unitPrice:
 *           type: number
 *         quantity:
 *           type: integer
 *           minimum: 1
 *         received:
 *           type: boolean
 *     DeliveryAddress:
 *       type: object
 *       required: [state, city, street, house, zipCode]
 *       properties:
 *         state:
 *           type: string
 *           enum: [AL, AK, AZ, AR, CA, CO, CT, DE, FL, GA, HI, ID, IL, IN, IA, KS, KY, LA, ME, MD, MA, MI, MN, MS, MO, MT, NE, NV, NH, NJ, NM, NY, NC, ND, OH, OK, OR, PA, RI, SC, SD, TN, TX, UT, VT, VA, WA, WV, WI, WY]
 *         city:
 *           type: string
 *         street:
 *           type: string
 *         house:
 *           type: number
 *         apartment:
 *           type: number
 *           nullable: true
 *         zipCode:
 *           type: string
 *           pattern: ^\\d{5}(-\\d{4})?$
 *     Delivery:
 *       type: object
 *       required: [status, condition, price, pricingTier, schedule, address]
 *       properties:
 *         status:
 *           type: string
 *           enum: [Draft, Delivery Planned, Pickup Planned, Delivery Scheduled, Pickup Scheduled, Partially Delivered, Delivered]
 *         condition:
 *           type: string
 *           enum: [Delivery, Pickup]
 *         price:
 *           type: number
 *         pricingTier:
 *           type: string
 *           enum: [pickup, local_city, same_state, out_of_state]
 *         isOverdue:
 *           type: boolean
 *         overdueByDays:
 *           type: integer
 *         schedule:
 *           type: object
 *           oneOf:
 *             - type: object
 *               required: [express, estimatedDays, estimatedDate, startsAt, dueDate]
 *               properties:
 *                 express:
 *                   type: boolean
 *                 estimatedDays:
 *                   type: integer
 *                 estimatedDate:
 *                   type: string
 *                   pattern: ^\d{4}-\d{2}-\d{2}$
 *                 startsAt:
 *                   type: string
 *                   pattern: ^\d{4}-\d{2}-\d{2}$
 *                   nullable: true
 *                 dueDate:
 *                   type: string
 *                   pattern: ^\d{4}-\d{2}-\d{2}$
 *                   nullable: true
 *             - type: object
 *               required: [readyInDays, holdForDays, availableFromDate, pickupByDate, startsAt]
 *               properties:
 *                 readyInDays:
 *                   type: integer
 *                 holdForDays:
 *                   type: integer
 *                 availableFromDate:
 *                   type: string
 *                   pattern: ^\d{4}-\d{2}-\d{2}$
 *                 pickupByDate:
 *                   type: string
 *                   pattern: ^\d{4}-\d{2}-\d{2}$
 *                 startsAt:
 *                   type: string
 *                   pattern: ^\d{4}-\d{2}-\d{2}$
 *                   nullable: true
 *         address:
 *           $ref: '#/components/schemas/DeliveryAddress'
 *     OrderComment:
 *       type: object
 *       required: [text, createdOn]
 *       properties:
 *         _id:
 *           type: string
 *         text:
 *           type: string
 *         createdOn:
 *           type: string
 *           format: date-time
 *         createdBy:
 *           nullable: true
 *           oneOf:
 *             - type: object
 *               required: [_id, username, firstName, lastName]
 *               properties:
 *                 _id:
 *                   type: string
 *                 username:
 *                   type: string
 *                 firstName:
 *                   type: string
 *                 lastName:
 *                   type: string
 *             - type: string
 *     OrderHistoryEntry:
 *       type: object
 *       required: [status, customer, products, total_price, delivery, changedOn, action, performer]
 *       properties:
 *         status:
 *           type: string
 *           enum: [Draft, In Process, Completed, Canceled]
 *         customer:
 *           type: string
 *         products:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ProductInOrder'
 *         total_price:
 *           type: number
 *         delivery:
 *           $ref: '#/components/schemas/Delivery'
 *         changedOn:
 *           type: string
 *           format: date-time
 *         action:
 *           type: string
 *           enum:
 *             - Order created
 *             - Customer changed
 *             - Requested products changed
 *             - Order processing started
 *             - Delivery Planned
 *             - Delivery Scheduled
 *             - Delivery Edited
 *             - Pickup Planned
 *             - Pickup Scheduled
 *             - Pickup Edited
 *             - Received
 *             - All products received
 *             - Order canceled
 *             - Manager Assigned
 *             - Manager Unassigned
 *             - Order reopened
 *         performer:
 *           $ref: '#/components/schemas/ManagerSnapshot'
 *         assignedManager:
 *           type: object
 *           allOf:
 *             - $ref: '#/components/schemas/ManagerSnapshot'
 *           nullable: true
 *     OrderListItem:
 *       type: object
 *       required: [_id, status, customer, products, delivery, total_price, createdOn]
 *       properties:
 *         _id:
 *           type: string
 *         status:
 *           type: string
 *           enum: [Draft, In Process, Completed, Canceled]
 *         customer:
 *           $ref: '#/components/schemas/OrderCustomerSnapshot'
 *         products:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ProductInOrder'
 *         delivery:
 *           $ref: '#/components/schemas/Delivery'
 *         total_price:
 *           type: number
 *         createdOn:
 *           type: string
 *           format: date-time
 *         assignedManager:
 *           type: object
 *           allOf:
 *             - $ref: '#/components/schemas/ManagerSnapshot'
 *           nullable: true
 *     OrderDetails:
 *       allOf:
 *         - $ref: '#/components/schemas/OrderListItem'
 *         - type: object
 *           properties:
 *             customer:
 *               $ref: '#/components/schemas/OrderCustomerFull'
 *             comments:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/OrderComment'
 *             history:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/OrderHistoryEntry'
 *     OrdersListResponse:
 *       type: object
 *       required: [Orders, total, page, limit, search, status, deliveryStatus, sorting, IsSuccess, ErrorMessage]
 *       properties:
 *         Orders:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/OrderListItem'
 *         total:
 *           type: number
 *         page:
 *           type: number
 *         limit:
 *           type: number
 *         search:
 *           type: string
 *         status:
 *           type: array
 *           items:
 *             type: string
 *         deliveryStatus:
 *           type: array
 *           items:
 *             type: string
 *         sorting:
 *           type: object
 *           properties:
 *             sortField:
 *               type: string
 *               enum: [createdOn, total_price, status]
 *             sortOrder:
 *               type: string
 *               enum: [asc, desc]
 *         IsSuccess:
 *           type: boolean
 *         ErrorMessage:
 *           type: string
 *           nullable: true
 *     OrderResponse:
 *       type: object
 *       required: [Order, IsSuccess, ErrorMessage]
 *       properties:
 *         Order:
 *           $ref: '#/components/schemas/OrderDetails'
 *         IsSuccess:
 *           type: boolean
 *         ErrorMessage:
 *           type: string
 *           nullable: true
 *     OrderProductRequestItem:
 *       type: object
 *       required: [id, quantity]
 *       properties:
 *         id:
 *           type: string
 *           description: Product id
 *         quantity:
 *           type: integer
 *           minimum: 1
 *           description: Quantity of the product in the order
 *     CreateOrderPayload:
 *       type: object
 *       required: [customer, products]
 *       properties:
 *         customer:
 *           type: string
 *           description: Customer id
 *         products:
 *           type: array
 *           minItems: 1
 *           items:
 *             $ref: '#/components/schemas/OrderProductRequestItem'
 *           description: Array of order products with quantities
 *     UpdateOrderPatchPayload:
 *       type: object
 *       minProperties: 1
 *       properties:
 *         customer:
 *           type: string
 *           description: Customer id
 *         products:
 *           type: array
 *           minItems: 1
 *           items:
 *             $ref: '#/components/schemas/OrderProductRequestItem'
 *           description: Array of order products with quantities
 *     OrderExportPayload:
 *       type: object
 *       required: [format, fields]
 *       properties:
 *         format:
 *           type: string
 *           enum: [csv, json]
 *         filters:
 *           type: object
 *           nullable: true
 *           properties:
 *             search:
 *               type: string
 *             status:
 *               type: array
 *               items:
 *                 type: string
 *                 enum: [Draft, In Process, Completed, Canceled]
 *             deliveryStatus:
 *               type: array
 *               items:
 *                 type: string
 *                 enum: [Draft, Delivery Planned, Pickup Planned, Delivery Scheduled, Pickup Scheduled, Partially Delivered, Delivered]
 *             page:
 *               type: number
 *             limit:
 *               type: number
 *             sortField:
 *               type: string
 *               enum: [createdOn, total_price, status]
 *             sortOrder:
 *               type: string
 *               enum: [asc, desc]
 *         fields:
 *           type: array
 *           items:
 *             type: string
 *             enum: [status, deliveryStatus, total_price, delivery, customer, products, assignedManager, createdOn]
 *     OrderStatusPayload:
 *       type: object
 *       required: [status]
 *       properties:
 *         status:
 *           type: string
 *           enum: [Draft, In Process, Canceled]
 *     OrderReceivePayload:
 *       type: object
 *       required: [products]
 *       properties:
 *         products:
 *           type: array
 *           minItems: 1
 *           items:
 *             type: string
 *           description: Array of product ids to mark as received
 *     OrderCommentPayload:
 *       type: object
 *       required: [comment]
 *       properties:
 *         comment:
 *           type: string
 *     ApiErrorResponse:
 *       type: object
 *       required: [IsSuccess, ErrorMessage]
 *       properties:
 *         IsSuccess:
 *           type: boolean
 *           example: false
 *         ErrorMessage:
 *           type: string
 */

/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Create a new order
 *     tags: [Orders]
 *     parameters:
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateOrderPayload'
 *     responses:
 *       201:
 *         description: The order was successfully created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OrderResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       401:
 *         description: Unauthorized, missing or invalid token
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/orders:
 *   get:
 *     summary: Get paginated order list (customer snapshot)
 *     tags: [Orders]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for filtering orders by ID, customer name, customer email, total price, or statuses
 *       - in: query
 *         name: status
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *           example: ["In Process", "Draft"]
 *         description: Filter orders by status
 *       - in: query
 *         name: deliveryStatus
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *           example: ["Delivery Scheduled", "Draft"]
 *         description: Filter orders by delivery status
 *       - in: query
 *         name: sortField
 *         schema:
 *           type: string
 *           enum: [createdOn, total_price, status]
 *           example: createdOn
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           example: asc
 *         description: Sort order (ascending or descending)
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Paginated list of orders for table/list views
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OrdersListResponse'
 *       401:
 *         description: Unauthorized, missing or invalid token
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/orders/export:
 *   post:
 *     summary: Export orders in CSV/JSON format
 *     tags: [Orders]
 *     parameters:
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/OrderExportPayload'
 *     responses:
 *       200:
 *         description: Export file
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *               format: binary
 *           application/json:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       401:
 *         description: Unauthorized, missing or invalid token
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/orders/{orderId}:
 *   get:
 *     summary: Get order details by id (full customer)
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         schema:
 *           type: string
 *         required: true
 *         description: The order id
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Detailed order object
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OrderResponse'
 *       401:
 *         description: Unauthorized, missing or invalid token
 *       404:
 *         description: Order not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/orders/{orderId}:
 *   patch:
 *     summary: Partially update an order
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the order to update
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateOrderPatchPayload'
 *     responses:
 *       200:
 *         description: The order was successfully updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OrderResponse'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized, missing or invalid token
 *       404:
 *         description: Order not found
 *       409:
 *         description: Conflict, unable to update the order
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/orders/{orderId}:
 *   delete:
 *     summary: Delete the order by Id
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         schema:
 *           type: string
 *         required: true
 *         description: The order id
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       204:
 *         description: The order was successfully deleted
 *       401:
 *         description: Unauthorized, missing or invalid token
 *       404:
 *         description: Order not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/orders/{orderId}/assign-manager/{managerId}:
 *   put:
 *     summary: Assign a manager to an order
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the order
 *       - in: path
 *         name: managerId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the manager to assign
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Manager was successfully assigned to the order
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OrderResponse'
 *       400:
 *         description: Invalid input or manager cannot be assigned
 *       401:
 *         description: Unauthorized, missing or invalid token
 *       403:
 *         description: Forbidden. The selected account does not have the Manager role
 *       404:
 *         description: Order or Manager not found
 *       409:
 *         description: Manager already assigned to this order
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/orders/{orderId}/unassign-manager:
 *   put:
 *     summary: Unassign (remove) the manager from an order
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the order
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Manager was successfully unassigned from the order
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OrderResponse'
 *       400:
 *         description: Invalid input or manager cannot be unassigned
 *       401:
 *         description: Unauthorized, missing or invalid token
 *       404:
 *         description: Order not found
 *       409:
 *         description: No manager assigned to this order
 *       500:
 *         description: Server error
 */

export default orderRouter;
