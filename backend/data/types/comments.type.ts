import { Types } from "mongoose";

export interface ICommentAuthor {
  readonly _id: Types.ObjectId;
  readonly username: string;
  readonly firstName: string;
  readonly lastName: string;
}

export interface IComment {
  readonly _id?: Types.ObjectId;
  readonly text: string;
  readonly createdOn: string;
  readonly createdBy?: Types.ObjectId | ICommentAuthor;
}
