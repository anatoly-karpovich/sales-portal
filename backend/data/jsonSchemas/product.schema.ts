import { AllowedSchema } from "express-json-validator-middleware";
import { JSONSchema7 } from "json-schema";
import { PRODUCT_STATUSES } from "../enums";

const variantAttributesSchema: JSONSchema7 = {
  type: "object",
  minProperties: 0,
  additionalProperties: { type: "string" },
};

const productAttributeSchema: JSONSchema7 = {
  type: "object",
  properties: {
    key: { type: "string", minLength: 1 },
    name: { type: "string", minLength: 1, maxLength: 100 },
    values: {
      type: "array",
      minItems: 1,
      items: { type: "string", minLength: 1 },
    },
  },
  required: ["key", "name", "values"],
  additionalProperties: false,
};

const productVariantSchema: JSONSchema7 = {
  type: "object",
  properties: {
    price: { type: "number", exclusiveMinimum: 0 },
    status: { type: "string", enum: Object.values(PRODUCT_STATUSES) },
    attributes: variantAttributesSchema,
    imageUrl: { type: "string" },
  },
  required: ["price", "status", "attributes"],
  additionalProperties: false,
};

export const productVariantCreateSchema: AllowedSchema = productVariantSchema as AllowedSchema;

export const productCreateSchema: AllowedSchema = {
  type: "object",
  properties: {
    name: { type: "string", minLength: 1 },
    manufacturer: { type: "string", minLength: 1 },
    category: { type: "string", minLength: 1 },
    description: { type: "string" },
    imageUrl: { type: "string" },
    status: { type: "string", enum: Object.values(PRODUCT_STATUSES) },
    attributes: { type: "array", items: productAttributeSchema },
    variants: {
      type: "array",
      minItems: 1,
      items: productVariantSchema,
    },
  },
  required: ["name", "manufacturer", "category", "status", "attributes", "variants"],
  additionalProperties: false,
};

export const productReplaceSchema = productCreateSchema;

export const productPatchSchema: AllowedSchema = {
  type: "object",
  properties: {
    name: { type: "string", minLength: 1 },
    manufacturer: { type: "string", minLength: 1 },
    category: { type: "string", minLength: 1 },
    description: { type: "string" },
    imageUrl: { type: "string" },
    status: { type: "string", enum: Object.values(PRODUCT_STATUSES) },
    attributes: { type: "array", items: productAttributeSchema },
  },
  additionalProperties: false,
  minProperties: 1,
};

export const productVariantPatchSchema: AllowedSchema = {
  type: "object",
  properties: {
    price: { type: "number", exclusiveMinimum: 0 },
    status: { type: "string", enum: Object.values(PRODUCT_STATUSES) },
    attributes: variantAttributesSchema,
    imageUrl: { type: "string" },
  },
  additionalProperties: false,
  minProperties: 1,
};
