import type { Document } from "mongoose";
import { Types } from "mongoose";
import {
  INVENTORY_ADJUSTMENT_TYPES,
  INVENTORY_RECORD_STATUSES,
  INVENTORY_STATUSES,
  RESERVATION_STATUSES,
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
  stockStatus: INVENTORY_STATUSES;
  status: INVENTORY_RECORD_STATUSES;
  updatedOn: string;
}

export interface IInventory extends DocumentResult<IInventory> {
  _id?: Types.ObjectId;
  productId: Types.ObjectId;
  totalQuantity: number;
  totalReserved: number;
  totalAvailable: number;
  inventoryStatus: INVENTORY_STATUSES;
  lowStockVariantsCount: number;
  outOfStockVariantsCount: number;
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

export interface IReservationItem {
  productId: Types.ObjectId;
  variantId: Types.ObjectId;
  quantity: number;
}

export interface IReservation extends DocumentResult<IReservation> {
  _id?: Types.ObjectId;
  orderId: Types.ObjectId;
  type: RESERVATION_TYPES;
  status: RESERVATION_STATUSES;
  items: IReservationItem[];
  expiresAt: string;
  createdOn: string;
  updatedOn: string;
}

export interface IReservationDocument extends IReservation, Document {
  _id: Types.ObjectId;
}
