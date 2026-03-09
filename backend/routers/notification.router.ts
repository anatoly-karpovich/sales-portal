import { Router } from "express";
import NotificationController from "../controllers/notification.controller";
import { authmiddleware } from "../middleware/authmiddleware.js";

const notification = Router();

notification.get("/notifications", authmiddleware, NotificationController.getNotifications.bind(NotificationController));
notification.patch(
  "/notifications/:notificationId/read",
  authmiddleware,
  NotificationController.readNotification.bind(NotificationController),
);
notification.patch(
  "/notifications/mark-all-read",
  authmiddleware,
  NotificationController.readAllNotifications.bind(NotificationController),
);

/**
 * @swagger
 * components:
 *   schemas:
 *     Notification:
 *       type: object
 *       required:
 *         - userId
 *         - type
 *         - orderId
 *         - message
 *         - read
 *       properties:
 *         _id:
 *           type: string
 *           description: The notification ID
 *         userId:
 *           type: string
 *           description: The user this notification belongs to
 *         type:
 *           type: string
 *           description: The type of notification (e.g., statusChanged, assigned, etc.)
 *         orderId:
 *           type: string
 *           description: The order related to the notification
 *         message:
 *           type: string
 *           description: The notification text
 *         read:
 *           type: boolean
 *           description: Read/unread status
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: When notification was created
 *         expiresAt:
 *           type: string
 *           format: date-time
 *           description: When notification expires (for cleanup)
 *       example:
 *         _id: "66685e03a49be8eea8b3b111"
 *         userId: "6650b914db6d1d4d12c6c915"
 *         type: "statusChanged"
 *         orderId: "6628e650db61bb3e9ed9ef19"
 *         message: "Order #12345 status changed to 'In Process'"
 *         read: false
 *         createdAt: "2024-05-27T10:27:46.858Z"
 *         expiresAt: "2024-05-30T10:27:46.858Z"
 */

/**
 * @swagger
 * tags:
 *   - name: Notifications
 *     description: User notifications management
 */

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Get all notifications for the authenticated user
 *     tags: [Notifications]
 *     parameters:
 *       - in: header
 *         name: Authorization
 *         required: true
 *         schema:
 *           type: string
 *           example: Bearer <JWT token>
 *         description: Bearer token for authentication
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of notifications
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 Notifications:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Notification'
 *                 IsSuccess:
 *                   type: boolean
 *                   example: true
 *                 ErrorMessage:
 *                   type: string
 *                   nullable: true
 *       401:
 *         description: Unauthorized, missing or invalid token
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/notifications/{notificationId}/read:
 *   patch:
 *     summary: Mark a notification as read
 *     tags: [Notifications]
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the notification to mark as read
 *       - in: header
 *         name: Authorization
 *         required: true
 *         schema:
 *           type: string
 *           example: Bearer <JWT token>
 *         description: Bearer token for authentication
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Notification marked as read
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 Notifications:
 *                   $ref: '#/components/schemas/Notification'
 *                 IsSuccess:
 *                   type: boolean
 *                   example: true
 *                 ErrorMessage:
 *                   type: string
 *                   nullable: true
 *       401:
 *         description: Unauthorized, missing or invalid token
 *       404:
 *         description: Notification not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/notifications/mark-all-read:
 *   patch:
 *     summary: Mark all notifications as read for the authenticated user
 *     tags: [Notifications]
 *     parameters:
 *       - in: header
 *         name: Authorization
 *         required: true
 *         schema:
 *           type: string
 *           example: Bearer <JWT token>
 *         description: Bearer token for authentication
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked as read
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 Notifications:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Notification'
 *                 IsSuccess:
 *                   type: boolean
 *                   example: true
 *                 ErrorMessage:
 *                   type: string
 *                   nullable: true
 *       401:
 *         description: Unauthorized, missing or invalid token
 *       500:
 *         description: Server error
 */

export default notification;
