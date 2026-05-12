import mongoose, { Types } from "mongoose";
import { DocumentResult } from ".";
import { CATEGORY_STATUSES } from "../enums";

export interface ICategoryNode {
  _id?: Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  status: CATEGORY_STATUSES;
  children: ICategoryNode[];
  createdOn: string;
  updatedOn: string;
}

export interface ICategoryTree extends DocumentResult<ICategoryTree> {
  _id?: Types.ObjectId;
  nodes: ICategoryNode[];
  createdOn: string;
  updatedOn: string;
}

export interface ICategoryTreeDocument extends ICategoryTree, mongoose.Document {
  _id?: Types.ObjectId;
}
