import { Request } from "express";
import {
  INVENTORY_ADJUSTMENT_TYPES,
  PRODUCT_STATUSES,
  INVENTORY_STATUSES,
} from "../../enums";
import { BaseResponseDTO } from "./common.dto";
import { IInventoryAdjustment, IInventoryListItem, IInventoryReadModel } from "../inventory.type";

export type InventoryListQueryDTO = {
  search?: string;
  manufacturer?: string | string[];
  productStatus?: PRODUCT_STATUSES | PRODUCT_STATUSES[];
  inventoryStatus?: INVENTORY_STATUSES | INVENTORY_STATUSES[];
  page?: string;
  limit?: string;
  sortField?: "updatedOn" | "inventoryStatus" | "product.name" | "manufacturer";
  sortOrder?: "asc" | "desc";
};

export type InventoryByProductParamsDTO = {
  productId?: string;
};

export type InventoryByProductVariantParamsDTO = {
  productId?: string;
  variantId?: string;
};

export type InventoryVariantSettingsBodyDTO = {
  lowStockThreshold?: number;
  allowSellingOutOfStock?: boolean;
};

export type InventoryAdjustmentCreateBodyDTO = {
  productId: string;
  variantId: string;
  type:
    | INVENTORY_ADJUSTMENT_TYPES.MANUAL_INCREASE
    | INVENTORY_ADJUSTMENT_TYPES.MANUAL_DECREASE
    | INVENTORY_ADJUSTMENT_TYPES.MANUAL_CORRECTION
    | INVENTORY_ADJUSTMENT_TYPES.DAMAGE
    | INVENTORY_ADJUSTMENT_TYPES.RETURN;
  quantity: number;
  reason?: string;
  comment?: string;
};

export type InventoryAdjustmentListQueryDTO = {
  type?: INVENTORY_ADJUSTMENT_TYPES | INVENTORY_ADJUSTMENT_TYPES[];
  orderId?: string;
  reservationId?: string;
  createdBy?: string;
  fromDate?: string;
  toDate?: string;
  page?: string;
  limit?: string;
  sortOrder?: "asc" | "desc";
};

export type InventoryWithMetaDTO = IInventoryReadModel & {
  product?: {
    _id: string;
    name: string;
    manufacturer: string;
    categoryId: string;
    rootCategoryId: string;
    status: string;
  };
};

export type GetInventoryListRequestDTO = Request<unknown, unknown, unknown, InventoryListQueryDTO>;

export type GetInventoryByProductRequestDTO = Request<InventoryByProductParamsDTO>;

export type PatchInventoryVariantSettingsRequestDTO = Request<InventoryByProductVariantParamsDTO, unknown, InventoryVariantSettingsBodyDTO>;

export type CreateInventoryAdjustmentRequestDTO = Request<unknown, unknown, InventoryAdjustmentCreateBodyDTO>;

export type GetInventoryAdjustmentsByProductRequestDTO = Request<InventoryByProductParamsDTO, unknown, unknown, InventoryAdjustmentListQueryDTO>;

export type GetInventoryAdjustmentsByVariantRequestDTO = Request<
  InventoryByProductVariantParamsDTO,
  unknown,
  unknown,
  InventoryAdjustmentListQueryDTO
>;

export type InventoryResponseDTO = BaseResponseDTO & {
  Inventory: InventoryWithMetaDTO;
};

export type InventoriesResponseDTO = BaseResponseDTO & {
  Inventories: IInventoryListItem[];
  total: number;
  page: number;
  limit: number;
  search: string;
  manufacturer: string[];
  productStatus: PRODUCT_STATUSES[];
  inventoryStatus: INVENTORY_STATUSES[];
  sorting: {
    sortField: "updatedOn" | "inventoryStatus" | "product.name" | "manufacturer";
    sortOrder: "asc" | "desc";
  };
};

export type InventoryAdjustmentsResponseDTO = BaseResponseDTO & {
  Adjustments: IInventoryAdjustment[];
  total: number;
  page: number;
  limit: number;
  sortOrder: "asc" | "desc";
};
