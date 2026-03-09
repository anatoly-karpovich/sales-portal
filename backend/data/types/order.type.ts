import { ORDER_HISTORY_ACTIONS, ORDER_STATUSES } from "../enums";
import type { Document } from "mongoose";
import { Types } from "mongoose";
import type { ICustomer, IProduct, IDelivery, DocumentResult, IComment } from ".";
import { IUserWithRoles } from "./users.types";

export interface IOrder<CustomerType> {
  readonly _id?: Types.ObjectId;
  status: ORDER_STATUSES;
  customer: CustomerType extends ICustomer
    ? ICustomer
    : CustomerType extends Types.ObjectId
    ? Types.ObjectId
    : never;
  products: IProductInOrder[];
  delivery: IDelivery | null;
  total_price: number;
  createdOn: string;
  history: IHistory[];
  comments: IComment[];
  assignedManager: IUserWithRoles | null;
}

export interface IProductInOrder extends IProduct {
  received: boolean;
}

export interface IOrderRequest {
  customer: Types.ObjectId;
  products: Types.ObjectId[];
}

export interface IOrderDocument
  extends IOrder<Types.ObjectId>,
    Document,
    DocumentResult<IOrderDocument> {
  readonly _id: Types.ObjectId;
}

export interface IHistory {
  readonly action: ORDER_HISTORY_ACTIONS;
  readonly status: string;
  readonly customer: Types.ObjectId;
  readonly products: IProduct[];
  readonly delivery: IDelivery | null;
  readonly total_price: number;
  readonly changedOn: string;
  readonly performer: IUserWithRoles;
  readonly assignedManager: IUserWithRoles | null;
}

