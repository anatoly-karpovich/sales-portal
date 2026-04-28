import { AllowedSchema } from "express-json-validator-middleware";
import { US_STATE_CODES } from "../usStates";

export const customerSchema: AllowedSchema = {
  type: "object",
  properties: {
    email: { type: "string" },
    name: { type: "string" },
    state: { type: "string", enum: [...US_STATE_CODES] },
    city: { type: "string" },
    street: { type: "string" },
    house: { type: "integer" },
    apartment: { type: "integer", minimum: 1 },
    zipCode: { type: "string", pattern: "^\\d{5}(-\\d{4})?$" },
    phone: { type: "string" },
    notes: { type: "string" },
  },
  required: ["email", "name", "state", "city", "street", "house", "zipCode", "phone"],
  additionalProperties: false,
};
