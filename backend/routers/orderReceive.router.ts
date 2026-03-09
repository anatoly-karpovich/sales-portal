import Router from "express";
import OrderReceiveController from "../controllers/orderReceive.controller.js";
import { authmiddleware } from "../middleware/authmiddleware.js";
import { orderById, orderReceiveValidations } from "../middleware/orderMiddleware.js";
import { schemaMiddleware } from "../middleware/schemaMiddleware.js";

const orderReceiveRouter = Router();

orderReceiveRouter.post(
  "/orders/:orderId/receive",
  authmiddleware,
  schemaMiddleware("orderReceiveSchema"),
  orderById,
  orderReceiveValidations,
  OrderReceiveController.receiveProducts.bind(OrderReceiveController),
);

/**
 * @swagger
 * /api/orders/{orderId}/receive:
 *   post:
 *     summary: Mark requested products as received
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
 *             $ref: '#/components/schemas/OrderReceivePayload'
 *     responses:
 *       200:
 *         description: Products marked as received
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

export default orderReceiveRouter;


