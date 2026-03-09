import { Document, Types } from "mongoose";

export type NotificationType =
  | "assigned"
  | "statusChanged"
  | "customerChanged"
  | "productsChanged"
  | "deliveryUpdated"
  | "productsDelivered"
  | "managerChanged"
  | "commentAdded"
  | "commentDeleted"
  | "newOrder"
  | "unassigned"
  | "assigned";

export interface INotification extends Document {
  userId: Types.ObjectId;
  type: NotificationType;
  orderId: Types.ObjectId;
  message: string;
  read: boolean;
  createdAt: Date;
  expiresAt?: Date;
}
