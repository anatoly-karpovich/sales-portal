import mongoose from "mongoose";
import { PRODUCT_STATUSES } from "../data/enums";
import { IProductDocument } from "../data/types";

const productAttribute = new mongoose.Schema(
  {
    key: { type: String, required: true },
    name: { type: String, required: true },
    values: [{ type: String, required: true }],
  },
  { _id: false, versionKey: false },
);

const productVariant = new mongoose.Schema(
  {
    price: { type: Number, required: true },
    status: { type: String, enum: PRODUCT_STATUSES, required: true },
    attributes: { type: Map, of: String, required: true },
    imageUrl: { type: String, required: false },
  },
  { versionKey: false },
);

const productSetup = new mongoose.Schema(
  {
    initCompleted: { type: Boolean, required: true, default: true },
    specCompleted: { type: Boolean, required: true, default: false },
    inventoryCompleted: { type: Boolean, required: true, default: false },
    completed: { type: Boolean, required: true, default: false },
    completedOn: { type: Date, required: false },
    completedBy: { type: mongoose.SchemaTypes.ObjectId, required: false },
  },
  { _id: false, versionKey: false },
);

const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, unique: true, required: true },
    manufacturer: { type: String, required: true },
    categoryId: { type: mongoose.SchemaTypes.ObjectId, required: true },
    rootCategoryId: { type: mongoose.SchemaTypes.ObjectId, required: true },
    description: { type: String, required: false },
    imageUrl: { type: String, required: false },
    status: { type: String, enum: PRODUCT_STATUSES, required: true },
    setup: {
      type: productSetup,
      required: true,
      default: () => ({
        initCompleted: true,
        specCompleted: false,
        inventoryCompleted: false,
        completed: false,
      }),
    },
    attributes: [{ type: productAttribute, required: true }],
    variants: [{ type: productVariant, required: true }],
    createdOn: { type: Date, required: true },
    updatedOn: { type: Date, required: true },
  },
  { versionKey: false },
);

ProductSchema.index({ categoryId: 1 });
ProductSchema.index({ rootCategoryId: 1 });

export default mongoose.model<IProductDocument>("Product", ProductSchema);
