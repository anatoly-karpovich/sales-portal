import { DELIVERY } from "../enums";

export interface IDelivery {
  finalDate: string;
  condition: DELIVERY;
  address: {
    city: string;
    street: string;
    house: number;
    flat: number;
  };
}
