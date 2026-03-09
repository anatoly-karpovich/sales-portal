import express from "express";
import { authmiddleware } from "../middleware/authmiddleware";
import CustomerOrdersController from "../controllers/customer.orders.controller";

const customerOrdersRouter = express.Router();

customerOrdersRouter.get("/customers/:customerId/orders", authmiddleware, CustomerOrdersController.getOrdersByCustomer);

/**
 * @swagger
 * /api/customers/{customerId}/orders:
 *   get:
 *     summary: Get all orders associated with the specified customer
 *     tags: [Customers]
 *     parameters:
 *       - in: header
 *         name: Authorization
 *         required: true
 *         schema:
 *           type: string
 *           example: Bearer <JWT token>
 *         description: Bearer token for authentication
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the customer whose orders you want to retrieve
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: A list of orders associated with the customer
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Order'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized, missing or invalid token
 *       404:
 *         description: No orders found for the specified customer
 *       500:
 *         description: Server error
 */

export default customerOrdersRouter;
