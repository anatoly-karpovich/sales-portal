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
- `SWAGGER_SERVER_URL` (optional explicit base URL in Swagger `servers`)

Startup flow (`index.ts`):

1. load env via `dotenv`;
2. create Express app and register middleware/routers;
3. connect to MongoDB;
4. run `seed()` (roles + default admin + default `settings` singleton creation);
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
- `PATCH /products/:productId`
- `PATCH /products/:productId/status`
- `PUT /products/:productId/variants`
- `POST /products/:productId/variants`
- `POST /products/:productId/variants/validate`
- `PATCH /products/:productId/variants/:variantId`
- `PATCH /products/:productId/variants/:variantId/status`
- `DELETE /products/:productId/variants/:variantId`
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
- `PATCH /orders/:orderId`
- `POST /orders/:orderId/products`
- `PATCH /orders/:orderId/products`
- `DELETE /orders/:orderId/products`
- `PATCH /orders/:orderId/customer/:customerId`
- `DELETE /orders/:orderId`
- `POST /orders/export`
- `POST /orders/pricing`
- `PUT /orders/:orderId/status`
- `POST /orders/:orderId/receive`
- `PATCH /orders/:orderId/delivery`
- `PATCH /orders/:orderId/pickup`
- `POST /orders/:orderId/comments`
- `DELETE /orders/:orderId/comments/:commentId`
- `PUT /orders/:orderId/assign-manager/:managerId`
- `PUT /orders/:orderId/unassign-manager`

Users:

- `GET /managers`
- `GET /managers/me`
- `GET /managers/:managerId`
- `POST /managers`
- `DELETE /managers/:managerId`
- `PATCH /managers/password/:managerId`

Metrics and notifications:

- `GET /metrics`
- `GET /notifications`
- `PATCH /notifications/:notificationId/read`
- `PATCH /notifications/mark-all-read`

Settings:

- `GET /settings`
- `POST /settings`
- `PATCH /settings`

Categories:

- `GET /categories/tree`
- `GET /categories/flat`
- `GET /categories/nodes/:categoryId`
- `POST /categories/nodes`
- `PATCH /categories/nodes/:categoryId`
- `POST /categories/nodes/:categoryId/move`
- `GET /categories/nodes/:categoryId/products`
- `DELETE /categories/nodes/:categoryId`

Inventory:

- `GET /inventory`
- `GET /inventory/products/:productId`
- `POST /inventory/adjustments`
- `PATCH /inventory/products/:productId/variants/:variantId/settings`
- `GET /inventory/products/:productId/adjustments`
- `GET /inventory/products/:productId/variants/:variantId/adjustments`

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

- Order create/update: `products` is a non-empty array of `{ productId: string, variantId: string, quantity: integer }` objects.
  - Duplicate `(productId, variantId)` pairs are rejected (`400`).
  - Each `quantity` must be in `1..settings.order.maxProductQuantityInOrder`. Settings are read on every create/update via `SettingsService.get()`.
  - `maxProductsInOrder` from Settings is currently NOT enforced on the backend (UI cap only).
  - Backend rejects missing customer (`404`), unknown product (`404`), unknown variant in product (`404`), and non-active product/variant (`400`).
  - `POST /orders` creates a default delivery snapshot (`condition=Delivery`, `express=false`, customer address) with `delivery.status=Draft`.
  - On customer change in `PATCH /orders/:orderId`, delivery is reset to the new customer address and `delivery.status=Draft`.
  - `total_price` always includes delivery price.
- Order product/customer patch endpoints (`POST/PATCH/DELETE /orders/:orderId/products`, `PATCH /orders/:orderId/customer/:customerId`):
  - allowed only for `Draft` orders;
  - add (`POST .../products`) returns `409` when `(productId, variantId)` already exists in order;
  - replace (`PATCH .../products`) returns `409` when target `(to.productId, to.variantId)` already exists in another order line;
  - delete (`DELETE .../products`) removes the full line by `(productId, variantId)` and rejects deleting the last line (`400`).
- `PUT /orders/:orderId/unassign-manager` is allowed only for `Draft` orders.
- Order receive: `products` is an array of unique `{ productId, variantId }` objects to mark as received.
  - Each pair must reference an existing position in the order with `received = false` (otherwise `400`).
  - Partial receive of a single position by `quantity` is NOT supported - the entire position flips to `received = true`.
  - `products.length` allowed range is `1..order.products.length`.
- `PUT /orders/:orderId/status` accepts only: `Draft`, `In Process`, `Canceled` (`Completed` is set automatically by the receive flow).
  - `Draft -> In Process` auto-assigns performer as `assignedManager` when order has no assignee.
  - auto-assign history order is strict: `Manager Assigned` first, then `Order processing started`.
  - `Canceled -> Draft` (reopen) rebuilds product snapshots from current product/variant data, validates product+variant existence and `Active` state, and recreates draft reservation using configured draft TTL.
  - if reopen validation or reservation fails, transaction is rolled back and order remains `Canceled`.
