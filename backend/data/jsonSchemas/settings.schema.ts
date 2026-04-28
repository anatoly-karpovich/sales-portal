import { AllowedSchema } from "express-json-validator-middleware";
import { JSONSchema7 } from "json-schema";
import { US_STATE_CODES } from "../usStates";

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

const pickupAddressSchema: JSONSchema7 = {
  type: "object",
  properties: {
    street: { type: "string", minLength: 1 },
    house: { type: "integer", minimum: 1 },
    apartment: { type: "integer", minimum: 1 },
    zipCode: { type: "string", pattern: "^\\d{5}(-\\d{4})?$" },
  },
  required: ["street", "house", "zipCode"],
  additionalProperties: false,
};

const pickupLocationSchema: JSONSchema7 = {
  type: "object",
  properties: {
    id: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },
    city: { type: "string", minLength: 1 },
    address: pickupAddressSchema,
    isActive: { type: "boolean" },
  },
  required: ["id", "city", "address", "isActive"],
  additionalProperties: false,
};

const pickupLocationsSchema: JSONSchema7 = {
  type: "object",
  minProperties: 1,
  propertyNames: { enum: [...US_STATE_CODES] },
  additionalProperties: {
    type: "array",
    minItems: 1,
    items: pickupLocationSchema,
  },
};

const deliverySettingsRequiredSchema: JSONSchema7 = {
  type: "object",
  properties: {
    basePricePerItem: { type: "integer", minimum: 0 },
    extraPriceForOtherCity: { type: "integer", minimum: 0 },
    pickupLocations: pickupLocationsSchema,
  },
  required: ["basePricePerItem", "extraPriceForOtherCity", "pickupLocations"],
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
    basePricePerItem: { type: "integer", minimum: 0 },
    extraPriceForOtherCity: { type: "integer", minimum: 0 },
    pickupLocations: pickupLocationsSchema,
  },
  additionalProperties: false,
  anyOf: [
    { required: ["basePricePerItem"] },
    { required: ["extraPriceForOtherCity"] },
    { required: ["pickupLocations"] },
  ],
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
