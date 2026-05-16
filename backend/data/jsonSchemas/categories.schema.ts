import { AllowedSchema } from "express-json-validator-middleware";

export const categoryCreateSchema: AllowedSchema = {
  type: "object",
  properties: {
    name: { type: "string", minLength: 1 },
    slug: { type: "string", minLength: 1 },
    description: { type: "string" },
    imageUrl: { type: "string" },
    parentId: { type: "string", minLength: 1 },
  },
  required: ["name"],
  additionalProperties: false,
};

export const categoryPatchSchema: AllowedSchema = {
  type: "object",
  properties: {
    name: { type: "string", minLength: 1 },
    slug: { type: "string", minLength: 1 },
    description: { type: "string" },
    imageUrl: { type: "string" },
  },
  minProperties: 1,
  additionalProperties: false,
};

export const categoryMoveSchema: AllowedSchema = {
  type: "object",
  properties: {
    targetParentId: {
      anyOf: [{ type: "string", minLength: 1 }, { type: "null" }],
    },
  },
  required: ["targetParentId"],
  additionalProperties: false,
};
