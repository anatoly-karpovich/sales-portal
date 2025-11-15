# Sales Portal

Modern web workspace for sales managers: track orders, manage customers/products, collaborate through notifications, and monitor KPIs from a single dashboard.

## Architecture at a Glance

| Layer | Tech | Highlights |
| --- | --- | --- |
| Frontend | Vanilla JS + Bootstrap + Chart.js | SPA-style routing (`#/path`), modular components, WebSocket client for live notifications. |
| Backend | Node.js + Express + TypeScript | REST APIs, Socket.IO gateway, layered services, MongoDB persistence. |
| Data | MongoDB | Collections for orders, customers, products, notifications, managers. |
| DevOps | Docker & Docker Compose | One command to start the entire stack (frontend, backend, MongoDB, mongo-express). |

## Prerequisites

- Docker Desktop 4.x+ (includes Docker Engine & Compose)
- Node.js 18+ and npm (optional, only if you plan to run services outside Docker)
- Git

## Getting Started

```bash
# clone
git clone https://github.com/<your-org>/sales-portal.git
cd sales-portal

# build & start everything (frontend, backend, MongoDB, mongo-express)
docker-compose up --build

# subsequent runs (skip rebuild)
docker-compose up

# stop & remove volumes (nukes db data)
docker-compose down -v
```

## Access Points

| Service | URL | Notes |
| --- | --- | --- |
| Frontend SPA | http://localhost:8585 | Login, dashboard, orders/customers/products UI. |
| Backend API | http://localhost:8686 | Used by the SPA; expose additional integrations here. |
| Swagger Docs | http://localhost:8686/api/docs | Live API contract, handy for testing. |
| Mongo Express | http://localhost:8081 | Inspect MongoDB collections via UI. |

### Default Credentials

| Role | Username | Password |
| --- | --- | --- |
| Admin | `admin@example.com` | `admin123` |
| Mongo Express | `admin` | `admin` |

## Feature Highlights

- **Orders** – end-to-end lifecycle from Draft to Received, delivery scheduling, manager assignment, receiving flow, audit history, export.
- **Customers** – CRUD, filtering, order history, inline validation.
- **Products** – catalog management, filterable tables, modal details.
- **Dashboard** – charts (orders, products, customers) & KPI cards fed by `/api/metrics`.
- **Notifications** – toast + bell popover, Socket.IO updates when assigned orders change.
- **Theme & Navigation** – responsive header/sidebar with dark mode toggle, mobile off-canvas.

📄 Detailed UI/business requirements live in [`docs/ui-requirements/`](docs/ui-requirements/) (one file per module) plus [`orders-flow.md`](docs/ui-requirements/orders-flow.md) for the complete order lifecycle.

## Local Development Notes

- Frontend code lives in `frontend/` (plain JS modules). Use `npm install` then your favorite static server if you need hot reload.
- Backend code sits in `backend/` (TypeScript). Install dependencies with `npm install`, run `npm run dev` for ts-node or `npm run build && npm start` for production mode.
- Update `.env` files if you run services outside Docker; Compose already wires up env vars for you.

Happy shipping! 🚀
