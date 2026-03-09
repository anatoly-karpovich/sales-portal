import { Request } from "express";
import { IProduct } from "../product.type";
import { BaseResponseDTO } from "./common.dto";

export type ProductByIdParamsDTO = { id?: string };

export type ProductCreateOrUpdateRequestDTO = Omit<IProduct, "_id" | "createdOn">;

export type ProductsSortedQueryDTO = {
  search?: string;
  sortField?: "name" | "price" | "manufacturer" | "createdOn";
  sortOrder?: "asc" | "desc";
  manufacturer?: string | string[];
  page?: string;
  limit?: string;
};

export type ProductExportFormatDTO = "csv" | "json";

export type ProductExportFiltersDTO = {
  search?: string;
  manufacturer?: string[];
  page?: number;
  limit?: number;
  sortField?: "name" | "price" | "manufacturer" | "createdOn";
  sortOrder?: "asc" | "desc";
} | null;

export type ProductExportRequestBodyDTO = {
  format: ProductExportFormatDTO;
  filters?: ProductExportFiltersDTO;
  fields: Array<keyof IProduct>;
};

export type CreateProductRequestDTO = Request<ProductByIdParamsDTO, unknown, ProductCreateOrUpdateRequestDTO>;
export type UpdateProductRequestDTO = Request<ProductByIdParamsDTO, unknown, ProductCreateOrUpdateRequestDTO>;
export type DeleteProductRequestDTO = Request<ProductByIdParamsDTO>;
export type GetProductsSortedRequestDTO = Request<unknown, unknown, unknown, ProductsSortedQueryDTO>;
export type ExportProductsRequestDTO = Request<unknown, unknown, ProductExportRequestBodyDTO>;

export type GetProductByIdRequestDTO = Request<ProductByIdParamsDTO, unknown, unknown> & {
  product?: IProduct;
};

export type ProductRequestWithEntityDTO<P = ProductByIdParamsDTO, B = unknown, Q = unknown> = Request<
  P,
  unknown,
  B,
  Q
> & {
  product?: IProduct;
};

export type GetProductRequestWithEntityDTO = Request<ProductByIdParamsDTO> & {
  product?: IProduct;
};

export type ProductResponseDTO = BaseResponseDTO & {
  Product: IProduct;
};

export type ProductsResponseDTO = BaseResponseDTO & {
  Products: IProduct[];
};

export type ProductsSortedResponseDTO = BaseResponseDTO & {
  Products: IProduct[];
  total?: number;
  page?: number;
  limit?: number;
  search?: string;
  manufacturer?: string[];
  sorting?: { sortField: "name" | "price" | "manufacturer" | "createdOn"; sortOrder: "asc" | "desc" };
};
