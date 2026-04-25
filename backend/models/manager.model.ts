import mongoose from "mongoose";

const ManagerModel = new mongoose.Schema(
  {
    username: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    roles: [{ type: String, ref: "Role" }],
    createdOn: { type: String, required: true },
  },
  { versionKey: false },
);

export default mongoose.model("Manager", ManagerModel, "managers");
