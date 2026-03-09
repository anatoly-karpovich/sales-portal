import { apiClient } from '@/api/client'

export type NotificationItem = {
  _id: string
  userId: string
  type: string
  orderId: string
  message: string
  read: boolean
  createdAt: string
  expiresAt: string
}

type NotificationsResponse = {
  Notifications: NotificationItem[]
  IsSuccess: boolean
  ErrorMessage: string | null
}

export async function getNotifications() {
  const response = await apiClient.get<NotificationsResponse>('/notifications')
  return response.data.Notifications
}

export async function readNotification(notificationId: string) {
  const response = await apiClient.patch<NotificationsResponse>(`/notifications/${notificationId}/read`)
  return response.data.Notifications
}

export async function readAllNotifications() {
  const response = await apiClient.patch<NotificationsResponse>('/notifications/mark-all-read')
  return response.data.Notifications
}
