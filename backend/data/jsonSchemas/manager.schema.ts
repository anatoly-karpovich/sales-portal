import { AllowedSchema } from "express-json-validator-middleware";

export const managerSchema: AllowedSchema = {
  type: "object",
  properties: {
    username: { type: "string" },
    password: { type: "string" },
    firstName: { type: "string" },
    lastName: { type: "string" },
  },
  required: ["username", "password", "firstName", "lastName"],
};
