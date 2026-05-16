import mongoose, { Types } from "mongoose";
import { DocumentResult } from ".";

export interface ICategoryPathItem {
  _id: Types.ObjectId;
  name: string;
  slug: string;
}

export interface ICategory extends DocumentResult<ICategory> {
  _id?: Types.ObjectId;
  name: string;
  slug: string;
  slugLower: string;
  description?: string;
  imageUrl?: string;
  parentId: Types.ObjectId | null;
  rootId: Types.ObjectId;
  depth: number;
  ancestors: Types.ObjectId[];
  path: ICategoryPathItem[];
  pathSlugs: string[];
  childrenCount: number;
  isLeaf: boolean;
  createdOn: string;
  updatedOn: string;
}

export interface ICategoryDocument extends ICategory, mongoose.Document {
  _id?: Types.ObjectId;
}
