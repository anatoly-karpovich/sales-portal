# Sales Portal

Modern workspace for sales managers: track orders, manage customers and products, collaborate through notifications, and monitor KPIs from one dashboard.

## Architecture at a Glance

| Layer | Tech | Highlights |
| --- | --- | --- |
| Admin Frontend | React + TypeScript + Vite + MUI + React Query | SPA routing, modular feature structure, API layer, Socket.IO client for notifications. |
| Backend | Node.js + Express + TypeScript | REST APIs, Socket.IO gateway, layered services, MongoDB persistence. |
| Data | MongoDB | Collections for orders, customers, products, notifications, managers. |
| DevOps | Docker & Docker Compose | One command starts the stack (admin-frontend, backend, MongoDB, mongo-express). |

## Prerequisites

- Docker Desktop 4.x+ (includes Docker Engine & Compose)
- Node.js 22.12+ and npm (optional, only if you run services outside Docker)
- Git

## Getting Started

```bash
# clone
git clone https://github.com/<your-org>/sales-portal.git
cd sales-portal

# build and start everything (admin-frontend, backend, MongoDB, mongo-express)
docker-compose up --build

# subsequent runs (skip rebuild)
docker-compose up

# stop and remove volumes (removes local db data)
docker-compose down -v
```

`admin-frontend` image build uses `VITE_API_BASE_URL=http://localhost:8686/api` by default.  
To override it for another environment, set `VITE_API_BASE_URL` before `docker-compose up --build`.

## Access Points

| Service | URL | Notes |
| --- | --- | --- |
| Admin Frontend | http://localhost:8585 | Login, dashboard, orders/customers/products UI. |
| Backend API | http://localhost:8686 | API service for business operations and integrations. |
| Swagger Docs | http://localhost:8686/api/docs | Live API contract for testing. |
| Mongo Express | http://localhost:8081 | MongoDB collections UI. |

### Default Credentials

| Role | Username | Password |
| --- | --- | --- |
| Admin | `admin@example.com` | `admin123` |
| Mongo Express | `admin` | `admin` |

## Feature Highlights

- Orders: lifecycle from Draft to Received, delivery scheduling, manager assignment, receiving flow, audit history, export.
- Customers: CRUD, filtering, order history, inline validation.
- Products: catalog management, filterable tables, details dialogs.
- Dashboard: charts and KPI cards based on `/api/metrics`.
- Notifications: toast plus bell popover, Socket.IO updates for assigned-order changes.
- Theme and navigation: responsive header/sidebar with dark mode toggle and mobile support.

Detailed UI and business requirements are in `docs/ui-requirements/` plus `docs/ui-requirements/orders-flow.md`.

## Local Development Notes

- Admin frontend code is in `admin-frontend/` (React + TypeScript + Vite). Use `npm install` and `npm run dev` for local development.
- Backend code is in `backend/` (TypeScript + Express). Use `npm install`, then `npm run dev` or `npm run build && npm start`.
- If you run services outside Docker, update `.env` files as needed.
- Frontend cutover runbook is in `admin-frontend/CUTOVER.md`.
