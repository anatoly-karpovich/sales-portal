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

## Error Behavior

- Unauthorized: `401`.
- Not found (single item route): possible `404` depending on service result.
- Unexpected error: `500` with `{ IsSuccess: false, ErrorMessage }`.
