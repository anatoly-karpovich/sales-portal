import { ROLES } from "../enums";
import mongoose, { Types } from "mongoose";

export interface IManager {
  username: string;
  firstName: string;
  lastName: string;
  password: string;
}

export interface IManagerWithRoles {
  username: string;
  firstName: string;
  lastName: string;
  roles: string[];
  _id: Types.ObjectId;
  createdOn: string;
}
