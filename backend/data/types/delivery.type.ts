import { DELIVERY } from "../enums";
import type { USStateCode } from "../usStates";
import { DELIVERY_PRICING_TIER } from "./settings.type";

export type IDeliveryAddress = {
  state: USStateCode;
  city: string;
  street: string;
  house: number;
  apartment?: number;
  zipCode: string;
};

export interface IDeliveryPayload {
  condition: DELIVERY;
  express?: boolean;
  address: IDeliveryAddress;
}

export type IDeliverySchedule =
  | {
      express: boolean;
      estimatedDate: string;
    }
  | {
      availableFromDate: string;
      pickupByDate: string;
    };

export interface IDeliverySnapshotCore {
  condition: DELIVERY;
  address: IDeliveryAddress;
  price: number;
  pricingTier: DELIVERY_PRICING_TIER;
  schedule: IDeliverySchedule;
}

export interface IDelivery extends IDeliverySnapshotCore {}
