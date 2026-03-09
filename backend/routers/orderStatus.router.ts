import OrderStatusController from "../controllers/orderStatus.controller.js";
import { orderById, orderStatus } from "../middleware/orderMiddleware.js";
import Router from "express";
import { schemaMiddleware } from "../middleware/schemaMiddleware.js";
import { authmiddleware } from "../middleware/authmiddleware.js";

const orderStatusRouter = Router();

orderStatusRouter.put(
  "/orders/:id/status",
  authmiddleware,
  schemaMiddleware("orderStatusSchema"),
  orderById,
  orderStatus,
  OrderStatusController.update,
);

/**
 * @swagger
 * components:
 *   schemas:
 *     OrderStatusUpdate:
 *       type: object
 *       required:
 *         - status
 *       properties:
 *         status:
 *           type: string
 *           enum: [Draft, In Process, Partially Received, Received, Canceled]
 *           description: The new status of the order
 *       example:
 *         status: "In Process"
 *
 * /api/orders/{id}/status:
 *   put:
 *     summary: Update the status of an order
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
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [Draft, In Process, Partially Received, Received, Canceled]
 *                 description: The new status of the order
 *             required:
 *               - status
 *           example:
 *             status: "In Process"
 *     responses:
 *       200:
 *         description: The order status was successfully updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized, missing or invalid token
 *       404:
 *         description: The order was not found
 *       500:
 *         description: Server error
 */

export default orderStatusRouter;
