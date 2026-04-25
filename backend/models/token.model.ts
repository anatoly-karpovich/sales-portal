import mongoose, { Schema, Document, Types } from "mongoose";

interface IToken extends Document {
  managerId: Types.ObjectId;
  token: string;
  expiresAt: Date;
}

const TokenSchema = new Schema<IToken>(
  {
    managerId: { type: mongoose.SchemaTypes.ObjectId, ref: "Manager", required: true },
    token: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
  },
  { versionKey: false }
);

export default mongoose.model<IToken>("Token", TokenSchema);
