import { Router } from "express";
import { authmiddleware } from "../middleware/authmiddleware";
import { PricingController } from "../controllers/pricing.controller";
import { schemaMiddleware } from "../middleware/schemaMiddleware";
import { orderPricingDeliveryValidation, orderPricingValidations } from "../middleware/orderMiddleware";

const pricingRouter = Router();
const pricingController = new PricingController();

pricingRouter.post(
  "/orders/pricing",
  authmiddleware,
  schemaMiddleware("orderPricingSchema"),
  orderPricingValidations,
  orderPricingDeliveryValidation,
  pricingController.getPrices.bind(pricingController),
);

/**
 * @swagger
 * /api/orders/pricing:
 *   post:
 *     summary: Calculate order and delivery pricing
 *     tags: [Orders]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [products]
 *             properties:
 *               products:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   $ref: '#/components/schemas/OrderProductRequestItem'
 *               delivery:
 *                 type: object
 *                 required: [express, address]
 *                 properties:
 *                   express:
 *                     type: boolean
 *                   address:
 *                     $ref: '#/components/schemas/DeliveryAddress'
 *               pickup:
 *                 type: object
 *                 required: [pickupLocationId]
 *                 properties:
 *                   pickupLocationId:
 *                     type: string
 *             allOf:
 *               - not:
 *                   required: [delivery, pickup]
 *     responses:
 *       200:
 *         description: Pricing calculated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 Pricing:
 *                   type: object
 *                   properties:
 *                     totalPrice:
 *                       type: number
 *                     products:
 *                       type: object
 *                       properties:
 *                         subtotal:
 *                           type: number
 *                         linesCount:
 *                           type: integer
 *                         unitsCount:
 *                           type: integer
 *                     delivery:
 *                       type: object
 *                       properties:
 *                         price:
 *                           type: number
 *                         pricingTier:
 *                           type: string
 *                           nullable: true
 *                           enum: [pickup, local_city, same_state, out_of_state]
 *                         isExpress:
 *                           type: boolean
 *                         lineCount:
 *                           type: integer
 *                         estimatedDays:
 *                           type: integer
 *                           nullable: true
 *                         estimatedDate:
 *                           type: string
 *                           format: date-time
 *                           nullable: true
 *                         availableFromDate:
 *                           type: string
 *                           format: date-time
 *                           nullable: true
 *                         pickupByDate:
 *                           type: string
 *                           format: date-time
 *                           nullable: true
 *                         breakdown:
 *                           type: object
 *                           properties:
 *                             basePerLine:
 *                               type: number
 *                             expressExtraPerLine:
 *                               type: number
 *                 IsSuccess:
 *                   type: boolean
 *                 ErrorMessage:
 *                   type: string
 *                   nullable: true
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Referenced product or pickup location was not found
 */

export default pricingRouter;
