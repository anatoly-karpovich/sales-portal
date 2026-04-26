# Users (Managers) Module - API Requirements

> Purpose: define manager-management contracts used by admin and profile flows.

## Quick Facts

| Aspect | Details |
| --- | --- |
| Base path | `/api/managers` |
| Auth | Required for all endpoints |
| Roles | Stored in `roles` array (`USER`, `ADMIN`) |
| Delete response | `204 No Content` on success |
| Password endpoint | `PATCH /api/managers/password/:managerId` |

## Endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/managers` | Get all managers. |
| GET | `/api/managers/me` | Get current authenticated manager profile. |
| GET | `/api/managers/:managerId` | Get manager plus assigned orders. |
| POST | `/api/managers` | Create/register manager. |
| DELETE | `/api/managers/:managerId` | Delete manager with permission checks. |
| PATCH | `/api/managers/password/:managerId` | Change manager password with permission checks. |

## Data Contracts

### Manager object

| Field | Type |
| --- | --- |
| `_id` | string |
| `username` | string |
| `firstName` | string |
| `lastName` | string |
| `roles` | string[] |
| `createdOn` | datetime string |

### Create manager payload (`POST /api/managers`)

```json
{
  "username": "manager@example.com",
  "password": "Password123",
  "firstName": "John",
  "lastName": "Doe"
}
```

Validation:
- `username` required.
- `password` min length `8` (`express-validator`).
- JSON schema validation via `managerSchema` requires `username`, `password`, `firstName`, `lastName`.

### Change password payload (`PATCH /api/managers/password/:managerId`)

```json
{
  "oldPassword": "OldPassword123",
  "newPassword": "NewPassword123"
}
```

Validation and guards:
- target manager must exist;
- allowed for self or admin;
- changing password for admin accounts is blocked;
- `oldPassword` must match;
- `newPassword.length >= 8`.

## Permission Rules

### Delete manager (`DELETE /api/managers/:managerId`)

- Target manager must exist.
- Deleting admin is forbidden.
- Non-admin can delete only themselves.
- Admin can delete non-admin managers.
- On successful delete, backend also removes all tokens for that manager.

### Change password (`PATCH /api/managers/password/:managerId`)

- Self or admin can initiate request.
- Password change for admin accounts is blocked by middleware.

## Response Envelopes

- Success examples:
  - `{ Managers, IsSuccess: true, ErrorMessage: null }`
  - `{ Manager, IsSuccess: true, ErrorMessage: null }`
  - `{ Manager, Orders, IsSuccess: true, ErrorMessage: null }` for `GET /api/managers/:managerId`
- Failure:
  - `{ IsSuccess: false, ErrorMessage, reason? }`

## Manager Assignment Integration Note

Order assignment API (`PUT /api/orders/:orderId/assign-manager/:managerId`) depends on this module.
The chosen `managerId` must belong to an account whose roles include `USER` or `ADMIN`.
