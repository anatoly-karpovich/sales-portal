import { ISettings } from "./types/settings.type";

export const DEFAULT_SETTINGS: ISettings = {
  catalog: {
    manufacturers: ["Apple", "Samsung", "Google", "Microsoft", "Sony", "Xiaomi", "Amazon", "Tesla"],
  },
  order: {
    maxProductsInOrder: 5,
    maxProductQuantityInOrder: 10,
  },
  inventory: {
    defaultLowStockThreshold: 5,
    allowSellingOutOfStockByDefault: false,
  },
  reservations: {
    adminDraftReservationTtlMs: 24 * 60 * 60 * 1000,
    customerPaymentReservationTtlMs: 15 * 60 * 1000,
    cronIntervalMs: 5 * 60 * 1000,
  },
  shipping: {
    processing: {
      cutoffHour: 18,
    },
    delivery: {
      pricing: {
        localCity: {
          basePrice: 10,
          minDays: 1,
          express: { days: 0, extraPrice: 10 },
        },
        sameState: {
          basePrice: 20,
          minDays: 3,
          express: { days: 2, extraPrice: 10 },
        },
        outOfState: {
          basePrice: 35,
          minDays: 7,
          express: { days: 5, extraPrice: 20 },
        },
      },
    },
    pickup: {
      policy: {
        readyInDays: 1,
        holdForDays: 5,
        remindBeforeDays: 1,
      },
      locations: {
        NY: [
          {
            id: "64f100000000000000000001",
            city: "New York",
            address: {
              street: "5th Avenue",
              house: 742,
              apartment: 12,
              zipCode: "10001",
            },
            isActive: true,
          },
          {
            id: "64f100000000000000000002",
            city: "Buffalo",
            address: {
              street: "Lafayette Square",
              house: 1,
              zipCode: "14203",
            },
            isActive: true,
          },
        ],
        CA: [
          {
            id: "64f100000000000000000003",
            city: "Los Angeles",
            address: {
              street: "Sunset Boulevard",
              house: 1050,
              zipCode: "90028",
            },
            isActive: true,
          },
          {
            id: "64f100000000000000000004",
            city: "San Francisco",
            address: {
              street: "Market Street",
              house: 1355,
              apartment: 8,
              zipCode: "94103",
            },
            isActive: true,
          },
          {
            id: "64f100000000000000000005",
            city: "San Diego",
            address: {
              street: "Park Boulevard",
              house: 330,
              zipCode: "92101",
            },
            isActive: true,
          },
        ],
        TX: [
          {
            id: "64f100000000000000000006",
            city: "Houston",
            address: {
              street: "Main Street",
              house: 901,
              zipCode: "77002",
            },
            isActive: true,
          },
          {
            id: "64f100000000000000000007",
            city: "Dallas",
            address: {
              street: "Elm Street",
              house: 1201,
              apartment: 5,
              zipCode: "75270",
            },
            isActive: true,
          },
        ],
        FL: [
          {
            id: "64f100000000000000000008",
            city: "Miami",
            address: {
              street: "Biscayne Boulevard",
              house: 600,
              zipCode: "33132",
            },
            isActive: true,
          },
          {
            id: "64f100000000000000000009",
            city: "Orlando",
            address: {
              street: "Orange Avenue",
              house: 101,
              apartment: 3,
              zipCode: "32801",
            },
            isActive: true,
          },
        ],
        IL: [
          {
            id: "64f10000000000000000000a",
            city: "Chicago",
            address: {
              street: "South State Street",
              house: 400,
              zipCode: "60605",
            },
            isActive: true,
          },
        ],
        WA: [
          {
            id: "64f10000000000000000000b",
            city: "Seattle",
            address: {
              street: "4th Avenue",
              house: 1000,
              apartment: 10,
              zipCode: "98104",
            },
            isActive: true,
          },
        ],
        CO: [
          {
            id: "64f10000000000000000000c",
            city: "Denver",
            address: {
              street: "Colfax Avenue",
              house: 200,
              zipCode: "80202",
            },
            isActive: true,
          },
        ],
        GA: [
          {
            id: "64f10000000000000000000d",
            city: "Atlanta",
            address: {
              street: "Peachtree Street",
              house: 230,
              zipCode: "30303",
            },
            isActive: true,
          },
        ],
        MA: [
          {
            id: "64f10000000000000000000e",
            city: "Boston",
            address: {
              street: "Boylston Street",
              house: 700,
              apartment: 15,
              zipCode: "02116",
            },
            isActive: true,
          },
        ],
        AZ: [
          {
            id: "64f10000000000000000000f",
            city: "Phoenix",
            address: {
              street: "North Central Avenue",
              house: 100,
              zipCode: "85004",
            },
            isActive: true,
          },
        ],
      },
    },
  },
};
