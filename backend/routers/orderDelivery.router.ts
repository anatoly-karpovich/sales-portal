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
  OrderDeliveryController.update,
);

/**
 * @swagger
 * components:
 *   schemas:
 *     Delivery:
 *       type: object
 *       required:
 *         - finalDate
 *         - condition
 *         - address
 *       properties:
 *         finalDate:
 *           type: string
 *           format: date
 *           description: The final delivery date
 *         condition:
 *           type: string
 *           enum: [Delivery, Pickup]
 *           description: The delivery condition (e.g., Delivery or Pickup)
 *         address:
 *           type: object
 *           required:
 *             - country
 *             - city
 *             - street
 *             - house
 *             - flat
 *           properties:
 *             country:
 *               type: string
 *               enum: [USA, Canada, Belarus, Ukraine, Germany, France, Great Britain, Russia]
 *               description: The country of the address
 *             city:
 *               type: string
 *               description: The city of the address
 *             street:
 *               type: string
 *               description: The street of the address
 *             house:
 *               type: integer
 *               description: The house number
 *             flat:
 *               type: integer
 *               description: The flat number
 *       example:
 *         finalDate: "2023-04-30"
 *         condition: "Pickup"
 *         address:
 *           country: "USA"
 *           city: "New York"
 *           street: "5th Avenue"
 *           house: 1
 *           flat: 101

 *
* /api/orders/{id}/delivery:
 *   post:
 *     summary: Update delivery details of an order
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
 *             $ref: '#/components/schemas/Delivery'
 *     responses:
 *       200:
 *         description: The order delivery details were successfully updated
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
 *       500:
 *         description: Server error
 */

export default orderDeliveryRouter;
