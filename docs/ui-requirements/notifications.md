# Notification Module – UI Requirements

> **Purpose:** surface time-sensitive events to assigned managers, combining real-time popovers with transient toast messaging.

## Popover (Header & Sidebar)

| Element | Behavior |
| --- | --- |
| Trigger | Bell buttons (`#notification-bell`) in header and sidebar. Clicking toggles the card-style popover (`#notification-popover`). |
| Header | Title “Notifications” + `Read All` outline button (`#mark-all-read`). Button disabled when there are zero unread records. |
| Body | `<ul id="notification-list">` populated by `/api/notifications`. Each list item shows formatted timestamp, message (bold if unread), and “Order Details” link that routes to the order and hides the popover. |
| Item click | Runs the “mark as read” flow (`/api/notifications/{id}/read`), refreshes the list, and updates the badge count. |
| Dismissal | Clicking outside the popover closes it automatically. |
| Badge | `handleNotificationBadge` counts unread items and `setNumberOfNotificationsToBadge` shows/hides the numeric bubble. |

## Toasts
- `notification.js` injects a `.notification-wrapper` once per session.
- Toasts auto-hide after 10 seconds; close buttons remove them immediately.
- Styling: success uses default Bootstrap colors; errors use `bg-danger text-white`.
- `state.notifications` tracks active toast IDs so code can remove them programmatically if needed.

## Real-time Delivery
- Backend `NotificationService` stores `{ userId, orderId, message, read, expiresAt }`. Records expire after 24 hours.
- Audience rule: only the manager assigned to an order receives updates about that order. The service writes exactly one record per assigned manager and emits Socket.IO events to that manager’s room. Expanding the audience would require duplicating notifications for each stakeholder.
- `socket.js` connects after login (`auth.token`), listens for `new_notification`, and passes the unread count to `setNumberOfNotificationsToBadge`.
- Socket IO auth uses the same middleware as REST (`wsAuthMiddleware`) to validate JWTs.

## REST API

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/notifications` | Returns `{ Notifications }` sorted by `createdAt` DESC. |
| POST | `/api/notifications/{notificationId}/read` | Marks single notification as read and returns refreshed list. |
| POST | `/api/notifications/mark-all-read` | Marks all unread notifications for the user as read. |

Errors route through `handleApiErrors`; UI shows red toast with `response.data.ErrorMessage` on failure.