- Delivery endpoints:
  - `PATCH /orders/:orderId/delivery` accepts `express` + `address`.
  - `PATCH /orders/:orderId/pickup` accepts `pickupLocationId`.
- Delivery snapshots in orders/history use `delivery` object with required `status` and `schedule` union:
  - status values: `Draft`, `Delivery Planned`, `Pickup Planned`, `Delivery Scheduled`, `Pickup Scheduled`, `Partially Delivered`, `Delivered`
  - `Delivery`: `{ express, estimatedDays, estimatedDate, startsAt, dueDate }`
  - `Pickup`: `{ readyInDays, holdForDays, availableFromDate, pickupByDate, startsAt }`
- `GET /orders` and `POST /orders/export` support filters by both `status` and `deliveryStatus` query/body keys;
  `deliveryStatus` filters are applied to `delivery.status`.
- Product uniqueness: case-insensitive by trimmed `name`.
- Product manufacturer must exist in `settings.catalog.manufacturers` (case-insensitive).
- `GET /products` filters support `manufacturer[]`, `status[]`, `categoryId`, `rootCategoryId`, `minPrice`, `maxPrice` (inclusive; applied to `variants.price`).
- `GET /products` sorting supports `name`, `price`, `manufacturer`, `category`, `status`, `createdOn`, `variantsCount`; tie-break is `createdOn` descending.
- `GET /products` list item response includes `createdOn`.
- Product variants rules:
  - product must contain at least one variant;
  - variant attributes must include all product attribute keys;
  - variant attribute values must belong to corresponding product attribute values;
  - variant attribute combination must be unique inside product;
  - variant price is decimal (`> 0`) with up to 2 digits after dot.
  - `POST /products/:productId/variants`, `PUT /products/:productId/variants`, and `POST /products/:productId/variants/validate` accept `1..200` variants per request.
  - `PUT /products/:productId/variants` is atomic full replace; removing a variant referenced in orders is rejected with `409`.
  - `PATCH /products/:productId/status` allows only transitions: `Draft -> Active`, `Active -> Archived`, `Archived -> Active`.
  - `PATCH /products/:productId/status` with target `Archived` auto-archives all variants.
  - duplicate-like product conflicts (duplicate name, duplicate attribute keys/values, duplicate variant combinations, duplicate variant ids in replace payload) are treated as `409`.
- Customer uniqueness: case-insensitive by trimmed/lowercased `email`.
- `POST /settings` and `PATCH /settings` validate `catalog.manufacturers` (non-empty array, no case-insensitive duplicates).
- `POST /settings` and `PATCH /settings` require `shipping.delivery.pricing` and `shipping.pickup.{policy,locations}`.
- `shipping.pickup.locations` keys must be valid US states; pickup location `id` values must be unique across all states.
- Notes/comment textual limits rely on validation helpers and middleware checks.
- Inventory source-of-truth split:
  - canonical stock: `Inventory.variants[].quantity`
  - canonical reserve: reservation documents/items (`Reservation` aggregate by `orderId`)
  - `Inventory.variants[].reserved`, `available`, `stockStatus`, and parent summary fields are derived read-model values.
- Inventory service logic must resolve conflicts in favor of canonical sources above.
- Reservation document/item mutations (`upsert/update/delete`) are the source-of-truth events for reserve impact.

## 8.1) Order products structure

DB shape (`Order.products[i]`):

```
{
  productId: ObjectId,
  variantId: ObjectId,
  manufacturer: String,
  name: String,
  attributes: Map<String, String>,
  unitPrice: Number,
  quantity: Number (>= 1),
  received: Boolean,
  imageUrl?: String
}
```

API response shape for order list (`GET /orders`, `getSorted`):

```
{
  product: { _id: string, name: string },
  variant: { _id: string },
  unitPrice: number,
  quantity: number,
  received: boolean
}
```

API response shape for order details (`GET /orders/:orderId`):

```
{
  productId: string,
  variantId: string,
  manufacturer: string,
  unitPrice: number,
  quantity: number,
  name: string,
  attributes: Record<string, string>,
  received: boolean,
  imageUrl?: string
}
```

- product details are stored as snapshot directly in order lines and returned from `GET /orders/:orderId` without live joins to `Product`.
- `unitPrice` is a snapshot of variant price taken at the moment a position is added to the order. On `PATCH /orders/:orderId`:
  - positions that already existed in the order keep their previous `unitPrice` and `received`,
  - newly added positions get a fresh `unitPrice` from the current variant price,
  - `quantity` is always taken from the request payload.
- on `Canceled -> Draft` reopen, all order lines are refreshed from current product/variant snapshot (`unitPrice`, display fields, attributes, image) and `received` is reset to `false`.
- `total_price = products subtotal + delivery price` (delivery is always present in order snapshot).

History snapshot (`Order.history[].products[i]`) keeps:

```
{
  productId: ObjectId,
  variantId: ObjectId,
  manufacturer: String,
  name: String,
  attributes: Map<String, String>,
  unitPrice: number,
  quantity: number,
  received: boolean,
  imageUrl?: string
}
```

