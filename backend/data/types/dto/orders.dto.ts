import { Request } from "express";
import { ORDER_STATUSES } from "../../enums";
import { BaseResponseDTO } from "./common.dto";
import { ICustomer } from "../customer.type";
import { IDeliveryUpdatePayload, IPickupUpdatePayload } from "../delivery.type";
import { IOrder, IOrderCustomerSnapshot, IProductInOrderResponse } from "../order.type";

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

export type OrderProductRequestItemDTO = {
  id: string;
  quantity: number;
};

export type OrderCreateRequestBodyDTO = {
  customer: string;
  products: OrderProductRequestItemDTO[];
};

export type OrderUpdateRequestBodyDTO = {
  customer?: string;
  products?: OrderProductRequestItemDTO[];
};

export type OrderPricingRequestBodyDTO = {
  products: OrderProductRequestItemDTO[];
  delivery?: IDeliveryUpdatePayload;
  pickup?: IPickupUpdatePayload;
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

export type OrderDetailsDTO = IOrder<ICustomer, IProductInOrderResponse>;
export type OrderListItemDTO = IOrder<IOrderCustomerSnapshot, IProductInOrderResponse>;

export type CreateOrderRequestDTO = Request<OrderByIdParamsDTO, unknown, OrderCreateRequestBodyDTO>;
export type UpdateOrderRequestDTO = Request<OrderPathIdParamsDTO, unknown, OrderUpdateRequestBodyDTO> & {
  order?: OrderDetailsDTO;
};
export type DeleteOrderRequestDTO = Request<OrderPathIdParamsDTO> & {
  order?: OrderDetailsDTO;
};
export type GetOrdersSortedRequestDTO = Request<unknown, unknown, unknown, OrderSortedQueryDTO>;
export type ExportOrdersRequestDTO = Request<unknown, unknown, OrderExportRequestBodyDTO>;
export type OrderPricingRequestDTO = Request<unknown, unknown, OrderPricingRequestBodyDTO>;
export type AssignManagerRequestDTO = Request<OrderAssignManagerParamsDTO> & {
  order?: OrderDetailsDTO;
};
export type UnassignManagerRequestDTO = Request<OrderPathOrderIdParamsDTO> & {
  order?: OrderDetailsDTO;
};
export type UpdateOrderStatusRequestDTO = Request<OrderPathIdParamsDTO, unknown, OrderStatusRequestDTO> & {
  order?: OrderDetailsDTO;
};
export type UpdateOrderDeliveryRequestDTO = Request<OrderPathIdParamsDTO, unknown, IDeliveryUpdatePayload> & {
  order?: OrderDetailsDTO;
};
export type UpdateOrderPickupRequestDTO = Request<OrderPathIdParamsDTO, unknown, IPickupUpdatePayload> & {
  order?: OrderDetailsDTO;
};
export type ReceiveOrderProductsRequestDTO = Request<OrderPathIdParamsDTO, unknown, OrderReceiveRequestDTO> & {
  order?: OrderDetailsDTO;
};
export type CreateOrderCommentRequestDTO = Request<OrderPathIdParamsDTO, unknown, OrderCommentCreateRequestDTO> & {
  order?: OrderDetailsDTO;
};
export type DeleteOrderCommentRequestDTO = Request<OrderCommentParamsDTO> & {
  order?: OrderDetailsDTO;
};

export type GetOrderByIdRequestDTO = Request<OrderByIdParamsDTO, unknown, unknown> & {
  order?: OrderDetailsDTO;
};

export type OrderRequestWithEntityDTO<P = OrderByIdParamsDTO, B = unknown, Q = unknown> = Request<P, unknown, B, Q> & {
  order?: OrderDetailsDTO;
};

export type GetOrderRequestWithEntityDTO = Request<OrderPathIdParamsDTO> & {
  order?: OrderDetailsDTO;
};

export type OrderResponseDTO = BaseResponseDTO & {
  Order: OrderDetailsDTO;
};

export type OrdersResponseDTO = BaseResponseDTO & {
  Orders: OrderDetailsDTO[];
};

export type OrdersSortedResponseDTO = BaseResponseDTO & {
  Orders: OrderListItemDTO[];
  total: number;
  page: number;
  limit: number;
  search: string;
  status: string[];
  deliveryStatus: string[];
  sorting: { sortField: "createdOn" | "total_price" | "status"; sortOrder: "asc" | "desc" };
};
