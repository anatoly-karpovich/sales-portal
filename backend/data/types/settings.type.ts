import { IDeliveryPayload } from "./delivery.type";
import type { USStateCode } from "../usStates";

export interface IPickupLocation {
  id: string;
  city: string;
  address: Omit<IDeliveryPayload["address"], "state" | "city">;
  isActive: boolean;
}

export interface ISettings {
  catalog: {
    manufacturers: string[];
  };
  order: {
    maxProductsInOrder: number;
    maxProductQuantityInOrder: number;
  };
  inventory: {
    defaultLowStockThreshold: number;
  };
  shipping: {
    processing: {
      cutoffHour: number;
    };
    delivery: {
      pricing: IDeliveryPricing;
    };
    pickup: {
      locations: Partial<Record<USStateCode, IPickupLocation[]>>;
      policy: IDeliveryPickupPolicy;
    };
  };
}

export enum DELIVERY_PRICING_ZONE {
  LOCAL_CITY = "localCity",
  SAME_STATE = "sameState",
  OUT_OF_STATE = "outOfState",
}

export enum DELIVERY_PRICING_TIER {
  PICKUP = "pickup",
  LOCAL_CITY = "local_city",
  SAME_STATE = "same_state",
  OUT_OF_STATE = "out_of_state",
}

export type IDeliveryPricing = Record<
  DELIVERY_PRICING_ZONE,
  { basePrice: number; minDays: number; express: { days: number; extraPrice: number } }
>;

export interface IDeliveryPickupPolicy {
  readyInDays: number;
  holdForDays: number;
  remindBeforeDays?: number;
}
