import mongoose, { Types } from "mongoose";
import { DocumentResult } from ".";
import { PRODUCT_STATUSES } from "../enums";

export interface IProductAttribute {
  key: string;
  name: string;
  values: string[];
}

export interface IProductVariant {
  _id?: Types.ObjectId;
  price: number;
  status: PRODUCT_STATUSES;
  attributes: Record<string, string>;
  imageUrl?: string;
}

export interface IProductSetup {
  completed: boolean;
  completedOn?: string;
  completedBy?: Types.ObjectId;
}

export interface IProduct extends DocumentResult<IProduct> {
  _id?: Types.ObjectId;
  name: string;
  manufacturer: string;
  categoryId: Types.ObjectId;
  rootCategoryId: Types.ObjectId;
  description?: string;
  imageUrl?: string;
  status: PRODUCT_STATUSES;
  setup: IProductSetup;
  attributes: IProductAttribute[];
  variants: IProductVariant[];
  createdOn: string;
  updatedOn: string;
}

export interface IProductDocument extends IProduct, mongoose.Document {
  _id?: Types.ObjectId;
}

export interface IProductFilters {
  manufacturers?: string[];
  statuses?: PRODUCT_STATUSES[];
  categoryId?: string;
  rootCategoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  search: string;
}
