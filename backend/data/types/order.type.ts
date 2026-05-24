import { ORDER_HISTORY_ACTIONS, ORDER_STATUSES } from "../enums";
import type { Document } from "mongoose";
import { Types } from "mongoose";
import type { ICustomer, IDelivery, DocumentResult, IComment } from ".";
import { IManagerWithRoles } from "./manager.types";
import type { IProductVariant } from "./product.type";

export type IOrderCustomerSnapshot = {
  _id: Types.ObjectId;
  email: string;
  name: string;
};

export interface IProductInOrderRef {
  _id: Types.ObjectId;
}

export interface IProductVariantInOrderRef {
  _id: Types.ObjectId;
}

export interface IProductInOrder {
  productId: Types.ObjectId;
  variantId: Types.ObjectId;
  manufacturer: string;
  unitPrice: number;
  quantity: number;
  name: string;
  displayName: string;
  attributes: IProductVariant["attributes"];
  received: boolean;
  imageUrl?: string;
}

export interface IProductInOrderResponseRef extends IProductInOrderRef {
  name: string;
}

export interface IProductVariantInOrderResponseRef extends IProductVariantInOrderRef {}

export interface IProductInOrderResponse {
  product: IProductInOrderResponseRef;
  variant: IProductVariantInOrderResponseRef;
  displayName: string;
  unitPrice: number;
  quantity: number;
  received: boolean;
}

export interface IOrder<CustomerType = IOrderCustomerSnapshot, ProductsType = IProductInOrder> {
  readonly _id?: Types.ObjectId;
  status: ORDER_STATUSES;
  customer: CustomerType;
  products: ProductsType[];
  delivery: IDelivery;
  total_price: number;
  createdOn: string;
  history: IHistory[];
  comments: IComment[];
  assignedManager: IManagerWithRoles | null;
}

export interface IOrderProductRequestItem {
  productId: Types.ObjectId;
  variantId: Types.ObjectId;
  quantity: number;
}

export interface IOrderReceiveRequestItem {
  productId: Types.ObjectId;
  variantId: Types.ObjectId;
}

export interface IOrderUpdateRequest {
  customer?: Types.ObjectId;
  products?: IOrderProductRequestItem[];
}

export type IOrderRequest = Required<IOrderUpdateRequest>;

export interface IOrderDocument extends IOrder<IOrderCustomerSnapshot>, Document, DocumentResult<IOrderDocument> {
  readonly _id: Types.ObjectId;
}

export interface IHistory {
  readonly action: ORDER_HISTORY_ACTIONS;
  readonly status: ORDER_STATUSES;
  readonly customer: Types.ObjectId;
  readonly products: IProductInOrder[];
  readonly delivery: IDelivery;
  readonly total_price: number;
  readonly changedOn: string;
  readonly performer: IManagerWithRoles;
  readonly assignedManager: IManagerWithRoles | null;
}
