import express from "express";
import { authmiddleware } from "../middleware/authmiddleware";
import CustomerOrdersController from "../controllers/customer.orders.controller";

const customerOrdersRouter = express.Router();

customerOrdersRouter.get(
  "/customers/:customerId/orders",
  authmiddleware,
  CustomerOrdersController.getOrdersByCustomer.bind(CustomerOrdersController),
);

/**
 * @swagger
 * /api/customers/{customerId}/orders:
 *   get:
 *     summary: Get all orders associated with the specified customer
 *     tags: [Customers]
 *     parameters:
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
 *               type: object
 *               properties:
 *                 Orders:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/OrderListItem'
 *                 IsSuccess:
 *                   type: boolean
 *                 ErrorMessage:
 *                   type: string
 *                   nullable: true
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

