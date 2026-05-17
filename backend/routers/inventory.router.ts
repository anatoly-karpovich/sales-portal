import Router from "express";
import { authmiddleware } from "../middleware/authmiddleware.js";
import { schemaMiddleware } from "../middleware/schemaMiddleware.js";
import InventoryController from "../controllers/inventory.controller.js";
import {
  inventoryAdjustmentValidation,
  inventoryAdjustmentsQueryValidation,
  inventoryListValidation,
  inventoryProductById,
  inventoryVariantById,
} from "../middleware/inventoryMiddleware.js";

const inventoryRouter = Router();

inventoryRouter.get("/inventory", authmiddleware, inventoryListValidation, InventoryController.getList.bind(InventoryController));

inventoryRouter.get(
  "/inventory/products/:productId",
  authmiddleware,
  inventoryProductById,
  InventoryController.getByProductId.bind(InventoryController),
);

inventoryRouter.post(
  "/inventory/adjustments",
  authmiddleware,
  schemaMiddleware("inventoryAdjustmentCreateSchema"),
  inventoryAdjustmentValidation,
  InventoryController.createAdjustment.bind(InventoryController),
);

inventoryRouter.patch(
  "/inventory/products/:productId/variants/:variantId/settings",
  authmiddleware,
  schemaMiddleware("inventoryVariantSettingsPatchSchema"),
  inventoryVariantById,
  InventoryController.patchVariantSettings.bind(InventoryController),
);

inventoryRouter.get(
  "/inventory/products/:productId/adjustments",
  authmiddleware,
  inventoryProductById,
  inventoryAdjustmentsQueryValidation,
  InventoryController.getProductAdjustments.bind(InventoryController),
);

inventoryRouter.get(
  "/inventory/products/:productId/variants/:variantId/adjustments",
  authmiddleware,
  inventoryVariantById,
  inventoryAdjustmentsQueryValidation,
  InventoryController.getVariantAdjustments.bind(InventoryController),
);

export default inventoryRouter;
