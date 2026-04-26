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
 *       required: [order, inventory, delivery]
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
 *         delivery:
 *           type: object
 *           required: [defaultCities, basePricePerItem, extraPriceForOtherCity, pickupAddresses]
 *           properties:
 *             defaultCities:
 *               type: array
 *               items:
 *                 type: string
 *             basePricePerItem:
 *               type: integer
 *             extraPriceForOtherCity:
 *               type: integer
 *             pickupAddresses:
 *               type: object
 *               additionalProperties:
 *                 type: object
 *                 required: [street, house, flat]
 *                 properties:
 *                   street:
 *                     type: string
 *                   house:
 *                     type: integer
 *                   flat:
 *                     type: integer
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
