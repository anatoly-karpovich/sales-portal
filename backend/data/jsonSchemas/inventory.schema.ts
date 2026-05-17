import { AllowedSchema } from "express-json-validator-middleware";
import { INVENTORY_ADJUSTMENT_TYPES } from "../enums";

export const inventoryAdjustmentCreateSchema: AllowedSchema = {
  type: "object",
  properties: {
    productId: { type: "string" },
    variantId: { type: "string" },
    type: {
      type: "string",
      enum: [
        INVENTORY_ADJUSTMENT_TYPES.MANUAL_INCREASE,
        INVENTORY_ADJUSTMENT_TYPES.MANUAL_DECREASE,
        INVENTORY_ADJUSTMENT_TYPES.MANUAL_CORRECTION,
        INVENTORY_ADJUSTMENT_TYPES.DAMAGE,
        INVENTORY_ADJUSTMENT_TYPES.RETURN,
      ],
    },
    quantity: { type: "integer", minimum: 1 },
    reason: { type: "string" },
    comment: { type: "string" },
  },
  required: ["productId", "variantId", "type", "quantity"],
  additionalProperties: false,
};

export const inventoryVariantSettingsPatchSchema: AllowedSchema = {
  type: "object",
  properties: {
    lowStockThreshold: { type: "integer", minimum: 0 },
    allowSellingOutOfStock: { type: "boolean" },
  },
  anyOf: [{ required: ["lowStockThreshold"] }, { required: ["allowSellingOutOfStock"] }],
  additionalProperties: false,
};
