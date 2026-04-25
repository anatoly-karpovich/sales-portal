# AGENTS Guide: `backend`

## 1) Agent role
The agent in this project acts as a senior backend engineer for a TypeScript/Express API.

Primary responsibilities:
- implement and refactor API behavior inside the existing layered architecture (`router -> middleware -> controller -> service -> model`);
- keep contracts and response shape stable for frontend consumers;
- preserve current business rules for orders, users, and notifications unless the task explicitly changes them;
- update validation, DTO, and Swagger docs together when request/response contracts change;
- run at least a full build before handoff.

## 2) Tech stack and constraints
- Node.js + Express `4`
- TypeScript `4.9`
- MongoDB + Mongoose `6`
- Authentication: JWT (`jsonwebtoken`) + persisted access tokens (`Token` collection)
- Validation:
  - JSON schema validation via `express-json-validator-middleware`
  - field/business validation in custom middleware
  - `express-validator` for user registration basics
- Realtime notifications: `socket.io`
- API docs: `swagger-jsdoc` + `swagger-ui-express`
- Scheduled cleanup: `node-cron`

Project constraints:
- Compiler target/module: `es2016` + `commonjs` (see `tsconfig.json`).
- Build output is `dist/`; runtime uses compiled JS from `dist/index.js`.
- Imports are mixed (`.js` suffix in many TS files and extensionless in some); follow local file style, do not mass-normalize imports.
- When a function needs more than 3 arguments, pass a single typed object parameter instead of positional arguments.

## 3) Local commands and quality gates
Main commands:
- `npm run build` - required before handoff (compiles TS to `dist`)
- `npm run dev` - watch mode (`tsc -w`) + `nodemon dist/index.js`
- `npm start` - production start (`prestart` runs build first)

Notes:
- There are no dedicated `lint`/`test` scripts in `package.json`.
- `npm run dev` also triggers `predev` (`npm run build`) once before watchers start.

## 4) Runtime and environment
Environment variables used in code:
- `PORT` (default `5000`)
- `SECRET_KEY` (JWT sign/verify)
- `ENVIRONMENT` (`local` switches DB source)
- `MONGO_URI_LOCAL` (used when `ENVIRONMENT=local`)
- `DB_USERNAME`, `DB_PASSWORD` (used for Atlas connection when not local)

Startup flow (`index.ts`):
1. load env via `dotenv`;
2. create Express app and register middleware/routers;
3. connect to MongoDB;
4. run `seed()` (roles + default admin creation);
5. start HTTP server + initialize Socket.IO;
6. register Swagger docs endpoint;
7. start daily notification cleanup cron.

## 5) Architecture map
Source root: `backend/`

Top-level layout:
- `index.ts` - app bootstrap and router registration
- `routers/` - route definitions + Swagger annotations
- `middleware/` - auth, schema, domain, and permission checks
- `controllers/` - HTTP orchestration and response shaping
- `services/` - business logic and DB operations
- `models/` - Mongoose schemas/models
- `data/` - enums, constants, json schemas, shared types/DTOs
- `mongo/` - DB URL + seed logic
- `utils/` - shared helpers (JWT parse, date/price helpers, swagger, cron, validations)
- `ws/` - Socket.IO init

Request path convention:
- Router handles endpoint + middleware chain.
- Validation middleware enriches `req` (`req.order`, `req.customer`, `req.product`) where needed.
- Controller maps HTTP <-> service and returns API envelope.
- Service performs domain logic, updates DB, and creates notifications/history entries.

## 6) API surface and route ownership
All API routes are mounted under `/api`.

Auth:
- `POST /login`
- `POST /logout`

Products:
- `GET /products`
- `GET /products/all`
- `GET /products/:productId`
- `POST /products`
- `PUT /products/:productId`
- `DELETE /products/:productId`
- `POST /products/export`

Customers:
- `GET /customers`
- `GET /customers/all`
- `GET /customers/:customerId`
- `POST /customers`
- `PUT /customers/:customerId`
- `DELETE /customers/:customerId`
- `POST /customers/export`
- `GET /customers/:customerId/orders`

Orders:
- `GET /orders`
- `GET /orders/:orderId`
- `POST /orders`
- `PUT /orders/:orderId`
- `DELETE /orders/:orderId`
- `POST /orders/export`
- `PUT /orders/:orderId/status`
- `POST /orders/:orderId/receive`
- `POST /orders/:orderId/delivery`
- `POST /orders/:orderId/comments`
- `DELETE /orders/:orderId/comments/:commentId`
- `PUT /orders/:orderId/assign-manager/:managerId`
- `PUT /orders/:orderId/unassign-manager`

Users:
- `GET /users`
- `GET /users/me`
- `GET /users/:userId`
- `POST /users`
- `DELETE /users/:userId`
- `PATCH /users/password/:userId`

Metrics and notifications:
- `GET /metrics`
- `GET /notifications`
- `PATCH /notifications/:notificationId/read`
- `PATCH /notifications/mark-all-read`

Utility/public:
- `GET /promocodes/:id` (rebates, currently without auth middleware)

