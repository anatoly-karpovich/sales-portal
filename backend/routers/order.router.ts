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
  OrderController.create,
);

orderRouter.get("/orders", authmiddleware, OrderController.getAll);

orderRouter.get("/orders/:id", authmiddleware, orderById, OrderController.getOrder);

orderRouter.put(
  "/orders/:id",
  authmiddleware,
  schemaMiddleware("orderUpdateSchema"),
  orderById,
  orderUpdateValidations,
  orderValidations,
  OrderController.update,
);
orderRouter.delete("/orders/:id", authmiddleware, orderById, OrderController.delete);

orderRouter.put(
  "/orders/:orderId/assign-manager/:managerId",
  authmiddleware,
  orderById,
  managerById,
  isManager,
  OrderController.assignManager,
);
orderRouter.put("/orders/:orderId/unassign-manager", authmiddleware, orderById, OrderController.unassignManager);

/**
 * @swagger
 * components:
 *   schemas:
 *     Order:
 *       type: object
 *       required:
 *         - status
 *         - customer
 *         - products
 *         - total_price
 *         - createdOn
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated id of the order
 *         status:
 *           type: string
 *           enum: [Draft, In Process, Partially Received, Received, Canceled]
 *           description: The current status of the order
 *         customer:
 *           type: object
 *           properties:
 *             _id:
 *               type: string
 *             email:
 *               type: string
 *             name:
 *               type: string
 *             country:
 *               type: string
 *               enum: [USA, Canada, Belarus, Ukraine, Germany, France, Great Britain, Russia]
 *             city:
 *               type: string
 *             street:
 *               type: string
 *             house:
 *               type: number
 *             flat:
 *               type: number
 *             phone:
 *               type: string
 *             createdOn:
 *               type: string
 *               format: date-time
 *             notes:
 *               type: string
 *           description: Customer details for the order
 *         products:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ProductInOrder'
 *           description: List of products in the order
 *         total_price:
 *           type: number
 *           description: Total price of the order
 *         createdOn:
 *           type: string
 *           format: date-time
 *           description: Date the order was created
 *         delivery:
 *           $ref: '#/components/schemas/Delivery'
 *           description: Delivery details of the order
 *         comments:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Comment'
 *           description: Comments related to the order
 *         history:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/OrderHistory'
 *           description: History of the order
 *
 *     OrderWithoutDelivery:
 *       type: object
 *       required:
 *         - status
 *         - customer
 *         - products
 *         - total_price
 *         - createdOn
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated id of the order
 *         status:
 *           type: string
 *           enum: [Draft, In Process, Partially Received, Received, Canceled]
 *           description: The current status of the order
 *         customer:
 *           type: object
 *           properties:
 *             _id:
 *               type: string
 *             email:
 *               type: string
 *             name:
 *               type: string
 *             country:
 *               type: string
 *               enum: [USA, Canada, Belarus, Ukraine, Germany, France, Great Britain, Russia]
 *             city:
 *               type: string
 *             street:
 *               type: string
 *             house:
 *               type: number
 *             flat:
 *               type: number
 *             phone:
 *               type: string
 *             createdOn:
 *               type: string
 *               format: date-time
 *             notes:
 *               type: string
 *         products:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ProductInOrder'
 *         total_price:
 *           type: number
 *         createdOn:
 *           type: string
 *           format: date-time
 *         delivery:
 *           type: object
 *           nullable: true
 *           description: Delivery details, will be null for Draft status
 *           example: null
 *         comments:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Comment'
 *         history:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/OrderHistory'
 *       example:
 *         status: "Draft"
 *         customer:
 *           _id: "66f9d2695ea81af0e61adb59"
 *           email: "Estefania_Emard@gmail.com"
 *           name: "Ira Swaniawski IV"
 *           country: "Great Britain"
 *           city: "Fort Jimmyton"
 *           street: "Howell Crest"
 *           house: 169
 *           flat: 6734
 *           phone: "+449807453699"
 *           createdOn: "2024-09-29T22:19:00.000Z"
 *           notes: "Notes here"
 *         products:
 *           - _id: "66eb4139fd0a2ec681e705aa"
 *             name: "Gloves48933"
 *             amount: 2
 *             price: 100
 *             manufacturer: "Microsoft"
 *             notes: "Test notes"
 *             received: false
 *         total_price: 300
 *         createdOn: "2024-09-30T19:42:00.000Z"
 *         delivery: null
 *         comments: []
 *         history:
 *           - status: "Draft"
 *             customer: "66f9d2695ea81af0e61adb59"
 *             products:
 *               - _id: "66eb3d8ffd0a2ec681e70581"
 *                 name: "Ball1"
 *                 amount: 22
 *                 price: 101
 *                 manufacturer: "Tesla"
 *                 notes: "Test notes"
 *                 received: false
 *             total_price: 300
 *             delivery: null
 *             changedOn: "2024-09-30T19:42:00.000Z"
 *             action: "Order created"
 *         _id: "66faff1a5ea81af0e61addfa"
 *
 *     ProductInOrder:
 *       type: object
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
 *         received:
 *           type: boolean
 *           description: Whether the product has been received or not
 *
 *     Delivery:
 *       type: object
 *       properties:
 *         finalDate:
 *           type: string
 *           format: date-time
 *         condition:
 *           type: string
 *           enum: [Delivery, Pickup]
 *         address:
 *           type: object
 *           properties:
 *             country:
 *               type: string
 *               enum: [USA, Canada, Belarus, Ukraine, Germany, France, Great Britain, Russia]
 *             city:
 *               type: string
 *             street:
 *               type: string
 *             house:
 *               type: number
 *             flat:
 *               type: number
 *
 *     Comment:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated ID of the comment
 *         text:
 *           type: string
 *           description: Comment text
 *         createdOn:
 *           type: string
 *           format: date-time
 *           description: Date and time the comment was created
 *       example:
 *         _id: "645189c01b1eccc04f9aba5d"
 *         text: "Great service!"
 *         createdOn: "2023-09-29T12:05:00Z"
 *
 *     OrderHistory:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *         customer:
 *           type: string
 *         products:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ProductInOrder'
 *         total_price:
 *           type: number
 *         action:
 *           type: string
 *           enum: [Order created, Customer changed, Requested products changed, Order processing started, Delivery Scheduled, Delivery Edited, Received, Received All, Order canceled]
 *         changedOn:
 *           type: string
 *           format: date-time
 *
 *     CreateOrderPayload:
 *       type: object
 *       required:
 *         - customer
 *         - products
 *       properties:
 *         customer:
 *           type: string
 *           description: The ID of the customer placing the order
 *           example: "64496fed9032279ec58cd8cd"
 *         products:
 *           type: array
 *           items:
 *             type: string
 *           description: Array of product IDs in the order
 *           example:
 *             - "6449700d9032279ec58cd8de"
 *             - "6449700d9032279ec58cd8de"
 *             - "6449700d9032279ec58cd8de"
 *             - "6449700d9032279ec58cd8de"
 *             - "6449700d9032279ec58cd8de"
 *
 * tags:
 *   name: Orders
 *   description: Orders management service
 */

