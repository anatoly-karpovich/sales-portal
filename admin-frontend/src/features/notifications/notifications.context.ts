import { createContext } from 'react'
import type { NotificationItem } from '@/api/modules/notifications.api'

export type NotificationsContextValue = {
  notifications: NotificationItem[]
  unreadCount: number
  isLoading: boolean
  markAsRead: (notificationId: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  refetchNotifications: () => Promise<void>
}

export const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined)
