import mongoose, { Schema, Document, Types } from "mongoose";

interface IToken extends Document {
  userId: Types.ObjectId;
  token: string;
  expiresAt: Date;
}

const TokenSchema = new Schema<IToken>(
  {
    userId: { type: mongoose.SchemaTypes.ObjectId, ref: "User", required: true },
    token: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
  },
  { versionKey: false }
);

export default mongoose.model<IToken>("Token", TokenSchema);
