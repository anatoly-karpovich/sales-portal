import { ISettings } from "./types/settings.type";

export const CORE_US_DEFAULT_CITIES: string[] = [
  "New York",
  "Los Angeles",
  "Chicago",
  "Houston",
  "Phoenix",
  "Philadelphia",
  "San Antonio",
  "San Diego",
  "Dallas",
  "San Jose",
  "Austin",
  "Jacksonville",
  "Fort Worth",
  "Columbus",
  "Charlotte",
  "Indianapolis",
  "San Francisco",
  "Seattle",
  "Denver",
  "Washington, DC",
  "Boston",
  "Miami",
  "Atlanta",
  "Detroit",
  "Nashville",
  "Portland",
  "Las Vegas",
  "Baltimore",
  "Minneapolis",
  "Orlando",
];

export const DEFAULT_SETTINGS: ISettings = {
  order: {
    maxProductsInOrder: 5,
    maxProductQuantityInOrder: 10,
  },
  inventory: {
    defaultLowStockThreshold: 5,
  },
  delivery: {
    defaultCities: CORE_US_DEFAULT_CITIES,
    basePricePerItem: 0,
    extraPriceForOtherCity: 0,
  },
};
