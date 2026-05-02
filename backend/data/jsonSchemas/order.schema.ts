import { AllowedSchema } from "express-json-validator-middleware";
import { JSONSchema7 } from "json-schema";
import { ORDER_STATUSES } from "../enums";
import { US_STATE_CODES } from "../usStates";

export const orderCreateSchema: AllowedSchema = {
  type: "object",
  properties: {
    customer: { type: "string" },
    products: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          quantity: { type: "integer", minimum: 1 },
        },
        required: ["id", "quantity"],
        additionalProperties: false,
      },
      minItems: 1,
    },
  },
  required: ["customer", "products"],
};

export const orderUpdateSchema: AllowedSchema = {
  type: "object",
  properties: {
    customer: { type: "string" },
    products: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          quantity: { type: "integer", minimum: 1 },
        },
        required: ["id", "quantity"],
        additionalProperties: false,
      },
      minItems: 1,
    },
  },
  additionalProperties: false,
  anyOf: [{ required: ["customer"] }, { required: ["products"] }],
};

export const orderReceiveSchema: AllowedSchema = {
  type: "object",
  properties: {
    products: {
      type: "array",
      items: { type: "string" },
      minItems: 1,
    },
  },
  required: ["products"],
};

export const orderStatusSchema: AllowedSchema = {
  type: "object",
  properties: {
    status: {
      type: "string",
      enum: [ORDER_STATUSES.DRAFT, ORDER_STATUSES.IN_PROCESS, ORDER_STATUSES.CANCELED],
    },
  },
  required: ["status"],
};

const deliveryAddressSchema: JSONSchema7 = {
  type: "object",
  properties: {
    state: { type: "string", enum: [...US_STATE_CODES] },
    city: { type: "string" },
    street: { type: "string" },
    house: { type: "integer" },
    apartment: { type: "integer", minimum: 1 },
    zipCode: { type: "string", pattern: "^\\d{5}(-\\d{4})?$" },
  },
  required: ["state", "city", "street", "house", "zipCode"],
  additionalProperties: false,
};

export const orderDeliveryUpdateSchema: AllowedSchema = {
  type: "object",
  properties: {
    express: { type: "boolean" },
    address: deliveryAddressSchema,
  },
  required: ["express", "address"],
  additionalProperties: false,
};

export const orderPickupUpdateSchema: AllowedSchema = {
  type: "object",
  properties: {
    pickupLocationId: { type: "string", minLength: 1 },
  },
  required: ["pickupLocationId"],
  additionalProperties: false,
};

export const orderPricingSchema: AllowedSchema = {
  type: "object",
  properties: {
    products: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          quantity: { type: "integer", minimum: 1 },
        },
        required: ["id", "quantity"],
        additionalProperties: false,
      },
      minItems: 1,
    },
    delivery: {
      type: "object",
      properties: {
        express: { type: "boolean" },
        address: deliveryAddressSchema,
      },
      required: ["express", "address"],
      additionalProperties: false,
    },
    pickup: {
      type: "object",
      properties: {
        pickupLocationId: { type: "string", minLength: 1 },
      },
      required: ["pickupLocationId"],
      additionalProperties: false,
    },
  },
  required: ["products"],
  allOf: [
    {
      not: {
        required: ["delivery", "pickup"],
      },
    },
  ],
  additionalProperties: false,
};

export const orderCommentsCreateSchema: AllowedSchema = {
  type: "object",
  properties: {
    comment: {
      type: "string",
    },
  },
  required: ["comment"],
};
