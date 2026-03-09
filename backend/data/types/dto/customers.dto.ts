import { Request } from "express";
import { ICustomer } from "../customer.type";
import { BaseResponseDTO } from "./common.dto";

export type CustomerByIdParamsDTO = { id?: string };

export type CustomerCreateOrUpdateRequestDTO = Omit<ICustomer, "_id" | "createdOn">;

export type CustomersSortedQueryDTO = {
  search?: string;
  sortField?: "email" | "name" | "country" | "createdOn";
  sortOrder?: "asc" | "desc";
  country?: string | string[];
  page?: string;
  limit?: string;
};

export type CreateCustomerRequestDTO = Request<CustomerByIdParamsDTO, unknown, CustomerCreateOrUpdateRequestDTO>;

export type UpdateCustomerRequestDTO = Request<CustomerByIdParamsDTO, unknown, CustomerCreateOrUpdateRequestDTO>;
export type DeleteCustomerRequestDTO = Request<CustomerByIdParamsDTO>;

export type GetCustomerByIdRequestDTO = Request<CustomerByIdParamsDTO, unknown, unknown> & {
  customer?: ICustomer;
};

export type GetCustomersSortedRequestDTO = Request<unknown, unknown, unknown, CustomersSortedQueryDTO>;

export type CustomerRequestWithEntityDTO<P = CustomerByIdParamsDTO, B = unknown, Q = unknown> = Request<
  P,
  unknown,
  B,
  Q
> & {
  customer?: ICustomer;
};

export type GetCustomerRequestWithEntityDTO = Request<CustomerByIdParamsDTO> & {
  customer?: ICustomer;
};

export type CustomerResponseDTO = BaseResponseDTO & {
  Customer: ICustomer;
};

export type CustomersResponseDTO = BaseResponseDTO & {
  Customers: ICustomer[];
};

export type CustomersSortedResponseDTO = BaseResponseDTO & {
  Customers: ICustomer[];
  total?: number;
  page?: number;
  limit?: number;
  search?: string;
  country?: string[];
  sorting?: { sortField: "email" | "name" | "country" | "createdOn"; sortOrder: "asc" | "desc" };
};
