import { DocumentResult } from ".";
import mongoose, { Types } from "mongoose";
import type { USStateCode } from "../usStates";

export interface ICustomer {
  _id?: Types.ObjectId;
  email: string;
  name: string;
  state: USStateCode;
  city: string;
  street: string;
  house: number;
  apartment?: number;
  zipCode: string;
  phone: string;
  createdOn: string;
  notes?: string;
}

export interface ICustomerDocument extends ICustomer, DocumentResult<ICustomer>, mongoose.Document {
  _id?: Types.ObjectId;
}
