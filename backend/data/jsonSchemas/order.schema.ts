import { AllowedSchema } from "express-json-validator-middleware";
import { DELIVERY, ORDER_STATUSES } from "../enums";
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

export const orderDeliverySchema: AllowedSchema = {
  type: "object",
  properties: {
    condition: { type: "string", enum: Object.values(DELIVERY) },
    express: { type: "boolean" },
    address: {
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
    },
  },
  required: ["condition", "address"],
  allOf: [
    {
      if: {
        properties: {
          condition: { const: DELIVERY.DELIVERY },
        },
      },
      then: {
        required: ["express"],
      },
      else: {
        properties: {
          express: { enum: [false] },
        },
      },
    },
  ],
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
        condition: { type: "string", enum: Object.values(DELIVERY) },
        express: { type: "boolean" },
        address: {
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
        },
      },
      required: ["condition", "address"],
      allOf: [
        {
          if: {
            properties: {
              condition: { const: DELIVERY.DELIVERY },
            },
          },
          then: {
            required: ["express"],
          },
          else: {
            properties: {
              express: { enum: [false] },
            },
          },
        },
      ],
      additionalProperties: false,
    },
  },
  required: ["products"],
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
