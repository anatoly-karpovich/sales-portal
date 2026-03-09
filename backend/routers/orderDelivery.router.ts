import OrderDeliveryController from "../controllers/orderDelivery.controller.js";
import { orderById, orderDelivery } from "../middleware/orderMiddleware.js";
import Router from "express";
import { schemaMiddleware } from "../middleware/schemaMiddleware.js";
import { authmiddleware } from "../middleware/authmiddleware.js";

const orderDeliveryRouter = Router();

orderDeliveryRouter.post(
  "/orders/:id/delivery",
  authmiddleware,
  schemaMiddleware("orderDeliverySchema"),
  orderById,
  orderDelivery,
  OrderDeliveryController.update.bind(OrderDeliveryController),
);

/**
 * @swagger
 * /api/orders/{id}/delivery:
 *   post:
 *     summary: Create or update order delivery
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
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
 *             $ref: '#/components/schemas/Delivery'
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

export default orderDeliveryRouter;

