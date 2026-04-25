# Users (Managers) Module - API Requirements

> Purpose: define user management contracts used by managers/admin flows.

## Quick Facts

| Aspect | Details |
| --- | --- |
| Base path | `/api/users` |
| Auth | Required for all endpoints |
| Roles | Stored in `roles` array (`USER`, `ADMIN`) |
| Delete response | `204 No Content` on success |
| Password endpoint | `PATCH /api/users/password/:userId` |

## Endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/users` | Get all users. |
| GET | `/api/users/me` | Get current authenticated user profile. |
| GET | `/api/users/:userId` | Get user plus assigned orders. |
| POST | `/api/users` | Create/register user. |
| DELETE | `/api/users/:userId` | Delete user with permission checks. |
| PATCH | `/api/users/password/:userId` | Change user password with permission checks. |

## Data Contracts

### User object

| Field | Type |
| --- | --- |
| `_id` | string |
| `username` | string |
| `firstName` | string |
| `lastName` | string |
| `roles` | string[] |
| `createdOn` | datetime string |

### Create user payload (`POST /api/users`)

```json
{
  "username": "manager@example.com",
  "password": "Password123",
  "firstName": "John",
  "lastName": "Doe"
}
```

Validation:
- `username` required
- `password` min length `8`
- JSON schema validation via `userSchema`

### Change password payload (`PATCH /api/users/password/:userId`)

```json
{
  "oldPassword": "OldPassword123",
  "newPassword": "NewPassword123"
}
```

Validation and guards:
- target user must exist
- allowed for self or admin
- not allowed for admin accounts
- `oldPassword` must match
- `newPassword.length >= 8`

## Permission Rules

### Delete user (`DELETE /api/users/:userId`)

- Target user must exist.
- Deleting admin is forbidden.
- Non-admin user can delete only themselves.
- Admin can delete non-admin users.
- On successful delete, backend also removes all tokens for that user.

### Change password (`PATCH /api/users/password/:userId`)

- Self or admin can initiate request.
- Password change for admin accounts is blocked by middleware.

## Response Envelopes

- Success examples:
  - `{ Users, IsSuccess: true, ErrorMessage: null }`
  - `{ User, IsSuccess: true, ErrorMessage: null }`
  - `{ User, Orders, IsSuccess: true, ErrorMessage: null }` for `GET /users/:userId`
- Failure:
  - `{ IsSuccess: false, ErrorMessage, reason? }`

## Managers Integration Note

Order assignment APIs (`PUT /api/orders/:orderId/assign-manager/:managerId`) use this module's users.
The chosen `managerId` must belong to a user whose roles include `USER` or `ADMIN`.
