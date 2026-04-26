import { DocumentResult } from ".";
import mongoose, { Types } from "mongoose";

export interface ICustomer {
  _id?: Types.ObjectId;
  email: string;
  name: string;
  city: string;
  street: string;
  house: number;
  flat: number;
  phone: string;
  createdOn: string;
  notes?: string;
}

export interface ICustomerDocument extends ICustomer, DocumentResult<ICustomer>, mongoose.Document {
  _id?: Types.ObjectId;
}
