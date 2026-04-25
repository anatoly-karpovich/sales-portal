# Admin Frontend Cutover Runbook

This document describes the final rollout from legacy frontend to `admin-frontend`.

## Scope

- frontend switch only
- backend API and database remain unchanged
- no schema/data migration

## Owners

- Release owner: `<name>`
- Frontend owner: `<name>`
- Backend owner: `<name>`

## Preflight (T-1 / T-0)

Run from `admin-frontend`:

```bash
npx tsc -p tsconfig.json --noEmit --pretty false
npm run lint
npm run build
```

Validate before deploy:

1. Node version is `>=22.12.0`.
2. Target `VITE_API_BASE_URL` points to the correct backend (`/api` suffix included).
3. Backend is reachable from deployment environment.
4. Login credentials for smoke test are ready.
5. Previous stable frontend release is available for rollback.

## Rollout Steps

If using repository `docker-compose.yml`:

1. Set API URL for build.

```bash
set VITE_API_BASE_URL=http://localhost:8686/api
```

2. Build new image.

```bash
docker-compose build admin-frontend
```

3. Deploy container.

```bash
docker-compose up -d admin-frontend
```

4. Verify container is up.

```bash
docker-compose ps admin-frontend
```

5. Open UI at `http://localhost:8585`.

## Smoke Checklist (must pass)

1. Login and session restore after refresh.
2. Top navigation works: Home, Orders, Products, Customers, Managers.
3. Orders list opens and order details page opens.
4. Create/Edit flow works for Products and Customers.
5. Manager details page opens and actions are visible by role.
6. Notifications bell opens and marks items as read.
7. Logout works and redirects to `/login`.
8. Unknown route returns `404` page.

## Rollback

Trigger rollback if smoke fails with blocking issues.

1. Checkout previous stable tag/commit.
2. Rebuild previous frontend image.
3. Redeploy only `admin-frontend`.
4. Re-run smoke checklist.

Example:

```bash
git checkout <previous-stable-tag>
docker-compose build admin-frontend
docker-compose up -d admin-frontend
```

## Success Criteria

Cutover is complete when:

1. Smoke checklist passes.
2. No critical frontend errors in browser console during smoke.
3. No rollback is required during agreed observation window.
