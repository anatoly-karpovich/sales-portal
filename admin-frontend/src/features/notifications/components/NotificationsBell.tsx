import { Badge, Box, Button, CircularProgress, IconButton, List, ListItemButton, ListItemText, Menu, Stack, Typography } from '@mui/material'
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotifications } from '@/features/notifications/useNotifications'
import { formatDateTime } from '@/utils/date'

export function NotificationsBell() {
  const navigate = useNavigate()
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } = useNotifications()
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const [isMarkingAll, setIsMarkingAll] = useState(false)
  const open = Boolean(anchorEl)

  return (
    <>
      <IconButton color="inherit" onClick={(event) => setAnchorEl(event.currentTarget)} data-testid="notifications-bell-button">
        <Badge color="error" badgeContent={unreadCount} invisible={!unreadCount} data-testid="notifications-bell-badge">
          <NotificationsNoneIcon />
        </Badge>
      </IconButton>

      <Menu
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { width: 340 } } }}
        data-testid="notifications-menu"
      >
        <Box sx={{ px: 1.5, pt: 1.5, pb: 1, borderBottom: 1, borderColor: 'divider' }} data-testid="notifications-menu-header">
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
            <Typography fontWeight={700} data-testid="notifications-menu-title">Notifications</Typography>
            <Button
              size="small"
              onClick={() => {
                void (async () => {
                  try {
                    setIsMarkingAll(true)
                    await markAllAsRead()
                  } finally {
                    setIsMarkingAll(false)
                  }
                })()
              }}
              disabled={!unreadCount || isMarkingAll}
              data-testid="notifications-mark-all-button"
            >
              {isMarkingAll ? <CircularProgress size={14} color="inherit" /> : 'Read All'}
            </Button>
          </Stack>
        </Box>

        {isLoading ? (
          <Box sx={{ py: 3, display: 'grid', placeItems: 'center' }} data-testid="notifications-loading">
            <CircularProgress size={22} />
          </Box>
        ) : notifications.length === 0 ? (
          <Typography sx={{ p: 2 }} color="text.secondary" data-testid="notifications-empty-state">
            No notifications
          </Typography>
        ) : (
          <List sx={{ p: 0, maxHeight: 380, overflowY: 'auto' }} data-testid="notifications-list">
            {notifications.map((notification, index) => (
              <ListItemButton
                key={notification._id}
                onClick={async () => {
                  if (!notification.read) {
                    await markAsRead(notification._id)
                  }
                }}
                sx={{ alignItems: 'flex-start', borderBottom: 1, borderColor: 'divider' }}
                data-testid={`notifications-item-${index}`}
              >
                <ListItemText
                  primary={
                    <Stack spacing={0.5}>
                      <Typography variant="caption" color="text.secondary" data-testid={`notifications-item-${index}-created-at`}>
                        {formatDateTime(notification.createdAt)}
                      </Typography>
                      <Typography fontWeight={notification.read ? 400 : 700} data-testid={`notifications-item-${index}-message`}>
                        {notification.message}
                      </Typography>
                      <Button
                        size="small"
                        sx={{ alignSelf: 'flex-start', p: 0, minWidth: 'auto', textTransform: 'none' }}
                        onClick={(event) => {
                          event.stopPropagation()
                          setAnchorEl(null)
                          navigate('/orders')
                        }}
                        data-testid={`notifications-item-${index}-order-details-button`}
                      >
                        Order Details
                      </Button>
                    </Stack>
                  }
                />
              </ListItemButton>
            ))}
          </List>
        )}
      </Menu>
    </>
  )
}