## 7) Response contract standard
Default API shape:
- success payloads usually include domain key (`Order`, `Orders`, `Product`, etc.) + `IsSuccess` + `ErrorMessage`
- errors usually return `{ IsSuccess: false, ErrorMessage: string }`

Important exceptions:
- delete endpoints return `204 No Content` on success
- export endpoints return file content with `Content-Disposition` and format-specific `Content-Type`

Rule:
- Do not change response key names or envelope style without explicit migration requirements.

## 8) Validation and schema rules
Two-layer validation model:
1. JSON schema middleware (`schemaMiddleware`) from `data/jsonSchemas/*.schema.ts`
2. domain middleware (`orderMiddleware`, `productMiddleware`, `customerMiddleware`, etc.)

When changing request contracts:
1. update JSON schema;
2. update DTO types in `data/types/dto/*`;
3. update middleware validations;
4. update Swagger block in router file.

Current important constraints:
- Order create/update and receive: requested products count must be `1..5`.
- `PUT /orders/:orderId/status` accepts only: `Draft`, `In Process`, `Canceled` (`Completed` is set automatically).
- `GET /orders` and `POST /orders/export` support filters by both `status` and `deliveryStatus`.
- Product uniqueness: case-insensitive by trimmed `name`.
- Customer uniqueness: case-insensitive by trimmed/lowercased `email`.
- Notes/comment textual limits rely on validation helpers and middleware checks.

## 9) Core business invariants
Order lifecycle:
- order status and delivery status are separated:
  - order statuses: `Draft`, `In Process`, `Completed`, `Canceled`
  - delivery statuses: `Not Scheduled`, `Scheduled`, `Partially Delivered`, `Delivered`
- initial state is `Draft` + `Not Scheduled`;
- only `Draft` orders can be updated (`PUT /orders/:orderId`);
- delivery can be created/edited only while order is `Draft`, and sets delivery status to `Scheduled`;
- transition to `In Process` requires `delivery` present and delivery status `Scheduled`;
- receiving products is allowed only for `In Process` with delivery status `Scheduled` or `Partially Delivered`;
- partial receive keeps order `In Process` and sets delivery status to `Partially Delivered`;
- full receive sets order status to `Completed` and delivery status to `Delivered`;
- cancel is allowed only when order status is `Draft`/`In Process`, delivery status is `Not Scheduled`/`Scheduled`, and no product has `received=true`;
- `Reopen` (`status -> Draft`) is allowed only from `Canceled`, clears `delivery`, and resets delivery status to `Not Scheduled`.

Order side effects:
- order changes append history entries (`history` array, newest first) with snapshots of both `status` and `deliveryStatus`;
- assign/unassign/status/delivery/comment/products updates may create notifications;
- assigned manager receives realtime and persisted notification updates.

Deletion guards:
- product cannot be deleted if referenced in any order;
- customer cannot be deleted if referenced in any order;
- admin user cannot be deleted; non-admin cannot delete other users.

## 10) Auth, tokens, and permissions
REST auth (`authmiddleware`):
- expects `Authorization` header with bearer token;
- token must exist in `Token` collection (server-side session-like check);
- expired/invalid tokens return `401`;
- active token TTL is extended by 24h on each authorized request.

Login/logout:
- login creates or reuses token and returns it in `Authorization` response header;
- logout removes current token from DB.

User permissions:
- manager assignment accepts users with roles `USER` or `ADMIN`;
- password change has extra middleware checks (`changePasswordMiddleware`).

## 11) Notifications, websockets, and cron
Notification flow:
- persisted in `Notification` collection with `expiresAt`;
- `NotificationService.create` also emits socket event `new_notification` to user room;
- socket rooms use `userId` as room name.

Socket auth:
- handshake token is read from `socket.handshake.auth.token`;
- token is parsed similarly to REST JWT validation.

Cleanup:
- `startNotificationCleanup()` runs daily at `00:00` and removes expired notifications.

## 12) Swagger and docs workflow
Swagger configuration:
- UI endpoint: `/api/docs`
- sources: compiled files `./dist/routers/*.router.js`

Implication:
- router Swagger JSDoc changes are reflected from `dist`, so rebuild before validating docs locally.

## 13) Where to add new code
Recommended flow for new endpoint/domain behavior:
1. add/update schema in `data/jsonSchemas`;
2. add/update request/response DTO in `data/types/dto`;
3. implement middleware checks (entity lookup + business rules);
4. add controller method with envelope-consistent response;
5. add service logic and side effects;
6. register route in relevant router and export via `routers/index.ts`;
7. add/update Swagger block in router file.

Avoid:
- direct DB operations inside routers;
- embedding business rules in controllers when middleware/service layer owns them;
- skipping DTO/schema updates when changing request body shape.

## 14) Pre-handoff checklist
- Build passes: `npm run build`.
- New/changed endpoints are wired in router + exported in `routers/index.ts`.
- JSON schema, DTO, middleware, and Swagger are aligned with the same contract.
- Response envelope remains consistent (`IsSuccess`, `ErrorMessage`, domain payload key).
- Business invariants (status transitions, delete guards, auth checks) are preserved.
- No unrelated refactors outside task scope.
