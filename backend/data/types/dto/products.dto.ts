import { Request } from "express";
import { PRODUCT_STATUSES } from "../../enums";
import { IProduct, IProductAttribute, IProductVariant } from "../product.type";
import { BaseResponseDTO } from "./common.dto";

export type ProductByIdParamsDTO = { productId?: string };
export type ProductVariantByIdParamsDTO = { productId?: string; variantId?: string };

export type ProductVariantCreateRequestDTO = Pick<IProductVariant, "price" | "attributes" | "imageUrl">;
export type ProductVariantReplaceRequestDTO = ProductVariantCreateRequestDTO & {
  _id?: string;
};
export type ProductVariantsCreateRequestDTO = ProductVariantCreateRequestDTO[];
export type ProductVariantsReplaceBodyDTO = {
  attributes?: IProductAttribute[];
  variants: ProductVariantReplaceRequestDTO[];
};

export type ProductCreateOrReplaceRequestDTO = Pick<
  IProduct,
  "name" | "manufacturer" | "category" | "description" | "imageUrl" | "attributes"
> & {
  variants: ProductVariantReplaceRequestDTO[];
};

export type ProductPatchRequestDTO = Partial<Pick<IProduct, "name" | "manufacturer" | "category" | "description" | "imageUrl">>;

export type ProductVariantPatchRequestDTO = Partial<Pick<IProductVariant, "price" | "attributes" | "imageUrl">>;
export type ProductStatusPatchRequestDTO = {
  status: PRODUCT_STATUSES;
};
export type ProductVariantStatusPatchRequestDTO = {
  status: PRODUCT_STATUSES;
};

export type ProductListItemDTO = {
  _id: string;
  name: string;
  manufacturer: string;
  category: string;
  status: PRODUCT_STATUSES;
  variantsCount: number;
  priceRange: {
    min: number;
    max: number;
  };
};

export type ProductDetailsDTO = {
  _id: string;
  name: string;
  manufacturer: string;
  category: string;
  description?: string;
  imageUrl?: string;
  status: PRODUCT_STATUSES;
  attributes: IProductAttribute[];
  variants: IProductVariant[];
  priceRange: {
    min: number;
    max: number;
  };
  createdOn: string;
  updatedOn: string;
};

export type ProductsSortedQueryDTO = {
  search?: string;
  sortField?: "name" | "price" | "manufacturer" | "category" | "status" | "createdOn";
  sortOrder?: "asc" | "desc";
  manufacturer?: string | string[];
  status?: PRODUCT_STATUSES | PRODUCT_STATUSES[];
  page?: string;
  limit?: string;
};

export type ProductExportFormatDTO = "csv" | "json";

export type ProductExportFiltersDTO = {
  search?: string;
  manufacturer?: string[];
  status?: PRODUCT_STATUSES[];
  page?: number;
  limit?: number;
  sortField?: "name" | "price" | "manufacturer" | "category" | "status" | "createdOn";
  sortOrder?: "asc" | "desc";
} | null;

export type ProductExportFieldsDTO =
  | "_id"
  | "name"
  | "manufacturer"
  | "category"
  | "status"
  | "variantsCount"
  | "priceRange"
  | "attributes"
  | "variants"
  | "createdOn"
  | "updatedOn";

export type ProductExportRequestBodyDTO = {
  format: ProductExportFormatDTO;
  filters?: ProductExportFiltersDTO;
  fields: ProductExportFieldsDTO[];
};

export type CreateProductRequestDTO = Request<ProductByIdParamsDTO, unknown, ProductCreateOrReplaceRequestDTO>;
export type ReplaceProductRequestDTO = Request<ProductByIdParamsDTO, unknown, ProductCreateOrReplaceRequestDTO> & {
  product?: IProduct;
};
export type PatchProductRequestDTO = Request<ProductByIdParamsDTO, unknown, ProductPatchRequestDTO> & {
  product?: IProduct;
};
export type PatchProductVariantRequestDTO = Request<ProductVariantByIdParamsDTO, unknown, ProductVariantPatchRequestDTO> & {
  product?: IProduct;
};
export type CreateProductVariantRequestDTO = Request<ProductByIdParamsDTO, unknown, ProductVariantCreateRequestDTO> & {
  product?: IProduct;
};
export type CreateProductVariantsRequestDTO = Request<ProductByIdParamsDTO, unknown, ProductVariantsCreateRequestDTO> & {
  product?: IProduct;
};
export type ReplaceProductVariantsRequestDTO = Request<ProductByIdParamsDTO, unknown, ProductVariantsReplaceBodyDTO> & {
  product?: IProduct;
};
export type ValidateProductVariantsRequestDTO = Request<ProductByIdParamsDTO, unknown, ProductVariantsReplaceBodyDTO> & {
  product?: IProduct;
};
export type PatchProductStatusRequestDTO = Request<ProductByIdParamsDTO, unknown, ProductStatusPatchRequestDTO> & {
  product?: IProduct;
};
export type PatchProductVariantStatusRequestDTO = Request<
  ProductVariantByIdParamsDTO,
  unknown,
  ProductVariantStatusPatchRequestDTO
> & {
  product?: IProduct;
};
export type DeleteProductRequestDTO = Request<ProductByIdParamsDTO>;
export type DeleteProductVariantRequestDTO = Request<ProductVariantByIdParamsDTO> & {
  product?: IProduct;
};
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
  Product: ProductDetailsDTO;
};

export type ProductsResponseDTO = BaseResponseDTO & {
  Products: ProductDetailsDTO[];
};

export type ProductsSortedResponseDTO = BaseResponseDTO & {
  Products: ProductListItemDTO[];
  total?: number;
  page?: number;
  limit?: number;
  search?: string;
  manufacturer?: string[];
  status?: PRODUCT_STATUSES[];
  sorting?: {
    sortField: "name" | "price" | "manufacturer" | "category" | "status" | "createdOn";
    sortOrder: "asc" | "desc";
  };
};
