import mongoose from "mongoose";
import { ICustomerDocument } from "../data/types";
import { US_STATE_CODES } from "../data/usStates";

const CustomerSchema = new mongoose.Schema(
  {
    email: { type: String, unique: true, required: true },
    name: { type: String, required: true },
    state: { type: String, enum: [...US_STATE_CODES], required: true },
    city: { type: String, required: true },
    street: { type: String, required: true },
    house: { type: Number, required: true },
    apartment: { type: Number, required: false },
    zipCode: { type: String, required: true },
    phone: { type: String, required: true },
    createdOn: { type: Date, required: true },
    notes: { type: String, required: false },
  },
  { versionKey: false },
);

export default mongoose.model<ICustomerDocument>("Customer", CustomerSchema);
