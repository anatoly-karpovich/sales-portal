import { DELIVERY } from "../enums";
import type { USStateCode } from "../usStates";

export interface IDelivery {
  finalDate: string;
  condition: DELIVERY;
  address: {
    state: USStateCode;
    city: string;
    street: string;
    house: number;
    apartment?: number;
    zipCode: string;
  };
}
