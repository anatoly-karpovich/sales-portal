import mongoose, { Types } from "mongoose";
import { Server } from "socket.io";
import { INotification } from "../data/types/notification.types";
import notificationModel from "../models/notification.model";

export class NotificationService {
  private Notification = notificationModel;
  private static io: null | Server = null;

  static setSocketIO(io: Server) {
    NotificationService.io = io;
  }

  static sendToUser(userId: string, data: any) {
    if (NotificationService.io) {
      NotificationService.io.to(userId).emit("new_notification", data);
    }
  }

  async create({
    userId,
    type,
    orderId,
    message,
  }: {
    userId: string | Types.ObjectId;
    type: INotification["type"];
    orderId: string | Types.ObjectId;
    message: string;
  }) {
    const userObjectId = userId instanceof Types.ObjectId ? userId : new Types.ObjectId(userId);
    const orderObjectId = orderId instanceof Types.ObjectId ? orderId : new Types.ObjectId(orderId);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const result = await this.Notification.create({
      userId: userObjectId,
      type,
      orderId: orderObjectId,
      message,
      expiresAt,
    });

    const notifications = await this.getNotifications(userObjectId);
    NotificationService.sendToUser(userObjectId.toString(), {
      message,
      unreadAmount: notifications.filter((n) => !n.read).length,
    });

    return result;
  }

  async getNotifications(userId: string | Types.ObjectId) {
    const userObjectId = userId instanceof Types.ObjectId ? userId : new Types.ObjectId(userId);
    return await this.Notification.find({ userId: userObjectId }).sort({ createdAt: -1 });
  }

  async markNotificationAsRead(notificationId: string, userId: string | Types.ObjectId) {
    const userObjectId = userId instanceof Types.ObjectId ? userId : new Types.ObjectId(userId);
    await this.Notification.findOneAndUpdate(
      { _id: new Types.ObjectId(notificationId), userId: userObjectId },
      { read: true },
      { new: true }
    );

    return await this.getNotifications(userObjectId);
  }

  async markAllNotificationsAsRead(userId: string | Types.ObjectId) {
    const userObjectId = userId instanceof Types.ObjectId ? userId : new Types.ObjectId(userId);
    await this.Notification.updateMany({ userId: userObjectId, read: false }, { read: true });
    return await this.getNotifications(userObjectId);
  }
}

