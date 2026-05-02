import { Router } from "express";
import { authmiddleware } from "../middleware/authmiddleware";
import { SettingsController } from "../controllers/settings.controller";
import { schemaMiddleware } from "../middleware/schemaMiddleware";
import { settingsCreateDeliveryConsistency, settingsUpdateDeliveryConsistency } from "../middleware/settingsMiddleware";

const settingsRouter = Router();

const controller = new SettingsController();

settingsRouter.get("/settings", authmiddleware, controller.getSettings.bind(controller));
settingsRouter.post(
  "/settings",
  authmiddleware,
  schemaMiddleware("settingsCreateSchema"),
  settingsCreateDeliveryConsistency,
  controller.createSettings.bind(controller),
);
settingsRouter.patch(
  "/settings",
  authmiddleware,
  schemaMiddleware("settingsUpdateSchema"),
  settingsUpdateDeliveryConsistency,
  controller.updateSettings.bind(controller),
);

/**
 * @swagger
 * components:
 *   schemas:
 *     Settings:
 *       type: object
 *       required: [order, inventory, shipping]
 *       properties:
 *         order:
 *           type: object
 *           required: [maxProductsInOrder, maxProductQuantityInOrder]
 *           properties:
 *             maxProductsInOrder:
 *               type: integer
 *             maxProductQuantityInOrder:
 *               type: integer
 *         inventory:
 *           type: object
 *           required: [defaultLowStockThreshold]
 *           properties:
 *             defaultLowStockThreshold:
 *               type: integer
 *         shipping:
 *           type: object
 *           required: [processing, delivery, pickup]
 *           properties:
 *             processing:
 *               type: object
 *               required: [cutoffHour]
 *               properties:
 *                 cutoffHour:
 *                   type: integer
 *                   minimum: 0
 *                   maximum: 23
 *             delivery:
 *               type: object
 *               required: [pricing]
 *               properties:
 *                 pricing:
 *                   type: object
 *                   required: [localCity, sameState, outOfState]
 *                   properties:
 *                     localCity:
 *                       type: object
 *                       required: [basePrice, minDays, express]
 *                       properties:
 *                         basePrice:
 *                           type: integer
 *                         minDays:
 *                           type: integer
 *                         express:
 *                           type: object
 *                           required: [days, extraPrice]
 *                           properties:
 *                             days:
 *                               type: integer
 *                             extraPrice:
 *                               type: integer
 *                     sameState:
 *                       type: object
 *                       required: [basePrice, minDays, express]
 *                       properties:
 *                         basePrice:
 *                           type: integer
 *                         minDays:
 *                           type: integer
 *                         express:
 *                           type: object
 *                           required: [days, extraPrice]
 *                           properties:
 *                             days:
 *                               type: integer
 *                             extraPrice:
 *                               type: integer
 *                     outOfState:
 *                       type: object
 *                       required: [basePrice, minDays, express]
 *                       properties:
 *                         basePrice:
 *                           type: integer
 *                         minDays:
 *                           type: integer
 *                         express:
 *                           type: object
 *                           required: [days, extraPrice]
 *                           properties:
 *                             days:
 *                               type: integer
 *                             extraPrice:
 *                               type: integer
 *             pickup:
 *               type: object
 *               required: [policy, locations]
 *               properties:
 *                 policy:
 *                   type: object
 *                   required: [readyInDays, holdForDays]
 *                   properties:
 *                     readyInDays:
 *                       type: integer
 *                     holdForDays:
 *                       type: integer
 *                     remindBeforeDays:
 *                       type: integer
 *                 locations:
 *                   type: object
 *                   description: US state keyed object where each key contains an array of pickup locations
 *                   additionalProperties:
 *                     type: array
 *                     minItems: 1
 *                     items:
 *                       type: object
 *                       required: [id, city, address, isActive]
 *                       properties:
 *                         id:
 *                           type: string
 *                           pattern: ^[a-fA-F0-9]{24}$
 *                         city:
 *                           type: string
 *                         address:
 *                           type: object
 *                           required: [street, house, zipCode]
 *                           properties:
 *                             street:
 *                               type: string
 *                             house:
 *                               type: integer
 *                             apartment:
 *                               type: integer
 *                               nullable: true
 *                             zipCode:
 *                               type: string
 *                               pattern: ^\\d{5}(-\\d{4})?$
 *                         isActive:
 *                           type: boolean
 *     SettingsResponse:
 *       type: object
 *       properties:
 *         Settings:
 *           $ref: '#/components/schemas/Settings'
 *         IsSuccess:
 *           type: boolean
 *         ErrorMessage:
 *           type: string
 *           nullable: true
 * tags:
 *   - name: Settings
 *     description: Sales portal global settings
 *
 * /api/settings:
 *   get:
 *     summary: Get global settings
 *     tags: [Settings]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Settings data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SettingsResponse'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Settings not found
 *   post:
 *     summary: Create settings singleton
 *     tags: [Settings]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Settings'
 *     responses:
 *       201:
 *         description: Settings created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       409:
 *         description: Settings already exists
 *   patch:
 *     summary: Update settings singleton
 *     tags: [Settings]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Settings updated
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */

export default settingsRouter;
