import mongoose from "mongoose";
import { INVENTORY_ADJUSTMENT_TYPES } from "../data/enums";
import { IInventoryAdjustmentDocument } from "../data/types";

const inventoryAdjustmentSchema = new mongoose.Schema(
  {
    inventoryId: { type: mongoose.SchemaTypes.ObjectId, required: true, ref: "Inventory" },
    productId: { type: mongoose.SchemaTypes.ObjectId, required: true, index: true },
    variantId: { type: mongoose.SchemaTypes.ObjectId, required: true, index: true },
    type: { type: String, enum: Object.values(INVENTORY_ADJUSTMENT_TYPES), required: true },
    quantityChange: { type: Number, required: true },
    quantityBefore: { type: Number, required: true },
    quantityAfter: { type: Number, required: true },
    reservedBefore: { type: Number, required: true },
    reservedAfter: { type: Number, required: true },
    comment: { type: String, required: false },
    orderId: { type: mongoose.SchemaTypes.ObjectId, required: false, index: true },
    reservationId: { type: mongoose.SchemaTypes.ObjectId, required: false, index: true },
    createdBy: { type: mongoose.SchemaTypes.ObjectId, required: true, ref: "Manager" },
    createdOn: { type: Date, required: true, index: true },
  },
  { versionKey: false },
);

inventoryAdjustmentSchema.index({ productId: 1, createdOn: -1 });
inventoryAdjustmentSchema.index({ productId: 1, variantId: 1, createdOn: -1 });

export default mongoose.model<IInventoryAdjustmentDocument>("InventoryAdjustment", inventoryAdjustmentSchema);
