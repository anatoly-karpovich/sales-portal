import { AllowedSchema } from "express-json-validator-middleware";
import { JSONSchema7 } from "json-schema";

const orderSettingsRequiredSchema: JSONSchema7 = {
  type: "object",
  properties: {
    maxProductsInOrder: { type: "integer", minimum: 1 },
    maxProductQuantityInOrder: { type: "integer", minimum: 1 },
  },
  required: ["maxProductsInOrder", "maxProductQuantityInOrder"],
  additionalProperties: false,
};

const inventorySettingsRequiredSchema: JSONSchema7 = {
  type: "object",
  properties: {
    defaultLowStockThreshold: { type: "integer", minimum: 0 },
  },
  required: ["defaultLowStockThreshold"],
  additionalProperties: false,
};

const deliverySettingsRequiredSchema: JSONSchema7 = {
  type: "object",
  properties: {
    defaultCities: {
      type: "array",
      items: { type: "string" },
      minItems: 1,
    },
    basePricePerItem: { type: "integer", minimum: 0 },
    extraPriceForOtherCity: { type: "integer", minimum: 0 },
  },
  required: ["defaultCities", "basePricePerItem", "extraPriceForOtherCity"],
  additionalProperties: false,
};

const orderSettingsPartialSchema: JSONSchema7 = {
  type: "object",
  properties: {
    maxProductsInOrder: { type: "integer", minimum: 1 },
    maxProductQuantityInOrder: { type: "integer", minimum: 1 },
  },
  additionalProperties: false,
  anyOf: [{ required: ["maxProductsInOrder"] }, { required: ["maxProductQuantityInOrder"] }],
};

const inventorySettingsPartialSchema: JSONSchema7 = {
  type: "object",
  properties: {
    defaultLowStockThreshold: { type: "integer", minimum: 0 },
  },
  additionalProperties: false,
  required: ["defaultLowStockThreshold"],
};

const deliverySettingsPartialSchema: JSONSchema7 = {
  type: "object",
  properties: {
    defaultCities: {
      type: "array",
      items: { type: "string" },
      minItems: 1,
    },
    basePricePerItem: { type: "integer", minimum: 0 },
    extraPriceForOtherCity: { type: "integer", minimum: 0 },
  },
  additionalProperties: false,
  anyOf: [{ required: ["defaultCities"] }, { required: ["basePricePerItem"] }, { required: ["extraPriceForOtherCity"] }],
};

export const settingsCreateSchema: AllowedSchema = {
  type: "object",
  properties: {
    order: orderSettingsRequiredSchema,
    inventory: inventorySettingsRequiredSchema,
    delivery: deliverySettingsRequiredSchema,
  },
  required: ["order", "inventory", "delivery"],
  additionalProperties: false,
};

export const settingsUpdateSchema: AllowedSchema = {
  type: "object",
  properties: {
    order: orderSettingsPartialSchema,
    inventory: inventorySettingsPartialSchema,
    delivery: deliverySettingsPartialSchema,
  },
  additionalProperties: false,
  anyOf: [{ required: ["order"] }, { required: ["inventory"] }, { required: ["delivery"] }],
};
