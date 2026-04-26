import { IDelivery } from "./delivery.type";

export interface ISettings {
  order: {
    maxProductsInOrder: number;
    maxProductQuantityInOrder: number;
  };
  inventory: {
    defaultLowStockThreshold: number;
  };
  delivery: {
    defaultCities: readonly string[];
    basePricePerItem: number;
    extraPriceForOtherCity: number;
    pickupAddresses: Record<string, Omit<IDelivery["address"], "city">>;
  };
}
