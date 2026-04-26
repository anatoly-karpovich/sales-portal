export interface ISettings {
  order: {
    maxProductsInOrder: number;
    maxProductQuantityInOrder: number;
  };
  inventory: {
    defaultLowStockThreshold: number;
  };
  delivery: {
    defaultCities: string[];
    basePricePerItem: number;
    extraPriceForOtherCity: number;
  };
}
