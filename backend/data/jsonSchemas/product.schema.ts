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
    attributes: variantAttributesSchema,
    imageUrl: { type: "string" },
  },
  required: ["price", "attributes"],
  additionalProperties: false,
};

export const productVariantCreateSchema: AllowedSchema = productVariantSchema as AllowedSchema;
const productVariantReplaceSchema: JSONSchema7 = {
  type: "object",
  properties: {
    _id: { type: "string", minLength: 1 },
    price: { type: "number", exclusiveMinimum: 0 },
    attributes: variantAttributesSchema,
    imageUrl: { type: "string" },
  },
  required: ["price", "attributes"],
  additionalProperties: false,
};

export const productVariantsCreateSchema: AllowedSchema = {
  type: "array",
  minItems: 1,
  maxItems: 200,
  items: productVariantSchema,
} as AllowedSchema;

export const productVariantsReplaceSchema: AllowedSchema = {
  type: "object",
  properties: {
    attributes: { type: "array", items: productAttributeSchema },
    variants: {
      type: "array",
      minItems: 1,
      maxItems: 200,
      items: productVariantReplaceSchema,
    },
  },
  required: ["variants"],
  additionalProperties: false,
} as AllowedSchema;

export const productVariantsValidateSchema = productVariantsReplaceSchema;

export const productCreateSchema: AllowedSchema = {
  type: "object",
  properties: {
    name: { type: "string", minLength: 1 },
    manufacturer: { type: "string", minLength: 1 },
    category: { type: "string", minLength: 1 },
    description: { type: "string" },
    imageUrl: { type: "string" },
    attributes: { type: "array", items: productAttributeSchema },
    variants: {
      type: "array",
      minItems: 1,
      items: productVariantSchema,
    },
  },
  required: ["name", "manufacturer", "category", "attributes", "variants"],
  additionalProperties: false,
};

export const productReplaceSchema: AllowedSchema = {
  type: "object",
  properties: {
    name: { type: "string", minLength: 1 },
    manufacturer: { type: "string", minLength: 1 },
    category: { type: "string", minLength: 1 },
    description: { type: "string" },
    imageUrl: { type: "string" },
    attributes: { type: "array", items: productAttributeSchema },
    variants: {
      type: "array",
      minItems: 1,
      items: productVariantReplaceSchema,
    },
  },
  required: ["name", "manufacturer", "category", "attributes", "variants"],
  additionalProperties: false,
} as AllowedSchema;

export const productPatchSchema: AllowedSchema = {
  type: "object",
  properties: {
    name: { type: "string", minLength: 1 },
    manufacturer: { type: "string", minLength: 1 },
    category: { type: "string", minLength: 1 },
    description: { type: "string" },
    imageUrl: { type: "string" },
  },
  additionalProperties: false,
  minProperties: 1,
};

export const productVariantPatchSchema: AllowedSchema = {
  type: "object",
  properties: {
    price: { type: "number", exclusiveMinimum: 0 },
    attributes: variantAttributesSchema,
    imageUrl: { type: "string" },
  },
  additionalProperties: false,
  minProperties: 1,
};

export const productStatusPatchSchema: AllowedSchema = {
  type: "object",
  properties: {
    status: { type: "string", enum: Object.values(PRODUCT_STATUSES) },
  },
  required: ["status"],
  additionalProperties: false,
};

export const productVariantStatusPatchSchema = productStatusPatchSchema;
