import mongoose from "mongoose";
import { ISettings } from "../data/types/settings.type";

const orderSettings = new mongoose.Schema(
  {
    maxProductsInOrder: { type: Number, required: true },
    maxProductQuantityInOrder: { type: Number, required: true },
  },
  { _id: false, versionKey: false },
);

const inventorySettings = new mongoose.Schema(
  {
    defaultLowStockThreshold: { type: Number, required: true },
  },
  { _id: false, versionKey: false },
);

const deliverySettings = new mongoose.Schema(
  {
    defaultCities: [{ type: String, required: true }],
    basePricePerItem: { type: Number, required: true },
    extraPriceForOtherCity: { type: Number, required: true },
  },
  { _id: false, versionKey: false },
);

const settingsModel = new mongoose.Schema(
  {
    order: { type: orderSettings, required: true },
    inventory: { type: inventorySettings, required: true },
    delivery: { type: deliverySettings, required: true },
  },
  { versionKey: false },
);

export default mongoose.model<ISettings>("Settings", settingsModel);
