import { AllowedSchema } from "express-json-validator-middleware";

export const customerSchema: AllowedSchema = {
  type: "object",
  properties: {
    email: { type: "string" },
    name: { type: "string" },
    city: { type: "string" },
    street: { type: "string" },
    house: { type: "integer" },
    flat: { type: "integer" },
    phone: { type: "string" },
    notes: { type: "string" },
  },
  required: ["email", "name", "city", "street", "house", "flat", "phone"],
};
