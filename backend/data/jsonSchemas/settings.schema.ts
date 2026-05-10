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

const catalogSettingsRequiredSchema: JSONSchema7 = {
  type: "object",
  properties: {
    manufacturers: {
      type: "array",
      minItems: 1,
      items: { type: "string", minLength: 1 },
    },
  },
  required: ["manufacturers"],
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

const pricingLevelSchema: JSONSchema7 = {
  type: "object",
  properties: {
    basePrice: { type: "integer", minimum: 0 },
    minDays: { type: "integer", minimum: 0 },
    express: {
      type: "object",
      properties: {
        days: { type: "integer", minimum: 0 },
        extraPrice: { type: "integer", minimum: 0 },
      },
      required: ["days", "extraPrice"],
      additionalProperties: false,
    },
  },
  required: ["basePrice", "minDays", "express"],
  additionalProperties: false,
};

const deliveryPricingSchema: JSONSchema7 = {
  type: "object",
  properties: {
    localCity: pricingLevelSchema,
    sameState: pricingLevelSchema,
    outOfState: pricingLevelSchema,
  },
  required: ["localCity", "sameState", "outOfState"],
  additionalProperties: false,
};

const pickupPolicySchema: JSONSchema7 = {
  type: "object",
  properties: {
    readyInDays: { type: "integer", minimum: 0 },
    holdForDays: { type: "integer", minimum: 1 },
    remindBeforeDays: { type: "integer", minimum: 0 },
  },
  required: ["readyInDays", "holdForDays"],
  additionalProperties: false,
};

const shippingDeliveryRequiredSchema: JSONSchema7 = {
  type: "object",
  properties: {
    pricing: deliveryPricingSchema,
  },
  required: ["pricing"],
  additionalProperties: false,
};

const shippingProcessingRequiredSchema: JSONSchema7 = {
  type: "object",
  properties: {
    cutoffHour: { type: "integer", minimum: 0, maximum: 23 },
  },
  required: ["cutoffHour"],
  additionalProperties: false,
};

const shippingProcessingPartialSchema: JSONSchema7 = {
  type: "object",
  properties: {
    cutoffHour: { type: "integer", minimum: 0, maximum: 23 },
  },
  required: ["cutoffHour"],
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

const catalogSettingsPartialSchema: JSONSchema7 = {
  type: "object",
  properties: {
    manufacturers: {
      type: "array",
      minItems: 1,
      items: { type: "string", minLength: 1 },
    },
  },
  required: ["manufacturers"],
  additionalProperties: false,
};

const inventorySettingsPartialSchema: JSONSchema7 = {
  type: "object",
  properties: {
    defaultLowStockThreshold: { type: "integer", minimum: 0 },
  },
  additionalProperties: false,
  required: ["defaultLowStockThreshold"],
};

const shippingDeliveryPartialSchema: JSONSchema7 = {
  type: "object",
  properties: {
    pricing: deliveryPricingSchema,
  },
  additionalProperties: false,
  required: ["pricing"],
};

const shippingPickupRequiredSchema: JSONSchema7 = {
  type: "object",
  properties: {
    policy: pickupPolicySchema,
    locations: pickupLocationsSchema,
  },
  required: ["policy", "locations"],
  additionalProperties: false,
};

const shippingPickupPartialSchema: JSONSchema7 = {
  type: "object",
  properties: {
    policy: pickupPolicySchema,
    locations: pickupLocationsSchema,
  },
  additionalProperties: false,
  anyOf: [{ required: ["policy"] }, { required: ["locations"] }],
};

const shippingSettingsRequiredSchema: JSONSchema7 = {
  type: "object",
  properties: {
    processing: shippingProcessingRequiredSchema,
    delivery: shippingDeliveryRequiredSchema,
    pickup: shippingPickupRequiredSchema,
  },
  required: ["processing", "delivery", "pickup"],
  additionalProperties: false,
};

const shippingSettingsPartialSchema: JSONSchema7 = {
  type: "object",
  properties: {
    processing: shippingProcessingPartialSchema,
    delivery: shippingDeliveryPartialSchema,
    pickup: shippingPickupPartialSchema,
  },
  additionalProperties: false,
  anyOf: [{ required: ["processing"] }, { required: ["delivery"] }, { required: ["pickup"] }],
};

export const settingsCreateSchema: AllowedSchema = {
  type: "object",
  properties: {
    catalog: catalogSettingsRequiredSchema,
    order: orderSettingsRequiredSchema,
    inventory: inventorySettingsRequiredSchema,
    shipping: shippingSettingsRequiredSchema,
  },
  required: ["catalog", "order", "inventory", "shipping"],
  additionalProperties: false,
};

export const settingsUpdateSchema: AllowedSchema = {
  type: "object",
  properties: {
    catalog: catalogSettingsPartialSchema,
    order: orderSettingsPartialSchema,
    inventory: inventorySettingsPartialSchema,
    shipping: shippingSettingsPartialSchema,
  },
  additionalProperties: false,
  anyOf: [{ required: ["catalog"] }, { required: ["order"] }, { required: ["inventory"] }, { required: ["shipping"] }],
};
