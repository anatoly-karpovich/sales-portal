import mongoose from "mongoose";
import { DELIVERY, ORDER_HISTORY_ACTIONS } from "../data/enums";
import { IOrderDocument } from "../data/types";

const user = new mongoose.Schema(
  {
    _id: { type: mongoose.SchemaTypes.ObjectId, required: true },
    username: { type: String, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    roles: [{ type: String, ref: "Role" }],
    createdOn: { type: String, required: true },
  },
  { _id: false, versionKey: false }
);

const product = new mongoose.Schema(
  {
    _id: { type: mongoose.SchemaTypes.ObjectId },
    name: { type: String, required: true },
    amount: { type: Number, required: true },
    price: { type: Number, required: true },
    manufacturer: { type: String, required: true },
    notes: { type: String, required: false },
    received: { type: Boolean, required: true },
  },
  { _id: false }
);

const delivery = new mongoose.Schema(
  {
    finalDate: { type: Date, required: true },
    condition: { type: String, enum: DELIVERY, required: true },
    address: {
      country: { type: String, required: true },
      city: { type: String, required: true },
      street: { type: String, required: true },
      house: { type: Number, required: true },
      flat: { type: Number, required: true },
    },
  },
  { _id: false }
);

const comment = new mongoose.Schema({
  text: { type: String, required: true },
  createdOn: { type: Date, required: true },
});

const history = new mongoose.Schema(
  {
    status: { type: String, required: true },
    customer: { type: mongoose.SchemaTypes.ObjectId, required: true },
    products: [{ type: product, required: true }],
    total_price: { type: Number, require: true },
    delivery: { type: delivery, required: false },
    changedOn: { type: Date, required: true },
    action: { type: String, enum: ORDER_HISTORY_ACTIONS, required: true },
    performer: { type: user, required: true },
    assignedManager: { type: user, required: false, default: null },
  },
  { _id: false, versionKey: false }
);

const Order = new mongoose.Schema(
  {
    status: { type: String, required: true },
    customer: { type: mongoose.SchemaTypes.ObjectId, ref: "Customer", required: true },
    products: [{ type: product, required: true }],
    delivery: { type: delivery, required: false },
    total_price: { type: Number, require: true },
    createdOn: { type: Date, required: true },
    comments: [{ type: comment, required: false }],
    history: [{ type: history, required: false }],
    assignedManager: { type: user, required: false, default: null },
  },
  { versionKey: false }
);

export default mongoose.model<IOrderDocument>("Order", Order);
