import { Request } from "express";
import { CATEGORY_STATUSES } from "../../enums";
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

export type CategoryStatusPatchRequestBodyDTO = {
  status: CATEGORY_STATUSES;
};

export type CategoryMoveRequestBodyDTO = {
  targetParentId: string | null;
};

export type CategoriesTreeQueryDTO = {
  includeArchived?: string;
};

export type CategoriesFlatQueryDTO = {
  status?: CATEGORY_STATUSES | "All";
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
  status: CATEGORY_STATUSES;
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
  status: CATEGORY_STATUSES;
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

export type GetCategoriesTreeRequestDTO = Request<unknown, unknown, unknown, CategoriesTreeQueryDTO>;
export type GetCategoriesFlatRequestDTO = Request<unknown, unknown, unknown, CategoriesFlatQueryDTO>;
export type GetCategoryNodeRequestDTO = Request<CategoryByIdParamsDTO>;
export type CreateCategoryNodeRequestDTO = Request<unknown, unknown, CategoryCreateRequestBodyDTO>;
export type PatchCategoryNodeRequestDTO = Request<CategoryByIdParamsDTO, unknown, CategoryPatchRequestBodyDTO>;
export type PatchCategoryStatusRequestDTO = Request<CategoryByIdParamsDTO, unknown, CategoryStatusPatchRequestBodyDTO>;
export type MoveCategoryNodeRequestDTO = Request<CategoryByIdParamsDTO, unknown, CategoryMoveRequestBodyDTO>;
export type DeleteCategoryNodeRequestDTO = Request<CategoryByIdParamsDTO>;
export type GetCategoryProductsRequestDTO = Request<CategoryByIdParamsDTO>;
