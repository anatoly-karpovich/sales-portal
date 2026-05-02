import OrderDeliveryController from "../controllers/orderDelivery.controller.js";
import { orderById, orderDeliveryValidation, orderPickupValidation } from "../middleware/orderMiddleware.js";
import Router from "express";
import { schemaMiddleware } from "../middleware/schemaMiddleware.js";
import { authmiddleware } from "../middleware/authmiddleware.js";

const orderDeliveryRouter = Router();

orderDeliveryRouter.patch(
  "/orders/:orderId/delivery",
  authmiddleware,
  schemaMiddleware("orderDeliveryUpdateSchema"),
  orderById,
  orderDeliveryValidation,
  OrderDeliveryController.updateDelivery.bind(OrderDeliveryController),
);

orderDeliveryRouter.patch(
  "/orders/:orderId/pickup",
  authmiddleware,
  schemaMiddleware("orderPickupUpdateSchema"),
  orderById,
  orderPickupValidation,
  OrderDeliveryController.updatePickup.bind(OrderDeliveryController),
);

/**
 * @swagger
 * /api/orders/{orderId}/delivery:
 *   patch:
 *     summary: Create or update order delivery by address
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: Order id
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [express, address]
 *             properties:
 *               express:
 *                 type: boolean
 *               address:
 *                 $ref: '#/components/schemas/DeliveryAddress'
 *     responses:
 *       200:
 *         description: Delivery updated
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
 *       404:
 *         description: Order not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/orders/{orderId}/pickup:
 *   patch:
 *     summary: Create or update order pickup by pickup location id
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: Order id
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [pickupLocationId]
 *             properties:
 *               pickupLocationId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Pickup updated
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
 *       404:
 *         description: Order or pickup location not found
 *       500:
 *         description: Server error
 */

export default orderDeliveryRouter;
