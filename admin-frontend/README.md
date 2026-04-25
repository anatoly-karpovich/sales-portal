# Admin Frontend

React admin SPA for Sales Portal.

## Stack

- React 19 + TypeScript 5
- Vite 7
- MUI 7
- React Query v5
- React Router v7 (`HashRouter`)
- Axios + notistack + socket.io-client

## Requirements

- Node.js `>=22.12.0`
- npm

## Local Development

```bash
npm install
npm run dev
```

Default dev URL: `http://localhost:5173`

## Environment

`VITE_API_BASE_URL` is required:

- `.env.development`: `http://localhost:5000/api`
  (for Docker stack use `http://localhost:8686/api`)
- `.env.production`: `https://aqa-course-project.app/api`

For Docker compose, pass it as build arg:

```bash
VITE_API_BASE_URL=http://localhost:8686/api docker-compose up --build admin-frontend
```

## Quality Gates

```bash
npx tsc -p tsconfig.json --noEmit --pretty false
npm run lint
npm run build
```

## Build and Serve

Production image is built via `Dockerfile`:

1. Node build stage (`npm ci`, `npm run build`).
2. Nginx stage serving `dist/` on port `8585`.

SPA fallback is configured in `nginx.conf` with `try_files ... /index.html`.

## Cutover and Rollback

See [CUTOVER.md](./CUTOVER.md) for rollout details:

- preflight checks
- rollout steps
- smoke checklist
- rollback procedure
