import mongoose from "mongoose";
import { RESERVATION_TYPES } from "../data/enums";
import { IReservationDocument } from "../data/types";

const reservationItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.SchemaTypes.ObjectId, required: true },
    variantId: { type: mongoose.SchemaTypes.ObjectId, required: true },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false, versionKey: false },
);

const reservationSchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.SchemaTypes.ObjectId, required: true, index: true },
    type: { type: String, enum: Object.values(RESERVATION_TYPES), required: true },
    items: [{ type: reservationItemSchema, required: true }],
    expiresAt: { type: Date, required: false, default: null, index: true },
    createdOn: { type: Date, required: true },
    updatedOn: { type: Date, required: true },
  },
  { versionKey: false },
);

reservationSchema.index({ orderId: 1 }, { unique: true });

export default mongoose.model<IReservationDocument>("Reservation", reservationSchema);
