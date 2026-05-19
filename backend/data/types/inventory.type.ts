import type { Document } from "mongoose";
import { Types } from "mongoose";
import {
  INVENTORY_ADJUSTMENT_TYPES,
  INVENTORY_RECORD_STATUSES,
  INVENTORY_STATUSES,
  RESERVATION_TYPES,
} from "../enums";
import type { DocumentResult } from "./document.type";

export interface IInventoryVariant {
  variantId: Types.ObjectId;
  quantity: number;
  reserved: number;
  available: number;
  lowStockThreshold: number;
  allowSellingOutOfStock: boolean;
  status: INVENTORY_RECORD_STATUSES;
  updatedOn: string;
}

export interface IInventory extends DocumentResult<IInventory> {
  _id?: Types.ObjectId;
  productId: Types.ObjectId;
  variants: IInventoryVariant[];
  status: INVENTORY_RECORD_STATUSES;
  createdOn: string;
  updatedOn: string;
}

export interface IInventoryDocument extends IInventory, Document {
  _id: Types.ObjectId;
}

export interface IInventoryAdjustment extends DocumentResult<IInventoryAdjustment> {
  _id?: Types.ObjectId;
  inventoryId: Types.ObjectId;
  productId: Types.ObjectId;
  variantId: Types.ObjectId;
  type: INVENTORY_ADJUSTMENT_TYPES;
  quantityChange: number;
  quantityBefore: number;
  quantityAfter: number;
  reservedBefore: number;
  reservedAfter: number;
  reason?: string;
  comment?: string;
  orderId?: Types.ObjectId;
  reservationId?: Types.ObjectId;
  createdBy: Types.ObjectId;
  createdOn: string;
}

export interface IInventoryAdjustmentDocument extends IInventoryAdjustment, Document {
  _id: Types.ObjectId;
}

export interface IInventoryVariantReadModel extends IInventoryVariant {
  stockStatus: INVENTORY_STATUSES;
}

export interface IInventoryReadModel extends IInventory {
  totalQuantity: number;
  totalReserved: number;
  totalAvailable: number;
  inventoryStatus: INVENTORY_STATUSES;
  lowStockVariantsCount: number;
  outOfStockVariantsCount: number;
  variants: IInventoryVariantReadModel[];
}

export interface IInventoryListItem {
  _id: string;
  productId: string;
  product: {
    _id: string;
    name: string;
    manufacturer: string;
    status: string;
  };
  status: INVENTORY_RECORD_STATUSES;
  inventoryStatus: INVENTORY_STATUSES;
  variantsCount: number;
  lowStockVariantsCount: number;
  outOfStockVariantsCount: number;
  updatedOn: string;
}

export interface IReservationItem {
  productId: Types.ObjectId;
  variantId: Types.ObjectId;
  quantity: number;
}

export interface IReservation extends DocumentResult<IReservation> {
  _id?: Types.ObjectId;
  orderId: Types.ObjectId;
  type: RESERVATION_TYPES;
  items: IReservationItem[];
  expiresAt: string | null;
  createdOn: string;
  updatedOn: string;
}

export interface IReservationDocument extends IReservation, Document {
  _id: Types.ObjectId;
}

export interface IInventoryReservationListItemLine {
  productId: string;
  variantId: string;
  productName: string;
  manufacturer: string;
  variantLabel: string;
  reservedQuantity: number;
}

export interface IInventoryReservationListItem {
  _id: string;
  orderId: string;
  type: RESERVATION_TYPES;
  expiresAt: string | null;
  createdOn: string;
  updatedOn: string;
  customer: {
    _id: string;
    name: string;
    email: string;
  } | null;
  items: IInventoryReservationListItemLine[];
  reservedProductsCount: number;
  reservedUnits: number;
  isExpired: boolean;
}

export interface IInventoryReservationsSummary {
  activeReservations: number;
  expiringSoon: number;
  processing: number;
  reservedUnits: number;
}
