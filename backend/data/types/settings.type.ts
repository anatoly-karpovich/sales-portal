import { IDelivery } from "./delivery.type";
import type { USStateCode } from "../usStates";

export interface IPickupLocation {
  id: string;
  city: string;
  address: Omit<IDelivery["address"], "state" | "city">;
  isActive: boolean;
}

export interface ISettings {
  order: {
    maxProductsInOrder: number;
    maxProductQuantityInOrder: number;
  };
  inventory: {
    defaultLowStockThreshold: number;
  };
  delivery: {
    basePricePerItem: number;
    extraPriceForOtherCity: number;
    pickupLocations: Partial<Record<USStateCode, IPickupLocation[]>>;
  };
}
