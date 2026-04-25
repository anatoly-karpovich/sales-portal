import { Request } from "express";
import { ORDER_STATUSES } from "../../enums";
import { BaseResponseDTO } from "./common.dto";
import { ICustomer } from "../customer.type";
import { IDelivery } from "../delivery.type";
import { IOrder, IOrderCustomerSnapshot } from "../order.type";

export type OrderByIdParamsDTO = { orderId?: string };
export type OrderPathIdParamsDTO = { orderId?: string };
export type OrderPathOrderIdParamsDTO = { orderId?: string };
export type OrderAssignManagerParamsDTO = { orderId?: string; managerId?: string };
export type OrderCommentParamsDTO = { orderId?: string; commentId?: string };
export type OrderSortedQueryDTO = {
  search?: string;
  status?: string | string[];
  deliveryStatus?: string | string[];
  sortField?: "createdOn" | "total_price" | "status";
  sortOrder?: "asc" | "desc";
  page?: string;
  limit?: string;
};

export type OrderExportFormatDTO = "csv" | "json";

export type OrderExportFiltersDTO = {
  search?: string;
  status?: string[];
  deliveryStatus?: string[];
  page?: number;
  limit?: number;
  sortField?: "createdOn" | "total_price" | "status";
  sortOrder?: "asc" | "desc";
} | null;

export type OrderExportRequestBodyDTO = {
  format: OrderExportFormatDTO;
  filters?: OrderExportFiltersDTO;
  fields: Array<
    "status" | "deliveryStatus" | "total_price" | "delivery" | "customer" | "products" | "assignedManager" | "createdOn"
  >;
};

export type OrderCreateRequestBodyDTO = {
  customer: string;
  products: string[];
};

export type OrderUpdateRequestBodyDTO = {
  customer?: string;
  products?: string[];
};

export type OrderStatusRequestDTO = {
  status: ORDER_STATUSES.DRAFT | ORDER_STATUSES.IN_PROCESS | ORDER_STATUSES.CANCELED;
};

export type OrderReceiveRequestDTO = {
  products: string[];
};

export type OrderCommentCreateRequestDTO = {
  comment: string;
};

export type CreateOrderRequestDTO = Request<OrderByIdParamsDTO, unknown, OrderCreateRequestBodyDTO>;
export type UpdateOrderRequestDTO = Request<OrderPathIdParamsDTO, unknown, OrderUpdateRequestBodyDTO> & {
  order?: IOrder<ICustomer>;
};
export type DeleteOrderRequestDTO = Request<OrderPathIdParamsDTO> & {
  order?: IOrder<ICustomer>;
};
export type GetOrdersSortedRequestDTO = Request<unknown, unknown, unknown, OrderSortedQueryDTO>;
export type ExportOrdersRequestDTO = Request<unknown, unknown, OrderExportRequestBodyDTO>;
export type AssignManagerRequestDTO = Request<OrderAssignManagerParamsDTO> & {
  order?: IOrder<ICustomer>;
};
export type UnassignManagerRequestDTO = Request<OrderPathOrderIdParamsDTO> & {
  order?: IOrder<ICustomer>;
};
export type UpdateOrderStatusRequestDTO = Request<OrderPathIdParamsDTO, unknown, OrderStatusRequestDTO> & {
  order?: IOrder<ICustomer>;
};
export type UpdateOrderDeliveryRequestDTO = Request<OrderPathIdParamsDTO, unknown, IDelivery> & {
  order?: IOrder<ICustomer>;
};
export type ReceiveOrderProductsRequestDTO = Request<OrderPathIdParamsDTO, unknown, OrderReceiveRequestDTO> & {
  order?: IOrder<ICustomer>;
};
export type CreateOrderCommentRequestDTO = Request<OrderPathIdParamsDTO, unknown, OrderCommentCreateRequestDTO> & {
  order?: IOrder<ICustomer>;
};
export type DeleteOrderCommentRequestDTO = Request<OrderCommentParamsDTO> & {
  order?: IOrder<ICustomer>;
};

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
  Orders: IOrder<IOrderCustomerSnapshot>[];
  total: number;
  page: number;
  limit: number;
  search: string;
  status: string[];
  deliveryStatus: string[];
  sorting: { sortField: "createdOn" | "total_price" | "status"; sortOrder: "asc" | "desc" };
};
