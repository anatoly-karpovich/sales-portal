import { Request } from "express";
import { ICustomer } from "../customer.type";
import { BaseResponseDTO } from "./common.dto";

export type CustomerByIdParamsDTO = { id?: string };

export type CustomerCreateOrUpdateRequestDTO = Omit<ICustomer, "_id" | "createdOn">;

export type GetCustomerByIdRequestDTO = Request<CustomerByIdParamsDTO, unknown, CustomerCreateOrUpdateRequestDTO> & {
  customer?: ICustomer;
};

export type CustomerRequestWithEntityDTO<P = CustomerByIdParamsDTO, B = unknown> = Request<P, unknown, B> & {
  customer?: ICustomer;
};

export type CustomerResponseDTO = BaseResponseDTO & {
  Customer: ICustomer;
};

export type CustomersListResponseDTO = BaseResponseDTO & {
  Customers: ICustomer[];
  total?: number;
  page?: number;
  limit?: number;
  search?: string;
  country?: string[];
  sorting?: { sortField: string; sortOrder: string };
};
