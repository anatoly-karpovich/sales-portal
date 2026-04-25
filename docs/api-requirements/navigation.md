# Navigation Module - API Requirements

> Purpose: list API dependencies used by header/sidebar navigation, profile access, sign-out, and unread badge behavior.

## Quick Facts

| Aspect | Details |
| --- | --- |
| Dedicated navigation endpoint | None |
| Profile source | `GET /api/users/me` |
| Sign-out action | `POST /api/logout` |
| Notification badge source | `GET /api/notifications` |
| Optional profile details route | `GET /api/users/:userId` |

## Required Endpoints by Navigation Feature

| Feature | Endpoint(s) | Notes |
| --- | --- | --- |
| Show current user name/roles | `GET /api/users/me` | Used for profile menu and role-based links. |
| Open manager profile | `GET /api/users/:userId` | Returns user plus assigned orders. |
| Notification badge and popover entry | `GET /api/notifications` | Count unread from `read === false`. |
| Sign out | `POST /api/logout` | Removes active token session server-side. |

## Auth Requirements

- All endpoints above require `Authorization: Bearer <token>` except `POST /api/login`.
- Missing/invalid/expired token returns `401`.
- Auth middleware extends token expiration on each authorized request.

## Common Response Pattern

- Success generally returns:
  - `IsSuccess: true`
  - `ErrorMessage: null`
  - domain key (`User`, `Users`, `Notifications`, etc.)
- Failure returns:
  - `IsSuccess: false`
  - `ErrorMessage: <string>`

## Frontend Integration Notes

- There is no single "bootstrap navigation" API. Frontend should compose state from:
  - user identity (`/users/me`)
  - notifications (`/notifications`)
- Role-based UX decisions should use `User.roles` from `/users/me`.
