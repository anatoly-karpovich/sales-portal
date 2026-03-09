import Router from "express";
import OrderReceiveController from "../controllers/orderReceive.controller.js";
import { authmiddleware } from "../middleware/authmiddleware.js";
import { orderById, orderReceiveValidations } from "../middleware/orderMiddleware.js";
import { schemaMiddleware } from "../middleware/schemaMiddleware.js";

const orderReceiveRouter = Router();

orderReceiveRouter.post(
  "/orders/:id/receive",
  authmiddleware,
  schemaMiddleware("orderReceiveSchema"),
  orderById,
  orderReceiveValidations,
  OrderReceiveController.receiveProducts.bind(OrderReceiveController),
);

/**
 * @swagger
 * components:
 *   schemas:
 *     OrderReceive:
 *       type: object
 *       required:
 *         - products
 *       properties:
 *         products:
 *           type: array
 *           items:
 *             type: string
 *           maxItems: 5
 *           minItems: 1
 *           description: List of product IDs being received, can contain up to 5 identical products
 *       example:
 *         products:
 *           - "6447bd766e52f1d354d2f0bf"
 *           - "6447bd766e52f1d354d2f0bf"
 *           - "6447bd766e52f1d354d2f0bf"
 *           - "6447bd766e52f1d354d2f0bf"
 *           - "6447bd766e52f1d354d2f0bf"
 *
 * /api/orders/{id}/receive:
 *   post:
 *     summary: Mark products as received in an order
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
 *         description: The ID of the order
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/OrderReceive'
 *     responses:
 *       200:
 *         description: Products in the order were successfully marked as received
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized, missing or invalid token
 *       404:
 *         description: Order or products not found
 *       500:
 *         description: Server error
 */

export default orderReceiveRouter;
