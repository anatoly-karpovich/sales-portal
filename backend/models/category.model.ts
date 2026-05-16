import mongoose from "mongoose";
import { ICategoryDocument } from "../data/types";

const categoryPathItemSchema = new mongoose.Schema(
  {
    _id: { type: mongoose.SchemaTypes.ObjectId, required: true },
    name: { type: String, required: true },
    slug: { type: String, required: true },
  },
  { _id: false, versionKey: false },
);

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true },
    slugLower: { type: String, required: true, unique: true },
    description: { type: String, required: false },
    imageUrl: { type: String, required: false },
    parentId: { type: mongoose.SchemaTypes.ObjectId, default: null, index: true },
    rootId: { type: mongoose.SchemaTypes.ObjectId, required: true, index: true },
    depth: { type: Number, required: true, default: 0 },
    ancestors: { type: [mongoose.SchemaTypes.ObjectId], required: true, default: [], index: true },
    path: { type: [categoryPathItemSchema], required: true, default: [] },
    pathSlugs: { type: [String], required: true, default: [], index: true },
    childrenCount: { type: Number, required: true, default: 0 },
    isLeaf: { type: Boolean, required: true, default: true, index: true },
    createdOn: { type: Date, required: true },
    updatedOn: { type: Date, required: true, index: true },
  },
  { versionKey: false },
);

export default mongoose.model<ICategoryDocument>("Category", categorySchema);
