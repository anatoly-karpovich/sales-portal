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
        INVENTORY_ADJUSTMENT_TYPES.MANUAL_CORRECTION,
        INVENTORY_ADJUSTMENT_TYPES.STOCK_RECEIPT,
      ],
    },
    quantity: { type: "integer", minimum: 1 },
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

export const inventoryInitialSetupSchema: AllowedSchema = {
  type: "object",
  properties: {
    variants: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        properties: {
          variantId: { type: "string" },
          quantity: { type: "integer", minimum: 0 },
          lowStockThreshold: { type: "integer", minimum: 0 },
          allowSellingOutOfStock: { type: "boolean" },
        },
        required: ["variantId", "quantity"],
        additionalProperties: false,
      },
    },
  },
  required: ["variants"],
  additionalProperties: false,
};
