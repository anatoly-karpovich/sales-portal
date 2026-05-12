import mongoose from "mongoose";
import { ICategoryTreeDocument } from "../data/types";

const categoryNodeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true },
    description: { type: String, required: false },
    imageUrl: { type: String, required: false },
    createdOn: { type: Date, required: true },
    updatedOn: { type: Date, required: true },
  },
  { versionKey: false },
);

categoryNodeSchema.add({
  children: { type: [categoryNodeSchema], required: true, default: [] },
});

const categoryTreeSchema = new mongoose.Schema(
  {
    nodes: { type: [categoryNodeSchema], required: true, default: [] },
    createdOn: { type: Date, required: true },
    updatedOn: { type: Date, required: true },
  },
  { versionKey: false },
);

export default mongoose.model<ICategoryTreeDocument>("CategoryTree", categoryTreeSchema);
