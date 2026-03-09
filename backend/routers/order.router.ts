import Router from "express";
import OrderController from "../controllers/order.controller.js";
import { authmiddleware } from "../middleware/authmiddleware.js";
import { orderById, orderValidations, orderUpdateValidations } from "../middleware/orderMiddleware.js";
import { schemaMiddleware } from "../middleware/schemaMiddleware.js";
import { isManager, managerById } from "../middleware/usersMiddleware.js";

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

orderRouter.put(
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
 *       required: [_id, email, name, country, city, street, house, flat, phone, createdOn]
 *       properties:
 *         _id:
 *           type: string
 *         email:
 *           type: string
 *         name:
 *           type: string
 *         country:
 *           type: string
 *           enum: [USA, Canada, Belarus, Ukraine, Germany, France, Great Britain, Russia]
 *         city:
 *           type: string
 *         street:
 *           type: string
 *         house:
 *           type: number
 *         flat:
 *           type: number
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
 *       required: [_id, name, amount, price, manufacturer, received]
 *       properties:
 *         _id:
 *           type: string
 *         name:
 *           type: string
 *         amount:
 *           type: number
 *         price:
 *           type: number
 *         manufacturer:
 *           type: string
 *           enum: [Apple, Samsung, Google, Microsoft, Sony, Xiaomi, Amazon, Tesla]
 *         notes:
 *           type: string
 *           nullable: true
 *         received:
 *           type: boolean
 *     DeliveryAddress:
 *       type: object
 *       required: [country, city, street, house, flat]
 *       properties:
 *         country:
 *           type: string
 *           enum: [USA, Canada, Belarus, Ukraine, Germany, France, Great Britain, Russia]
 *         city:
 *           type: string
 *         street:
 *           type: string
 *         house:
 *           type: number
 *         flat:
 *           type: number
 *     Delivery:
 *       type: object
 *       required: [finalDate, condition, address]
 *       properties:
 *         finalDate:
 *           type: string
 *           format: date-time
 *         condition:
 *           type: string
 *           enum: [Delivery, Pickup]
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
 *     OrderHistoryEntry:
 *       type: object
 *       required: [status, customer, products, total_price, changedOn, action, performer]
 *       properties:
 *         status:
 *           type: string
 *           enum: [Draft, In Process, Partially Received, Received, Canceled]
 *         customer:
 *           type: string
 *         products:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ProductInOrder'
 *         total_price:
 *           type: number
 *         delivery:
 *           allOf:
 *             - $ref: '#/components/schemas/Delivery'
 *           nullable: true
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
 *             - Delivery Scheduled
 *             - Delivery Edited
 *             - Received
 *             - All products received
 *             - Order canceled
 *             - Manager Assigned
 *             - Manager Unassigned
 *             - Order reopened
 *         performer:
 *           $ref: '#/components/schemas/ManagerSnapshot'
 *         assignedManager:
 *           allOf:
 *             - $ref: '#/components/schemas/ManagerSnapshot'
 *           nullable: true
 *     OrderListItem:
 *       type: object
 *       required: [_id, status, customer, products, total_price, createdOn]
 *       properties:
 *         _id:
 *           type: string
 *         status:
 *           type: string
 *           enum: [Draft, In Process, Partially Received, Received, Canceled]
 *         customer:
 *           $ref: '#/components/schemas/OrderCustomerSnapshot'
 *         products:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ProductInOrder'
 *         delivery:
 *           allOf:
 *             - $ref: '#/components/schemas/Delivery'
 *           nullable: true
 *         total_price:
 *           type: number
 *         createdOn:
 *           type: string
 *           format: date-time
 *         assignedManager:
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
 *       required: [Orders, total, page, limit, search, status, sorting, IsSuccess, ErrorMessage]
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
 *     CreateOrUpdateOrderPayload:
 *       type: object
 *       required: [customer, products]
 *       properties:
 *         customer:
 *           type: string
 *           description: Customer id
 *         products:
 *           type: array
 *           items:
 *             type: string
 *           description: Array of product ids
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
 *                 enum: [Draft, In Process, Partially Received, Received, Canceled]
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
 *             enum: [status, total_price, delivery, customer, products, assignedManager, createdOn]
 *     OrderStatusPayload:
 *       type: object
 *       required: [status]
 *       properties:
 *         status:
 *           type: string
 *           enum: [Draft, In Process, Partially Received, Received, Canceled]
 *     OrderReceivePayload:
 *       type: object
 *       required: [products]
 *       properties:
 *         products:
 *           type: array
 *           minItems: 1
 *           items:
 *             type: string
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
 *             $ref: '#/components/schemas/CreateOrUpdateOrderPayload'
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
 *         description: Search term for filtering orders by ID, customer name, customer email, total price, or status
 *       - in: query
 *         name: status
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *           example: ["In Process", "Draft"]
 *         description: Filter orders by status
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
 *   put:
 *     summary: Update an order
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
 *             $ref: '#/components/schemas/CreateOrUpdateOrderPayload'
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
 *         description: Forbidden. The selected user does not have the Manager role
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


