import express from "express";
import MetricsController from "../controllers/metrics.controller";
import { authmiddleware } from "../middleware/authmiddleware";

const router = express.Router();

router.get("/metrics", authmiddleware, MetricsController.getMetrics);

/**
 * @swagger
 * components:
 *   schemas:
 *     Metric:
 *       type: object
 *       properties:
 *         orders:
 *           type: object
 *           properties:
 *             totalRevenue:
 *               type: number
 *               description: Total revenue for the current year
 *             totalOrders:
 *               type: number
 *               description: Total number of orders for the current year
 *             averageOrderValue:
 *               type: number
 *               description: Average value of an order
 *             totalCanceledOrders:
 *               type: number
 *               description: Total number of canceled orders for the current year
 *             recentOrders:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Order'
 *               description: Recently created orders
 *             ordersCountPerDay:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   date:
 *                     type: object
 *                     properties:
 *                       year:
 *                         type: number
 *                       month:
 *                         type: number
 *                       day:
 *                         type: number
 *                   count:
 *                     type: number
 *               description: Daily order count for the current month
 *         customers:
 *           type: object
 *           properties:
 *             totalNewCustomers:
 *               type: number
 *               description: Total new customers for the current year
 *             topCustomers:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   customerName:
 *                     type: string
 *                   customerEmail:
 *                     type: string
 *                   totalSpent:
 *                     type: number
 *                   ordersCount:
 *                     type: number
 *               description: Top 3 customers by total spent
 *             customerGrowth:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   date:
 *                     type: object
 *                     properties:
 *                       year:
 *                         type: number
 *                       month:
 *                         type: number
 *                       day:
 *                         type: number
 *                   count:
 *                     type: number
 *               description: Customer registrations over the last 15 days
 *         products:
 *           type: object
 *           properties:
 *             topProducts:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                   sales:
 *                     type: number
 *               description: Top 5 best-selling products
 *
 * /api/metrics:
 *   get:
 *     summary: Get business metrics for the current year
 *     tags: [Metrics]
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
 *     responses:
 *       200:
 *         description: Business metrics successfully retrieved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Metric'
 *       401:
 *         description: Unauthorized, missing or invalid token
 *       500:
 *         description: Server error
 */

export default router;
