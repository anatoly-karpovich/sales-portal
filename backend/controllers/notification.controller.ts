import { Request, Response } from "express";
import { NotificationService } from "../services/notification.service";
import { getTokenFromRequest, getDataDataFromToken } from "../utils/utils";
const service = new NotificationService();
class NotificationController {
  async getNotifications(req: Request, res: Response) {
    try {
      const token = getTokenFromRequest(req);
      const userData = getDataDataFromToken(token);
      const notifications = await service.getNotifications(userData.id);
      return res.json({ Notifications: notifications, IsSuccess: true, ErrorMessage: null });
    } catch (e: any) {
      res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
    }
  }

  async readNotification(req: Request, res: Response) {
    try {
      const token = getTokenFromRequest(req);
      const userId = getDataDataFromToken(token).id;
      const notificationId = req.params.notificationId;
      const notifications = await service.markNotificationAsRead(notificationId, userId);
      return res.json({ Notifications: notifications, IsSuccess: true, ErrorMessage: null });
    } catch (err: any) {
      return res.status(500).json({ IsSuccess: false, ErrorMessage: err.message });
    }
  }

  async readAllNotifications(req: Request, res: Response) {
    try {
      const token = getTokenFromRequest(req);
      const userId = getDataDataFromToken(token).id;
      const notifications = await service.markAllNotificationsAsRead(userId);
      return res.json({ Notifications: notifications, IsSuccess: true, ErrorMessage: null });
    } catch (err: any) {
      return res.status(500).json({ IsSuccess: false, ErrorMessage: err.message });
    }
  }
}

export default new NotificationController();
