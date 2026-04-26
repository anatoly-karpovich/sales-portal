# Login Module - API Requirements

> Purpose: define the authentication contract used by the frontend login/logout flows.

## Quick Facts

| Aspect | Details |
| --- | --- |
| Base path | `/api` |
| Public endpoint | `POST /login` |
| Protected endpoint | `POST /logout` |
| Auth transport | `Authorization` header (Bearer token) |
| Success envelope | `{ IsSuccess, ErrorMessage, ...payload }` |

## Endpoints

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| POST | `/api/login` | No | Validates credentials, returns manager payload, and sets token in response headers. |
| POST | `/api/logout` | Yes | Invalidates the current token in DB (`Token` collection). |

## Request Contracts

### `POST /api/login`

```json
{
  "username": "user@example.com",
  "password": "Password123"
}
```

### `POST /api/logout`

No body required.

## Response Contracts

### `POST /api/login` success (`200`)

Headers:
- `Authorization: <jwt>`
- `X-Manager-Name: <firstName>`

Body:

```json
{
  "IsSuccess": true,
  "ErrorMessage": null,
  "Manager": {
    "_id": "...",
    "username": "...",
    "firstName": "...",
    "lastName": "...",
    "roles": ["USER"],
    "createdOn": "..."
  }
}
```

### `POST /api/logout` success (`200`)

```json
{
  "IsSuccess": true,
  "ErrorMessage": null
}
```

## Error Behavior

- Invalid credentials: `400`, `ErrorMessage: "Incorrect credentials"`.
- Login internal error: `400`, `ErrorMessage: "Login error"`, plus optional `reason`.
- Logout internal error: `400`, `ErrorMessage: "Logout error"`.

## Token Lifecycle Notes

- Backend stores active tokens in DB (`Token` collection).
- If a valid active token already exists for the manager, login reuses it and extends expiration.
- Protected requests are validated against both JWT and DB token presence.
- Token TTL is extended on every authorized request by auth middleware.
