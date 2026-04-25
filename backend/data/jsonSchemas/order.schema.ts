import { AllowedSchema } from "express-json-validator-middleware";
import { COUNTRIES, DELIVERY, ORDER_STATUSES } from "../enums";
import { MAXIMUM_REQUESTED_PRODUCTS, MINIMUN_REQUESTED_PRODUCTS } from "../constants";

export const orderCreateSchema: AllowedSchema = {
  type: "object",
  properties: {
    customer: { type: "string" },
    products: {
      type: "array",
      items: { type: "string" },
      maxItems: MAXIMUM_REQUESTED_PRODUCTS,
      minItems: MINIMUN_REQUESTED_PRODUCTS,
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
      items: { type: "string" },
      maxItems: MAXIMUM_REQUESTED_PRODUCTS,
      minItems: MINIMUN_REQUESTED_PRODUCTS,
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
      maxItems: MAXIMUM_REQUESTED_PRODUCTS,
      minItems: MINIMUN_REQUESTED_PRODUCTS,
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
        country: { type: "string", enum: Object.values(COUNTRIES) },
        city: { type: "string" },
        street: { type: "string" },
        house: { type: "integer" },
        flat: { type: "integer" },
      },
      required: ["country", "city", "street", "house", "flat"],
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