Settings-driven limits (read each request via `SettingsService.get()`):
- `settings.order.maxProductQuantityInOrder` - per-position quantity cap, enforced by middleware.
- `settings.order.maxProductsInOrder` - informational; not enforced by backend.

Indexes used for product-deletion guards:
- product deletion check path: `products.productId`
- variant deletion check path: `products.$elemMatch({ productId, variantId })`

## 9) Core business invariants

Order lifecycle:

- order status and delivery status are separated:
  - order statuses: `Draft`, `In Process`, `Completed`, `Canceled`
  - delivery statuses: `Draft`, `Delivery Planned`, `Pickup Planned`, `Delivery Scheduled`, `Pickup Scheduled`, `Partially Delivered`, `Delivered`
- initial state on create is `Draft` + `delivery.status=Draft` with default `Delivery` snapshot based on customer address (`express=false`);
- only `Draft` orders can be updated (`PATCH /orders/:orderId`);
- order line/customer mutation endpoints (`POST/PATCH/DELETE /orders/:orderId/products`, `PATCH /orders/:orderId/customer/:customerId`) are also Draft-only;
- delivery can be created/edited only while order is `Draft`, and sets delivery status to:
  - `Delivery Planned` for delivery endpoint
  - `Pickup Planned` for pickup endpoint
- transition to `In Process` requires delivery status `Delivery Planned` or `Pickup Planned`;
- if `assignedManager` is missing during `Draft -> In Process`, performer is auto-assigned before processing history entry is added;
- receiving products is allowed only for `In Process` with delivery status `Delivery Scheduled`, `Pickup Scheduled`, or `Partially Delivered`;
- partial receive keeps order `In Process` and sets delivery status to `Partially Delivered`;
- full receive sets order status to `Completed` and delivery status to `Delivered`;
- cancel is allowed only when order status is `Draft`/`In Process`, delivery status is one of `Draft`, `Delivery Planned`, `Pickup Planned`, `Delivery Scheduled`, `Pickup Scheduled`, and no product has `received=true`;
- `Reopen` (`status -> Draft`) is allowed only from `Canceled`, rebuilds default delivery snapshot from current customer address, refreshes product snapshots, recreates draft reservation, and sets delivery status to `Draft`.
- `PUT /orders/:orderId/unassign-manager` is allowed only for `Draft`.

Order side effects:

- order changes append history entries (`history` array, newest first) with snapshots of `status` and full `delivery` (including `delivery.status`);
- assign/unassign/status/delivery/comment/products updates may create notifications;
- assigned manager receives realtime and persisted notification updates.

Deletion guards:

- product cannot be deleted if referenced in any order (check is `Order.exists({ "products.productId": productId })`);
- product variant cannot be deleted if referenced in any order line with same product id and variant id;
- product variant cannot be deleted if it is the last variant in the product;
- customer cannot be deleted if referenced in any order;
- admin user cannot be deleted; non-admin cannot delete other users.

Settings invariants:

- `Settings` collection is treated as singleton (exactly one document expected).
- `POST /settings` is intended for initial creation and returns conflict when settings already exist.
- `PATCH /settings` is the normal update path for existing deployments.
- `settings.catalog.manufacturers` is required on create and validated on update (non-empty array, no case-insensitive duplicates).
- `settings.shipping.delivery.pricing` is required and contains pricing zones: `localCity`, `sameState`, `outOfState`.
- `settings.shipping.pickup.policy` is required (`readyInDays`, `holdForDays`, optional `remindBeforeDays`).
- `settings.shipping.pickup.locations` is required and must be a US-state keyed pickup map.

Inventory/reservation invariants:

- `available` is derived as `quantity - reservedActive`.
- Manual stock adjustments must enforce `quantity >= reservedActive` when `allowSellingOutOfStock=false`.
- `Reserve`, `Release`, `Expired Reservation`, and `Sale` adjustments are event records; they do not change the source-of-truth split.
- Inventory list/details responses may expose derived summary fields, but business rules must not treat them as canonical state.

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
- reservation-expiration auto-cancel of a `Draft` order sends `statusChanged` notification (Canceled) to assigned manager, if assignee exists.

Socket auth:

- handshake token is read from `socket.handshake.auth.token`;
- token is parsed similarly to REST JWT validation.

Cleanup:

- `startNotificationCleanup()` runs daily at `00:00` and removes expired notifications.

## 12) Swagger and docs workflow

Swagger configuration:

- UI endpoint: `/api/docs`
- sources: compiled files `./dist/routers/*.router.js`
- `servers[0].url` is resolved at runtime:
  - `SWAGGER_SERVER_URL` when provided;
  - otherwise `http://localhost:${PORT}` when `ENVIRONMENT=local`;
  - otherwise production fallback URL.

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

When changing persisted defaults that already exist in production data:

1. update defaults source (`data/defaultSettings.ts`);
2. align update strategy with current deployment setup and operational constraints.

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
- For existing environments, data update strategy is documented when required.
- No unrelated refactors outside task scope.
