import { Request } from "express";
import { IProduct } from "../product.type";
import { BaseResponseDTO } from "./common.dto";

export type ProductByIdParamsDTO = { id?: string };

export type ProductCreateOrUpdateRequestDTO = Omit<IProduct, "_id" | "createdOn">;

export type GetProductByIdRequestDTO = Request<ProductByIdParamsDTO, unknown, ProductCreateOrUpdateRequestDTO> & {
  product?: IProduct;
};

export type ProductRequestWithEntityDTO<P = ProductByIdParamsDTO, B = unknown> = Request<P, unknown, B> & {
  product?: IProduct;
};

export type ProductResponseDTO = BaseResponseDTO & {
  Product: IProduct;
};

export type ProductsListResponseDTO = BaseResponseDTO & {
  Products: IProduct[];
  total?: number;
  page?: number;
  limit?: number;
  search?: string;
  manufacturer?: string[];
  sorting?: { sortField: string; sortOrder: string };
};
