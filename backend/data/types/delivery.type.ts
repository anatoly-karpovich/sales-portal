import { DELIVERY, DELIVERY_STATUSES } from "../enums";
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

export interface IDeliveryUpdatePayload {
  express: boolean;
  address: IDeliveryAddress;
}

export interface IPickupUpdatePayload {
  pickupLocationId: string;
}

export interface IDeliveryPayload {
  condition: DELIVERY;
  express?: boolean;
  address: IDeliveryAddress;
}

export type IDeliverySchedule =
  | {
      express: boolean;
      estimatedDays: number;
      estimatedDate: string | null;
      startsAt: string | null;
      dueDate: string | null;
    }
  | {
      readyInDays: number;
      holdForDays: number;
      availableFromDate: string | null;
      pickupByDate: string | null;
      startsAt: string | null;
    };

export interface IDeliverySnapshotCore {
  condition: DELIVERY;
  address: IDeliveryAddress;
  price: number;
  pricingTier: DELIVERY_PRICING_TIER;
  schedule: IDeliverySchedule;
}

export interface IDelivery extends IDeliverySnapshotCore {
  status: DELIVERY_STATUSES;
  isOverdue?: boolean;
  overdueByDays?: number;
}
