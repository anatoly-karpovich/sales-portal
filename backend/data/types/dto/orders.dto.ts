import { Request } from "express";
import { ORDER_STATUSES } from "../../enums";
import { BaseResponseDTO } from "./common.dto";
import { ICustomer } from "../customer.type";
import { IDelivery } from "../delivery.type";
import { IOrder } from "../order.type";

export type OrderByIdParamsDTO = { id?: string; orderId?: string };
export type OrderPathIdParamsDTO = { id?: string };
export type OrderPathOrderIdParamsDTO = { orderId?: string };
export type OrderAssignManagerParamsDTO = { orderId?: string; managerId?: string };
export type OrderCommentParamsDTO = { id?: string; commentId?: string };
export type OrderSortedQueryDTO = {
  search?: string;
  status?: string | string[];
  sortField?: "createdOn" | "total_price" | "status";
  sortOrder?: "asc" | "desc";
  page?: string;
  limit?: string;
};

export type OrderCreateOrUpdateRequestDTO = {
  customer: string;
  products: string[];
};

export type OrderStatusRequestDTO = {
  status: ORDER_STATUSES;
};

export type OrderReceiveRequestDTO = {
  products: string[];
};

export type OrderCommentCreateRequestDTO = {
  comment: string;
};

export type CreateOrderRequestDTO = Request<OrderByIdParamsDTO, unknown, OrderCreateOrUpdateRequestDTO>;
export type UpdateOrderRequestDTO = Request<OrderPathIdParamsDTO, unknown, OrderCreateOrUpdateRequestDTO>;
export type DeleteOrderRequestDTO = Request<OrderPathIdParamsDTO>;
export type GetOrdersSortedRequestDTO = Request<unknown, unknown, unknown, OrderSortedQueryDTO>;
export type AssignManagerRequestDTO = Request<OrderAssignManagerParamsDTO>;
export type UnassignManagerRequestDTO = Request<OrderPathOrderIdParamsDTO>;
export type UpdateOrderStatusRequestDTO = Request<OrderPathIdParamsDTO, unknown, OrderStatusRequestDTO>;
export type UpdateOrderDeliveryRequestDTO = Request<OrderPathIdParamsDTO, unknown, IDelivery>;
export type ReceiveOrderProductsRequestDTO = Request<OrderPathIdParamsDTO, unknown, OrderReceiveRequestDTO>;
export type CreateOrderCommentRequestDTO = Request<OrderPathIdParamsDTO, unknown, OrderCommentCreateRequestDTO>;
export type DeleteOrderCommentRequestDTO = Request<OrderCommentParamsDTO>;

export type GetOrderByIdRequestDTO = Request<OrderByIdParamsDTO, unknown, unknown> & {
  order?: IOrder<ICustomer>;
};

export type OrderRequestWithEntityDTO<P = OrderByIdParamsDTO, B = unknown, Q = unknown> = Request<
  P,
  unknown,
  B,
  Q
> & {
  order?: IOrder<ICustomer>;
};

export type GetOrderRequestWithEntityDTO = Request<OrderPathIdParamsDTO> & {
  order?: IOrder<ICustomer>;
};

export type OrderResponseDTO = BaseResponseDTO & {
  Order: IOrder<ICustomer>;
};

export type OrdersResponseDTO = BaseResponseDTO & {
  Orders: IOrder<ICustomer>[];
};

export type OrdersSortedResponseDTO = BaseResponseDTO & {
  Orders: IOrder<ICustomer>[];
  total: number;
  page: number;
  limit: number;
  search: string;
  status: string[];
  sorting: { sortField: "createdOn" | "total_price" | "status"; sortOrder: "asc" | "desc" };
};
