# Notifications Module - API Requirements

> Purpose: define REST contracts for notifications list and read-state updates.

## Quick Facts

| Aspect | Details |
| --- | --- |
| Base path | `/api/notifications` |
| Auth | Required |
| Single-item read endpoint | `PATCH /api/notifications/:notificationId/read` |
| Bulk read endpoint | `PATCH /api/notifications/mark-all-read` |

## Endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/notifications` | Fetch notifications for authenticated user. |
| PATCH | `/api/notifications/:notificationId/read` | Mark one notification as read. |
| PATCH | `/api/notifications/mark-all-read` | Mark all notifications as read for current user. |

## Response Envelopes

### List success

```json
{
  "Notifications": [],
  "IsSuccess": true,
  "ErrorMessage": null
}
```

### Single read success

```json
{
  "Notifications": [],
  "IsSuccess": true,
  "ErrorMessage": null
}
```

### Mark-all success

```json
{
  "Notifications": [],
  "IsSuccess": true,
  "ErrorMessage": null
}
```

## Notification Object Shape

| Field | Type | Notes |
| --- | --- | --- |
| `_id` | string | Notification id |
| `managerId` | string | Owner manager id |
| `type` | string | Notification type key |
| `orderId` | string | Linked order id |
| `message` | string | User-facing message |
| `read` | boolean | Read state |
| `createdAt` | datetime string | Creation timestamp |
| `expiresAt` | datetime string | Expiration for cleanup |

## Notification Types

- `assigned`
- `unassigned`
- `statusChanged`
- `customerChanged`
- `productsChanged`
- `deliveryUpdated`
- `productsDelivered`
- `managerChanged`
- `commentAdded`
- `commentDeleted`
- `newOrder`

## Message Contract Notes

- Messages are concrete and include `orderId` context (`Order #...`).
- `statusChanged` uses scenario-specific text:
  - `In Process`: `Order #... is now in process.`
  - `Canceled` (manual): `Order #... was canceled by a manager.`
  - `Canceled` (reservation expiration): `Order #... was canceled because the product reservation expired.`
  - `Draft` (reopen): `Order #... was reopened and moved back to draft.`
  - `Completed`: `Order #... was completed.`

## Order Status Notification Triggers

- `statusChanged` notification is sent on manual status updates for assigned manager.
- Reservation expiration flow that auto-cancels a `Draft` order also sends `statusChanged` with canceled status to assigned manager (if present).
- `newOrder` notification is sent when a new order is created.

## Error Behavior

- Unauthorized: `401`.
- Not found (single item route): possible `404` depending on service result.
- Unexpected error: `500` with `{ IsSuccess: false, ErrorMessage }`.
