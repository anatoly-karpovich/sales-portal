import { useEffect, useMemo, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSnackbar } from 'notistack'
import { getNotifications, readAllNotifications, readNotification, type NotificationItem } from '@/api/modules/notifications.api'
import { TOKEN_STORAGE_KEY } from '@/api/client'
import { useAuth } from '@/features/auth/useAuth'
import { NotificationsContext, type NotificationsContextValue } from '@/features/notifications/notifications.context'

type Props = {
  children: React.ReactNode
}

function getSocketBaseUrl() {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL
  return apiBaseUrl.replace(/\/api\/?$/, '')
}

export function NotificationsProvider({ children }: Props) {
  const queryClient = useQueryClient()
  const { enqueueSnackbar } = useSnackbar()
  const { state } = useAuth()
  const [realtimeUnread, setRealtimeUnread] = useState<number | null>(null)

  const enabled = state === 'authenticated'

  const { data: notifications = [], isLoading, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => getNotifications(),
    enabled,
    staleTime: 30_000,
  })

  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: string) => readNotification(notificationId),
    onSuccess: (nextNotifications) => {
      queryClient.setQueryData(['notifications'], nextNotifications)
      setRealtimeUnread(nextNotifications.filter((item) => !item.read).length)
    },
  })

  const markAllAsReadMutation = useMutation({
    mutationFn: () => readAllNotifications(),
    onSuccess: (nextNotifications) => {
      queryClient.setQueryData(['notifications'], nextNotifications)
      setRealtimeUnread(0)
    },
  })

  useEffect(() => {
    if (!enabled) {
      return
    }

    const token = window.localStorage.getItem(TOKEN_STORAGE_KEY)
    if (!token) {
      return
    }

    const socket: Socket = io(getSocketBaseUrl(), {
      auth: { token: `Bearer ${token}` },
      transports: ['websocket'],
    })

    socket.on('new_notification', (payload: { message?: string; unreadAmount?: number }) => {
      if (payload.message) {
        enqueueSnackbar(payload.message, { variant: 'info' })
      }
      if (typeof payload.unreadAmount === 'number') {
        setRealtimeUnread(payload.unreadAmount)
      }
      void refetch()
    })

    return () => {
      socket.disconnect()
    }
  }, [enabled, enqueueSnackbar, refetch])

  const unreadCountFromApi = notifications.filter((item) => !item.read).length
  const unreadCount = realtimeUnread ?? unreadCountFromApi

  const value = useMemo<NotificationsContextValue>(
    () => ({
      notifications: notifications as NotificationItem[],
      unreadCount,
      isLoading,
      markAsRead: async (notificationId: string) => {
        await markAsReadMutation.mutateAsync(notificationId)
      },
      markAllAsRead: async () => {
        await markAllAsReadMutation.mutateAsync()
      },
      refetchNotifications: async () => {
        await refetch()
      },
    }),
    [notifications, unreadCount, isLoading, markAsReadMutation, markAllAsReadMutation, refetch],
  )

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
}
