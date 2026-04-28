import mongoose from "mongoose";
import { ISettings } from "../data/types/settings.type";
import { US_STATE_CODES } from "../data/usStates";

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

const pickupAddressSettings = new mongoose.Schema(
  {
    street: { type: String, required: true },
    house: { type: Number, required: true },
    apartment: { type: Number, required: false },
    zipCode: { type: String, required: true },
  },
  { _id: false, versionKey: false },
);

const pickupLocationSettings = new mongoose.Schema(
  {
    id: { type: String, required: true, match: /^[a-fA-F0-9]{24}$/ },
    city: { type: String, required: true },
    address: { type: pickupAddressSettings, required: true },
    isActive: { type: Boolean, required: true },
  },
  { _id: false, versionKey: false },
);

const deliverySettings = new mongoose.Schema(
  {
    basePricePerItem: { type: Number, required: true },
    extraPriceForOtherCity: { type: Number, required: true },
    pickupLocations: {
      type: Map,
      of: [pickupLocationSettings],
      required: true,
      validate: {
        validator(value: Map<string, unknown>) {
          const keys = [...value.keys()];
          return keys.every((key) => US_STATE_CODES.includes(key as (typeof US_STATE_CODES)[number]));
        },
        message: "pickupLocations must use valid US 2-letter state codes as keys",
      },
    },
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
