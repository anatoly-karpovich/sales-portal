import mongoose, { Types } from "mongoose";
import { DocumentResult } from ".";

export interface ICategoryNode {
  _id?: Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
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
