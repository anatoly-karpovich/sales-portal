import mongoose from "mongoose";
import { INVENTORY_RECORD_STATUSES } from "../data/enums";
import { IInventoryDocument } from "../data/types";

const inventoryVariantSchema = new mongoose.Schema(
  {
    variantId: { type: mongoose.SchemaTypes.ObjectId, required: true },
    quantity: { type: Number, required: true, min: 0 },
    reserved: { type: Number, required: true, min: 0 },
    available: { type: Number, required: true, min: 0 },
    lowStockThreshold: { type: Number, required: true, min: 0 },
    allowSellingOutOfStock: { type: Boolean, required: true },
    status: { type: String, enum: Object.values(INVENTORY_RECORD_STATUSES), required: true },
    updatedOn: { type: Date, required: true },
  },
  { _id: false, versionKey: false },
);

const inventorySchema = new mongoose.Schema(
  {
    productId: { type: mongoose.SchemaTypes.ObjectId, required: true, unique: true },
    variants: [{ type: inventoryVariantSchema, required: true }],
    status: { type: String, enum: Object.values(INVENTORY_RECORD_STATUSES), required: true },
    createdOn: { type: Date, required: true },
    updatedOn: { type: Date, required: true },
  },
  { versionKey: false },
);

inventorySchema.index({ productId: 1 }, { unique: true });

export default mongoose.model<IInventoryDocument>("Inventory", inventorySchema);
