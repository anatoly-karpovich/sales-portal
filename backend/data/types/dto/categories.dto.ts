import { Request } from "express";
import { BaseResponseDTO } from "./common.dto";
import { ProductListItemDTO } from "./products.dto";

export type CategoryByIdParamsDTO = { categoryId?: string };

export type CategoryCreateRequestBodyDTO = {
  name: string;
  slug?: string;
  description?: string;
  imageUrl?: string;
  parentId?: string;
};

export type CategoryPatchRequestBodyDTO = Partial<{
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
}>;

export type CategoryMoveRequestBodyDTO = {
  targetParentId: string | null;
};

export type CategoryNodePathItemDTO = {
  _id: string;
  name: string;
  slug: string;
};

export type CategoryNodeDTO = {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  children: CategoryNodeDTO[];
  createdOn: string;
  updatedOn: string;
};

export type CategoryFlatNodeDTO = {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  parentId?: string;
  path: CategoryNodePathItemDTO[];
  createdOn: string;
  updatedOn: string;
};

export type CategoryTreeResponseDTO = BaseResponseDTO & {
  CategoriesTree: CategoryNodeDTO[];
};

export type CategoryFlatResponseDTO = BaseResponseDTO & {
  Categories: CategoryFlatNodeDTO[];
};

export type CategoryNodeResponseDTO = BaseResponseDTO & {
  Category: CategoryNodeDTO;
};

export type CategoryProductsResponseDTO = BaseResponseDTO & {
  Products: ProductListItemDTO[];
};

export type GetCategoriesTreeRequestDTO = Request;
export type GetCategoriesFlatRequestDTO = Request;
export type GetCategoryNodeRequestDTO = Request<CategoryByIdParamsDTO>;
export type CreateCategoryNodeRequestDTO = Request<unknown, unknown, CategoryCreateRequestBodyDTO>;
export type PatchCategoryNodeRequestDTO = Request<CategoryByIdParamsDTO, unknown, CategoryPatchRequestBodyDTO>;
export type MoveCategoryNodeRequestDTO = Request<CategoryByIdParamsDTO, unknown, CategoryMoveRequestBodyDTO>;
export type DeleteCategoryNodeRequestDTO = Request<CategoryByIdParamsDTO>;
export type GetCategoryProductsRequestDTO = Request<CategoryByIdParamsDTO>;
