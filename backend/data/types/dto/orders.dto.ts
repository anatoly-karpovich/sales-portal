import { Request } from "express";
import { ORDER_STATUSES } from "../../enums";
import { BaseResponseDTO } from "./common.dto";
import { ICustomer } from "../customer.type";
import { IDelivery } from "../delivery.type";
import { IOrder } from "../order.type";

export type OrderByIdParamsDTO = { id?: string; orderId?: string };
export type OrderIdParamsDTO = { id: string };
export type OrderCommentParamsDTO = OrderByIdParamsDTO & { commentId?: string };

export type OrderCreateOrUpdateBodyDTO = {
  customer: string;
  products: string[];
};

export type OrderStatusBodyDTO = {
  status: ORDER_STATUSES;
};

export type OrderReceiveBodyDTO = {
  products: string[];
};

export type OrderCommentCreateBodyDTO = {
  comment: string;
};

export type GetOrderByIdRequestDTO = Request<OrderByIdParamsDTO> & {
  order?: IOrder<ICustomer>;
};

export type OrderRequestWithEntityDTO<P = OrderByIdParamsDTO, B = unknown> = Request<P, unknown, B> & {
  order?: IOrder<ICustomer>;
};

export type OrderByIdResponseDTO = BaseResponseDTO & {
  Order: IOrder<ICustomer>;
};

export type OrdersListResponseDTO = BaseResponseDTO & {
  Orders: IOrder<ICustomer>[];
  total: number;
  page: number;
  limit: number;
  search: string;
  status: string[];
  sorting: { sortField: string; sortOrder: string };
};

export type OrderDeliveryBodyDTO = IDelivery;
