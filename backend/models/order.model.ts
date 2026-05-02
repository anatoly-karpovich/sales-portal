import mongoose from "mongoose";
import { DELIVERY, DELIVERY_STATUSES, ORDER_HISTORY_ACTIONS, ORDER_STATUSES } from "../data/enums";
import { DELIVERY_PRICING_TIER } from "../data/types/settings.type";
import { US_STATE_CODES } from "../data/usStates";
import { IOrderDocument } from "../data/types";

const manager = new mongoose.Schema(
  {
    _id: { type: mongoose.SchemaTypes.ObjectId, required: true },
    username: { type: String, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    roles: [{ type: String, ref: "Role" }],
    createdOn: { type: String, required: true },
  },
  { _id: false, versionKey: false },
);

const productInOrder = new mongoose.Schema(
  {
    product: {
      _id: { type: mongoose.SchemaTypes.ObjectId, required: true },
    },
    unitPrice: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    received: { type: Boolean, required: true },
  },
  { _id: false },
);

const productInHistorySnapshot = new mongoose.Schema(
  {
    product: {
      _id: { type: mongoose.SchemaTypes.ObjectId, required: true },
      name: { type: String, required: true },
      manufacturer: { type: String, required: true },
    },
    unitPrice: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    received: { type: Boolean, required: true },
  },
  { _id: false },
);

const deliverySchedule = new mongoose.Schema(
  {
    express: { type: Boolean, required: false },
    estimatedDays: { type: Number, required: false },
    readyInDays: { type: Number, required: false },
    holdForDays: { type: Number, required: false },
    estimatedDate: { type: String, required: false },
    startsAt: { type: String, required: false },
    dueDate: { type: String, required: false },
    availableFromDate: { type: String, required: false },
    pickupByDate: { type: String, required: false },
  },
  { _id: false, versionKey: false },
);

const delivery = new mongoose.Schema(
  {
    status: { type: String, enum: DELIVERY_STATUSES, required: true },
    condition: { type: String, enum: DELIVERY, required: true },
    price: { type: Number, required: true },
    pricingTier: { type: String, enum: Object.values(DELIVERY_PRICING_TIER), required: true },
    schedule: { type: deliverySchedule, required: true },
    address: {
      state: { type: String, enum: [...US_STATE_CODES], required: true },
      city: { type: String, required: true },
      street: { type: String, required: true },
      house: { type: Number, required: true },
      apartment: { type: Number, required: false },
      zipCode: { type: String, required: true },
    },
  },
  { _id: false },
);

const comment = new mongoose.Schema({
  text: { type: String, required: true },
  createdOn: { type: Date, required: true },
  createdBy: { type: mongoose.SchemaTypes.ObjectId, ref: "Manager", required: false },
});

const history = new mongoose.Schema(
  {
    status: { type: String, enum: ORDER_STATUSES, required: true },
    customer: { type: mongoose.SchemaTypes.ObjectId, required: true },
    products: [{ type: productInHistorySnapshot, required: true }],
    total_price: { type: Number, require: true },
    delivery: { type: delivery, required: true },
    changedOn: { type: Date, required: true },
    action: { type: String, enum: ORDER_HISTORY_ACTIONS, required: true },
    performer: { type: manager, required: true },
    assignedManager: { type: manager, required: false, default: null },
  },
  { _id: false, versionKey: false },
);

const customerSnapshot = new mongoose.Schema(
  {
    _id: { type: mongoose.SchemaTypes.ObjectId, required: true },
    email: { type: String, required: true },
    name: { type: String, required: true },
  },
  { _id: false, versionKey: false },
);

const Order = new mongoose.Schema(
  {
    status: { type: String, enum: ORDER_STATUSES, required: true },
    customer: { type: customerSnapshot, required: true },
    products: [{ type: productInOrder, required: true }],
    delivery: { type: delivery, required: true },
    total_price: { type: Number, require: true },
    createdOn: { type: Date, required: true },
    comments: [{ type: comment, required: false }],
    history: [{ type: history, required: false }],
    assignedManager: { type: manager, required: false, default: null },
  },
  { versionKey: false },
);

Order.index({ "customer._id": 1 });
Order.index({ "customer.email": 1 });

export default mongoose.model<IOrderDocument>("Order", Order);
