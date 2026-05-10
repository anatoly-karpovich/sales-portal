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

const catalogSettings = new mongoose.Schema(
  {
    manufacturers: [{ type: String, required: true }],
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

const deliveryPricingItem = new mongoose.Schema(
  {
    basePrice: { type: Number, required: true },
    minDays: { type: Number, required: true },
    express: {
      days: { type: Number, required: true },
      extraPrice: { type: Number, required: true },
    },
  },
  { _id: false, versionKey: false },
);

const pickupPolicySettings = new mongoose.Schema(
  {
    readyInDays: { type: Number, required: true },
    holdForDays: { type: Number, required: true },
    remindBeforeDays: { type: Number, required: false },
  },
  { _id: false, versionKey: false },
);

const shippingDeliverySettings = new mongoose.Schema(
  {
    pricing: {
      localCity: { type: deliveryPricingItem, required: true },
      sameState: { type: deliveryPricingItem, required: true },
      outOfState: { type: deliveryPricingItem, required: true },
    },
  },
  { _id: false, versionKey: false },
);

const shippingPickupSettings = new mongoose.Schema(
  {
    locations: {
      type: Map,
      of: [pickupLocationSettings],
      required: true,
      validate: {
        validator(value: Map<string, unknown>) {
          const keys = [...value.keys()];
          return keys.every((key) => US_STATE_CODES.includes(key as (typeof US_STATE_CODES)[number]));
        },
        message: "locations must use valid US 2-letter state codes as keys",
      },
    },
    policy: { type: pickupPolicySettings, required: true },
  },
  { _id: false, versionKey: false },
);

const shippingProcessingSettings = new mongoose.Schema(
  {
    cutoffHour: { type: Number, required: true, min: 0, max: 23 },
  },
  { _id: false, versionKey: false },
);

const shippingSettings = new mongoose.Schema(
  {
    processing: { type: shippingProcessingSettings, required: true },
    delivery: { type: shippingDeliverySettings, required: true },
    pickup: { type: shippingPickupSettings, required: true },
  },
  { _id: false, versionKey: false },
);

const settingsModel = new mongoose.Schema(
  {
    catalog: { type: catalogSettings, required: true },
    order: { type: orderSettings, required: true },
    inventory: { type: inventorySettings, required: true },
    shipping: { type: shippingSettings, required: true },
  },
  { versionKey: false },
);

export default mongoose.model<ISettings>("Settings", settingsModel);
