import mongoose from "mongoose";
import { INVENTORY_RECORD_STATUSES, INVENTORY_STATUSES } from "../data/enums";
import { IInventoryDocument } from "../data/types";

const inventoryVariantSchema = new mongoose.Schema(
  {
    variantId: { type: mongoose.SchemaTypes.ObjectId, required: true },
    quantity: { type: Number, required: true },
    reserved: { type: Number, required: true },
    available: { type: Number, required: true },
    lowStockThreshold: { type: Number, required: true, min: 0 },
    allowSellingOutOfStock: { type: Boolean, required: true },
    stockStatus: { type: String, enum: Object.values(INVENTORY_STATUSES), required: true },
    status: { type: String, enum: Object.values(INVENTORY_RECORD_STATUSES), required: true },
    updatedOn: { type: Date, required: true },
  },
  { _id: false, versionKey: false },
);

const inventorySchema = new mongoose.Schema(
  {
    productId: { type: mongoose.SchemaTypes.ObjectId, required: true, unique: true },
    totalQuantity: { type: Number, required: true },
    totalReserved: { type: Number, required: true },
    totalAvailable: { type: Number, required: true },
    inventoryStatus: { type: String, enum: Object.values(INVENTORY_STATUSES), required: true },
    lowStockVariantsCount: { type: Number, required: true },
    outOfStockVariantsCount: { type: Number, required: true },
    variants: [{ type: inventoryVariantSchema, required: true }],
    status: { type: String, enum: Object.values(INVENTORY_RECORD_STATUSES), required: true },
    createdOn: { type: Date, required: true },
    updatedOn: { type: Date, required: true },
  },
  { versionKey: false },
);

inventorySchema.index({ productId: 1 }, { unique: true });
inventorySchema.index({ inventoryStatus: 1, updatedOn: -1 });

export default mongoose.model<IInventoryDocument>("Inventory", inventorySchema);
