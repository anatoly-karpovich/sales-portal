import { AllowedSchema } from "express-json-validator-middleware";
import { DELIVERY, ORDER_STATUSES } from "../enums";

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

export const orderDeliverySchema: AllowedSchema = {
  type: "object",
  properties: {
    finalDate: { type: "string" },
    condition: { type: "string", enum: Object.values(DELIVERY) },
    address: {
      type: "object",
      properties: {
        city: { type: "string" },
        street: { type: "string" },
        house: { type: "integer" },
        flat: { type: "integer" },
      },
      required: ["city", "street", "house", "flat"],
    },
  },
  required: ["finalDate", "condition", "address"],
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
