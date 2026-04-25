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

  static sendToManager(managerId: string, data: any) {
    if (NotificationService.io) {
      NotificationService.io.to(managerId).emit("new_notification", data);
    }
  }

  async create({
    managerId,
    type,
    orderId,
    message,
  }: {
    managerId: string | Types.ObjectId;
    type: INotification["type"];
    orderId: string | Types.ObjectId;
    message: string;
  }) {
    const managerObjectId = managerId instanceof Types.ObjectId ? managerId : new Types.ObjectId(managerId);
    const orderObjectId = orderId instanceof Types.ObjectId ? orderId : new Types.ObjectId(orderId);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const result = await this.Notification.create({
      managerId: managerObjectId,
      type,
      orderId: orderObjectId,
      message,
      expiresAt,
    });

    const notifications = await this.getNotifications(managerObjectId);
    NotificationService.sendToManager(managerObjectId.toString(), {
      message,
      unreadAmount: notifications.filter((n) => !n.read).length,
    });

    return result;
  }

  async getNotifications(managerId: string | Types.ObjectId) {
    const managerObjectId = managerId instanceof Types.ObjectId ? managerId : new Types.ObjectId(managerId);
    return await this.Notification.find({ managerId: managerObjectId }).sort({ createdAt: -1 });
  }

  async markNotificationAsRead(notificationId: string, managerId: string | Types.ObjectId) {
    const managerObjectId = managerId instanceof Types.ObjectId ? managerId : new Types.ObjectId(managerId);
    await this.Notification.findOneAndUpdate(
      { _id: new Types.ObjectId(notificationId), managerId: managerObjectId },
      { read: true },
      { new: true }
    );

    return await this.getNotifications(managerObjectId);
  }

  async markAllNotificationsAsRead(managerId: string | Types.ObjectId) {
    const managerObjectId = managerId instanceof Types.ObjectId ? managerId : new Types.ObjectId(managerId);
    await this.Notification.updateMany({ managerId: managerObjectId, read: false }, { read: true });
    return await this.getNotifications(managerObjectId);
  }
}

