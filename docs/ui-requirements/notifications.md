# Notification Module - UI Requirements

> Purpose: surface time-sensitive events to assigned managers through the bell popover and toast alerts.

## Popover (Header and Sidebar)

| Element | Behavior |
| --- | --- |
| Trigger | Bell buttons (`#notification-bell`) render in both header and sidebar. Clicking toggles the card-style popover (`#notification-popover`). |
| Header | Title "Notifications" plus a `Read All` outline button (`#mark-all-read`). The button is disabled when there are no unread records. |
| Body | `<ul id="notification-list">` populated from `/api/notifications`. Each item shows a formatted timestamp, bold text when unread, and an "Order Details" link that routes to the related order and hides the popover. |
| Item click | Calls `/api/notifications/{id}/read`, refreshes the list, and updates the badge count. |
| Dismissal | Clicking outside closes the popover. |
| Badge | `handleNotificationBadge` counts unread entries and `setNumberOfNotificationsToBadge` reveals or hides the numeric bubble. |

## Toasts
- `notification.js` injects a `.notification-wrapper` once per session.
- Toasts auto-hide after 10 seconds; users can dismiss them manually via the close button.
- Success toasts use default Bootstrap styling, errors use `bg-danger text-white`.
- `state.notifications` tracks toast IDs so automation can remove lingering toasts when needed.

## Real-time Delivery
- Backend `NotificationService` stores `{ userId, orderId, message, read, expiresAt }` and expires records after 24 hours.
- Audience rule: only the manager assigned to an order receives updates. The service writes one record per assigned manager and emits a Socket.IO event to that manager's room. To notify more roles, create additional records per user and emit to their rooms.
- `socket.js` connects after login (passing `auth.token`), listens for `new_notification`, and updates the badge via `setNumberOfNotificationsToBadge`.
- Socket.IO authentication reuses `wsAuthMiddleware` to validate JWTs just like the REST API.

## REST API

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/notifications` | Returns `{ Notifications }` sorted descending by `createdAt`. |
| POST | `/api/notifications/{notificationId}/read` | Marks a single notification as read and returns the refreshed list. |
| POST | `/api/notifications/mark-all-read` | Marks every unread notification for the user as read. |

Errors go through `handleApiErrors`; show a red toast with `response.data.ErrorMessage` when these requests fail.