/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Create a new order
 *     tags: [Orders]
 *     parameters:
 *       - in: header
 *         name: Authorization
 *         required: true
 *         schema:
 *           type: string
 *           example: Bearer <JWT token>
 *         description: Bearer token for authentication
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
 *               $ref: '#/components/schemas/OrderWithoutDelivery'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized, missing or invalid token
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/orders:
 *   get:
 *     summary: Get the list of orders with optional filters and sorting
 *     tags: [Orders]
 *     parameters:
 *       - in: header
 *         name: Authorization
 *         required: true
 *         schema:
 *           type: string
 *           example: Bearer <JWT token>
 *         description: Bearer token for authentication
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
 *         description: The list of orders
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Order'
 *       401:
 *         description: Unauthorized, missing or invalid token
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/orders/{id}:
 *   get:
 *     summary: Get the order by Id
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The order id
 *       - in: header
 *         name: Authorization
 *         required: true
 *         schema:
 *           type: string
 *           example: Bearer <JWT token>
 *         description: Bearer token for authentication
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: The order by Id
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
 *       401:
 *         description: Unauthorized, missing or invalid token
 *       404:
 *         description: Order not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/orders/{id}:
 *   put:
 *     summary: Update an order
 *     tags: [Orders]
 *     parameters:
 *       - in: header
 *         name: Authorization
 *         required: true
 *         schema:
 *           type: string
 *           example: Bearer <JWT token>
 *         description: Bearer token for authentication
 *       - in: path
 *         name: id
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
 *             $ref: '#/components/schemas/CreateOrderPayload'
 *     responses:
 *       200:
 *         description: The order was successfully updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
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
 * /api/orders/{id}:
 *   delete:
 *     summary: Delete the order by Id
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The order id
 *       - in: header
 *         name: Authorization
 *         required: true
 *         schema:
 *           type: string
 *           example: Bearer <JWT token>
 *         description: Bearer token for authentication
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
 *       - in: header
 *         name: Authorization
 *         required: true
 *         schema:
 *           type: string
 *           example: Bearer <JWT token>
 *         description: Bearer token for authentication
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Manager was successfully assigned to the order
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
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
 *       - in: header
 *         name: Authorization
 *         required: true
 *         schema:
 *           type: string
 *           example: Bearer <JWT token>
 *         description: Bearer token for authentication
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Manager was successfully unassigned from the order
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
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
