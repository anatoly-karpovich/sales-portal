# AGENTS Guide: `admin-frontend`

## 1) Agent role
The agent in this project acts as a senior frontend engineer for an admin SPA.

Primary responsibilities:
- implement and refactor UI and business logic within the existing architecture;
- keep stack, naming, and code patterns consistent;
- do not break existing `data-testid` values;
- add new `data-testid` values with clear business meaning for UI automation;
- run required checks before finishing work (`tsc`, `lint`, and `build` when needed).

## 2) Tech stack and constraints
- React `19`
- TypeScript `5.9`
- Vite `7`
- MUI `7` (`@mui/material`, `@mui/icons-material`)
- React Query `@tanstack/react-query` v5
- React Router `react-router-dom` v7 (`HashRouter`)
- HTTP client: `axios`
- Toasts: `notistack`
- Realtime notifications: `socket.io-client`
- Charts: `chart.js`, `react-chartjs-2`
- Number formatting: `numeral`

Project constraints:
- Node.js: `>=22.12.0` (see `package.json` and `.nvmrc`)
- TS config in `tsconfig.app.json` uses `strict: false`, but has `noUnusedLocals` and `noUnusedParameters`.
- Path alias: `@/* -> src/*` (see `vite.config.ts`, `tsconfig.app.json`).

## 3) Local commands and quality gates
Main commands:
- `npm run dev` - local development
- `npm run lint` - ESLint (required before handoff)
- `npx tsc -p tsconfig.json --noEmit --pretty false` - typecheck (required before handoff)
- `npm run build` - production build (recommended for large changes)
- `npm run format` - Prettier

Formatting rules from `.prettierrc.json`:
- no semicolons
- single quotes
- trailing commas: `all`
- print width: `100`

Note:
- `.husky/pre-commit` currently runs `npm test`, but there is no `test` script in `package.json`.
- Do not modify hooks unless the task explicitly requires it.

## 4) Architecture map
Source root: `src`

Top-level source layout:
- `src/main.tsx` - app bootstrap
- `src/app` - app shell, providers, router
- `src/api` - HTTP client, API modules, API event bus
- `src/features` - domain modules
- `src/components` - shared/common UI blocks
- `src/theme` - theme mode context and MUI theme factory
- `src/constants` - static dictionaries
- `src/utils` - helper utilities

### 4.1 `app` layer
- `app/App.tsx` - root component, wraps router in providers.
- `app/providers/AppProviders.tsx` - provider order:
1. `ThemeModeProvider`
2. `QueryClientProvider`
3. `SnackbarProvider`
4. `ApiEventsProvider`
5. `AuthProvider`
6. `NotificationsProvider`
- `app/router/AppRouter.tsx` - route tree via `HashRouter`.
- `app/router/ProtectedRoute.tsx` and `PublicOnlyRoute.tsx` - auth guards.
- `app/router/AuthRouteFallback.tsx` - loading fallback during auth bootstrap.
- `app/layout/AppShell.tsx` - top nav, user actions, mobile menu, main outlet.
  - top-bar user first name is a link to current manager details (`/managers/:userId`) when user id is available.
- `app/config/navigation.ts` - single navigation source.

### 4.2 `api` layer
- `api/client.ts`
  - `apiClient` uses `VITE_API_BASE_URL`.
  - request interceptor injects bearer token from localStorage key `admin-frontend-access-token`.
  - response interceptor:
    - emits unauthorized event on `401`;
    - emits API error event unless request has `skipErrorToast: true`.
- `api/events.ts` - internal event bus for `error` and `unauthorized`.
- `api/types.ts` - `ApiRequestConfig` extension with `skipErrorToast`.
- `api/modules/*.api.ts` - backend contracts and domain requests (`products`, `metrics`, `notifications`, `orders`, `customers`, `managers`, `settings`).
- `api/modules/orders.api.ts`
  - typed orders list contract (`GET /orders`);
  - order model uses split state axes:
    - `status`: `Draft | In Process | Completed | Canceled`;
    - `deliveryStatus`: `Not Scheduled | Scheduled | Partially Delivered | Delivered`;
  - create order (`POST /orders`);
  - update order customer/products (`PATCH /orders/:orderId`);
  - order details (`GET /orders/:orderId`);
  - status update/reopen (`PUT /orders/:orderId/status`);
  - assign/unassign manager (`PUT /orders/:orderId/assign-manager/:managerId`, `PUT /orders/:orderId/unassign-manager`);
  - schedule/edit delivery (`POST /orders/:orderId/delivery`);
  - receive requested products (`POST /orders/:orderId/receive`);
  - comments create/delete (`POST /orders/:orderId/comments`, `DELETE /orders/:orderId/comments/:commentId`);
  - export (`POST /orders/export` with blob response).
- `api/modules/users.api.ts`
  - users contract includes list, details with orders, create, delete, and password change.
  - implemented requests:
    - `getUsers()` (`GET /users`)
    - `getUserById()` (`GET /users/:userId`) returning `{ User, Orders }`
    - `createUser()` (`POST /users`)
    - `deleteUser()` (`DELETE /users/:userId`)
    - `changeUserPassword()` (`PATCH /users/password/:userId`)
  - `UserOrder` shape is shared with manager details "Assigned Orders" table rendering.
- `api/modules/products.api.ts`
  - includes paginated `getProducts()` (`GET /products`) used by searchable product pickers in Orders create/edit flows.
  - `getAllProducts()` (`GET /products/all`) exists in API module, but current Orders create flow does not use preload from `/all`.

### 4.3 `features` layer
- `features/auth`
  - `AuthContext.tsx` - auth state machine: `initializing | authenticated | unauthenticated`
  - `auth.service.ts` - login/me/logout/bootstrap/localStorage
  - `useAuth.ts` - typed context access
  - `pages/LoginPage.tsx`
- `features/notifications`
  - `NotificationsProvider.tsx` - query + mutations + websocket integration
  - `components/NotificationsBell.tsx`
- `features/home`
  - `hooks/useMetricsQuery.ts`
  - `mappers/homeMetrics.mapper.ts` - normalize unknown backend payload into stable view model
  - `pages/HomePage.tsx`
  - `widgets/*` - hero, actions, metrics, charts, tables, skeleton
- `features/settings`
  - `hooks/useSettingsQuery.ts`, `hooks/settingsQueryKeys.ts` - global settings query/mutation layer used by customers and orders flows.
  - delivery settings contract is `delivery.pickupLocations` (US state keyed object of pickup locations).
- `features/products` (most complete module)
  - `pages/ProductsPage.tsx` - list, filters, export, pagination, dialogs
    - shared chips are prefixed (`Search:`, `Manufacturer:`).
  - `pages/ProductUpsertPage.tsx`, `ProductCreatePage.tsx`, `ProductEditPage.tsx`
  - `hooks/useProductsPageState.ts` - UI orchestration + query params
  - `hooks/useProductsQuery.ts` - query/mutation layer
  - `config/productsTableColumns.ts` - table schema, sort fields, export fields
  - `components/ProductForm.tsx`, `ProductDetailsDialog.tsx`, `ProductsTableActionsCell.tsx`
  - `forms/*` - form mappers, touched state, validation
  - `products.ui-text.ts` - labels, validation text, toast text
- `features/customers` (implemented in iteration 5)
  - `pages/CustomersPage.tsx` - list, filters, export, pagination, delete flow
    - list table columns: `Email`, `Name`, `State`, `City`, `Created On`, `Actions`.
    - state filters use all US states (modal values are state codes: `AL..WY`).
    - shared chips are prefixed (`Search:`, `State:`).
  - `pages/CustomerUpsertPage.tsx`, `CustomerCreatePage.tsx`, `CustomerEditPage.tsx`
  - `pages/CustomerDetailsPage.tsx` - customer summary and orders table
  - `hooks/useCustomersPageState.ts` - UI orchestration + query params
  - `hooks/useCustomersQuery.ts` - query/mutation layer
  - `config/customersTableColumns.ts` - table schema, sort fields, export fields
  - `components/CustomerForm.tsx`, `CustomersTableActionsCell.tsx`
    - customer upsert uses `State` autocomplete (`CODE — State Name`), `City` text input, masked `Zip Code` input, optional `Apartment`.
  - `forms/*` - form mappers, touched state, validation
  - `customers.ui-text.ts` - labels, validation text, toast text
- `features/orders` (iteration 6 in active implementation)
  - `pages/OrdersPage.tsx` - list with search/filter/sort/pagination/export.
    - list filters are split into two independent groups:
      - `status[]` (order status)
      - `deliveryStatus[]` (delivery status)
    - filters are represented by prefixed chips:
      - `Search: <value>`
      - `Order: <status>`
      - `Delivery: <deliveryStatus>`
  - `hooks/useOrdersPageState.ts` - list orchestration + create/reopen/export flows.
    - query and export (`filtered`) include both filter arrays: `status[]` and `deliveryStatus[]`.
    - create dialog opening does lightweight existence checks for customers/products via paginated endpoints (`limit: 1`) and does not preload full `/all` datasets.
    - customer precheck requests pass customers-state filter defaults (`state: []`) to satisfy customers API contract.
  - `hooks/useOrdersQuery.ts`, `hooks/ordersQueryKeys.ts` - query/mutation layer for list/details/status/delivery/customer/product options/comments/manager assignment
  - `config/ordersTableColumns.ts` - columns, sort fields, export fields.
    - list table shows `Status` and `Delivery` as separate columns; `Delivery` displays `deliveryStatus`.
    - export fields include both `delivery` and `deliveryStatus`.
  - `config/orderDetails.config.ts` - order details local config (search debounce, product search limit, products rows limit, delivery date offsets)
  - `components/OrdersFiltersDialog.tsx` - orders-only filters modal with two accordions:
    - sections: `Order Status`, `Delivery Status`;
    - only one accordion can be expanded at a time;
    - default expanded section on open: `Order Status`;
    - section header shows `<N> selected` only when section has at least one selected value.
  - `components/OrdersFilterChips.tsx` - orders-only chip row for search/status/deliveryStatus filters with per-chip removal
  - `components/CreateOrderDialog.tsx` - create modal with search-driven pickers:
    - customer selection uses MUI `Autocomplete` with popper overlay (outside dialog flow), opens on field click, and closes after selection;
    - selected customer value is shown in the same input field (`name | email`), without separate pencil action;
    - product rows support `1..5`, duplicates are allowed, and only one active product `Autocomplete` chooser is rendered at a time;
    - product row click opens editing chooser; delete action is independent and does not trigger edit open;
    - product row outline/hovers are aligned with outlined-input style for consistent visual affordance;
    - unavailable products are detected via availability checks and block create action;
    - total price is recalculated from selected product summaries.
  - `components/OrdersTableActionsCell.tsx` - icon actions (`Details`, conditional `Reopen`)
  - `components/EditOrderCustomerDialog.tsx` - draft-only customer reassignment dialog with searchable list
  - `components/EditOrderProductsDialog.tsx` - draft-only products edit dialog with single searchable chooser, 1..5 rows, duplicates support, unavailable-product guard
  - `components/AssignManagerDialog.tsx` - assign/edit manager dialog with searchable manager list and save-state guards
  - `components/OrderDetailsSummarySection.tsx` - order details header section (back link, order id, assigned manager controls near order number, status actions, metrics cards)
    - when manager is assigned and id is present, assigned manager value is a link to `/managers/:managerId`.
  - `components/OrderDetailsCustomerSection.tsx` - customer read-only block + draft-only edit trigger
  - `components/OrderDetailsProductsSection.tsx` - products block + draft edit + receive-mode controls
  - `components/OrderDetailsTabsSection.tsx` - tabs switcher and tab-level composition (`Delivery`, `Order History`, `Comments`)
  - `components/OrderDetailsDeliveryTab.tsx` - delivery tab content:
    - view mode with delivery summary and source chip;
    - status-based actions:
      - `Draft + Not Scheduled` -> `Schedule`;
      - `Draft + Scheduled` -> edit pencil;
      - any other state combination -> no delivery edit actions;
    - schedule/edit form for `Delivery`/`Pickup` with `Home`/`Other` location rules;
    - `settings`-driven pickup options:
      - pickup state options from `settings.delivery.pickupLocations` keys;
      - pickup city options depend on selected state and use only locations with `isActive: true`;
    - delivery address uses `state/city/street/house/apartment?/zipCode`;
    - pickup `street/house/apartment/zipCode` remain read-only and are auto-filled by selected pickup location;
    - date picker-only input with allowed range from config (`+3`..`+10` days);
    - save/cancel controls and delivery payload normalization.
  - `components/OrderHistoryTimeline.tsx` - order history tab timeline:
    - timeline + accordion cards grouped by history events;
    - per-action diff blocks (status, delivery fields, customer, requested products, receive, manager assignment);
    - fallback diff mode for unknown actions;
    - state snapshot and product chips per event;
    - lazy customer name resolution for historical customer ids;
    - manager names are resolved from history payload (`performer`, `assignedManager`) without extra manager lookup requests.
  - `orders.ui-text.ts` - labels, dialog text, toasts, errors
  - `pages/OrderDetailsPage.tsx` - implemented details page:
    - page-level orchestration container that wires split sections (`Summary`, `Customer`, `Products`, `Tabs`) and dialogs;
    - summary/actions (`Cancel`, `Process`, `Reopen`, `Refresh`) + manager assign/edit/unassign controls in header;
    - action visibility/availability is based on both `status` and `deliveryStatus`:
      - `Process` is shown only for `Draft`; enabled only when `deliveryStatus = Scheduled`;
      - `Cancel` is shown only for `Draft | In Process` with `deliveryStatus in [Not Scheduled, Scheduled]`;
      - `Reopen` is shown only for `Canceled`;
    - read-only customer/products blocks;
    - manager assignment flow:
      - if manager is absent: `Click to select manager` trigger opens assignment dialog;
      - if manager exists: show manager value + edit trigger + unassign trigger;
      - assign dialog loads users from `/users`, filters by `firstName`/`lastName`/`username`, and allows only backend-compatible manager roles (`USER`, `ADMIN`);
      - list is sorted A-Z by full name (fallback to username);
      - save is disabled for empty selection or unchanged manager;
      - unassign uses shared `ConfirmDialog`;
      - assign/unassign success closes modal, shows toast, and refreshes details with skeleton reload;
    - receive mode for products:
      - available only when `status = In Process` and `deliveryStatus in [Scheduled, Partially Delivered]`;
      - `Receive` CTA only when there are pending (not received) products;
      - per-product checkboxes in receive mode with `Select All`;
      - already received rows are prechecked and disabled;
      - `Select All` uses tri-state behavior (`checked`, `indeterminate`, `unchecked`) for partial selection;
      - `Save` posts selected IDs to `/orders/:orderId/receive`, then refreshes details and exits receive mode;
      - `Cancel` exits receive mode without API call;
    - draft-only customer/products edit flows;
    - delivery tab integrated with create/edit flow (`POST /orders/:orderId/delivery`) and success/error toasts;
    - order history tab integrated with timeline renderer and history diff visualization;
    - comments tab integrated with API create/delete;
    - known limitation: comment author uses fallback label (`AQA Manager`) until backend exposes stable `createdBy`.
- `features/users`
  - `pages/ManagersPage.tsx` - managers list page implemented (search/sort/pagination + details navigation).
    - list uses client-side filtering, sorting, and pagination over `/users` result because backend pagination for users is not implemented yet.
    - `+ Add Manager` button is visible only for `ADMIN`.
  - `pages/ManagerCreatePage.tsx` - admin-only manager creation page (`/managers/add`) with redirect+toast guard for non-admin users.
  - `pages/ManagerDetailsPage.tsx` - manager details page (`/managers/:managerId`) with:
    - manager summary fields (`username`, `firstName`, `lastName`, `roles`, `createdOn`);
    - assigned orders table aligned with Customer Details table columns;
    - `404` or invalid id redirect to `/managers` with warning toast;
    - self-delete handling: successful delete of current user triggers logout and redirect to `/login`.
  - `hooks/useUsersQuery.ts`, `hooks/usersQueryKeys.ts` - users query/mutation layer and keys.
  - `hooks/useManagersPageState.ts` - managers list UI orchestration (client-side search/sort/pagination state).
  - `config/managersTableColumns.ts` - managers list table schema and sortable fields.
  - `components/ManagersTableActionsCell.tsx` - managers list actions cell (`Details`).
  - `components/ManagerCreateForm.tsx` - create manager form with legacy-parity validation:
    - required `username`, `firstName`, `lastName`;
    - password min length 8;
    - confirm password required and must match.
  - `components/ChangePasswordDialog.tsx` - manager password dialog with form submit semantics.
    - password inputs are contained in a `<form>` (dialog paper as form) to avoid browser password-field warnings.
  - `users.ui-text.ts` - labels, validation text, dialogs, and toasts for managers/users module.
  - details page permission rules (legacy parity):
    - `Change Password` and `Delete` are shown only when performer is self or `ADMIN`, and target user is not `ADMIN`;
    - password change payload always requires `oldPassword` + `newPassword` (including admin flow).

### 4.4 Shared UI layer
- `components/shared`
  - `DataTable`
  - `SearchToolbar`
    - search apply button is enabled only when search input contains a non-empty value
  - `FilterDialog` (generic modal, still used by products/customers pages)
  - `FilterChips` (generic chips, still used by products/customers pages)
    - supports optional label prefixes for search/filter values (for example `Search: foo`, `State: NY`).
  - `ExportDialog`
  - `PaginationControls`
  - `ConfirmDialog`
- `components/common/PagePlaceholder.tsx` - reusable placeholder page component.

### 4.5 Theme, constants, utils
- `theme/ThemeModeProvider.tsx` - light/dark mode and localStorage key `admin-frontend-theme-mode`.
- `theme/theme.ts` - MUI theme factory.
- `constants/dictionaries.ts` - manufacturers, countries, statuses, page size options.
- `utils/date.ts` - `formatDateTime`.
- `utils/download.ts` - blob download from axios response.
- `utils/orderStatus.ts` - centralized order status color mapping used across orders/customers/home.

## 5) Routing and access rules
Routes:
- Public-only: `/login`
- Protected:
  - `/home`
  - `/orders`
  - `/orders/:orderId`
  - `/products`
  - `/products/add`
  - `/products/:productId/edit`
  - `/customers`
  - `/customers/add`
  - `/customers/:customerId`
  - `/customers/:customerId/edit`
  - `/managers`
  - `/managers/add`
  - `/managers/:managerId`

Rules:
- unauthenticated users are redirected to `/login`;
- authenticated users should not stay on `/login`;
- while auth state is `initializing`, show `AuthRouteFallback`.

## 6) Where to add new code
Use feature-first structure, but reuse `components/shared` whenever possible.

Recommended flow for a new domain module:
1. add API contract and request functions in `src/api/modules/<entity>.api.ts`;
2. add React Query hooks in `src/features/<entity>/hooks`;
3. add table/sort/filter config in `src/features/<entity>/config` when needed;
4. add domain components in `src/features/<entity>/components`;
5. compose page(s) in `src/features/<entity>/pages`;
6. centralize user-facing strings in `src/features/<entity>/<entity>.ui-text.ts`;
7. wire route/nav in `src/app/router/AppRouter.tsx` and `src/app/config/navigation.ts`.

Avoid:
- direct backend calls in page components when a hook/query layer should own that logic;
- duplicating generic UI already present in `components/shared`;
- introducing naming patterns that conflict with existing code style.

## 7) State and data flow patterns
- Server state: React Query (`useQuery`, `useMutation`).
- Page UI state: feature-level orchestration hooks (example: `useProductsPageState`).
- API error toasts: centralized via `ApiEventsProvider` and API event bus.
- Success toasts: emitted in feature/page logic on successful domain actions.
- Unauthorized flow: handled in axios interceptor + `AuthProvider` subscriber.
- For multi-select UX with `Select All`, always model tri-state behavior:
  - `checked` when all selectable rows are selected;
  - `indeterminate` when only a subset is selected;
  - `unchecked` when nothing is selected.

## 8) `data-testid` standard (required)
### 8.1 Core rules
- Use only `data-testid`.
- Values must be static and business-meaningful.
- Do not use random suffixes, UUIDs, timestamps.
- For repeated items, index-based suffixes are allowed (`-row-0`, `-item-1`).
- Do not rename existing IDs unless task explicitly requires migration.

### 8.2 Elements that must be covered
- buttons and icon buttons;
- links and navigation entries;
- inputs, selects, checkboxes, radios;
- tables (table/head/header/body/row/cell/sort);
- dialogs (container/title/content/actions/close/confirm/cancel);
- important textual states (title/loading/empty/error/value blocks).

### 8.3 Naming pattern
Preferred shape:
- `<scope>-<entity>-<element>`
- `<scope>-<entity>-row-<index>-<cell>`

Existing scope prefixes to follow:
- `app-shell-*`
- `login-page-*`
- `orders-list-*`
- `orders-table-*`
- `orders-create-*`
- `order-details-*`
- `products-list-*`
- `products-upsert-*`
- `product-details-dialog-*`
- `search-toolbar-*`
- `filter-dialog-*`
- `export-dialog-*`
- `data-table-*`
- `pagination-controls-*`
- `notifications-*`
- `home-*`
- `managers-list-*`
- `managers-upsert-*`
- `manager-details-*`
- `change-password-dialog-*`

### 8.4 MUI input specifics
For `TextField`:
- set `data-testid` on the component;
- also set `inputProps={{ 'data-testid': '<...>-field' }}` for actual input node.

For `TextField select`:
- set `SelectProps={{ inputProps: { 'data-testid': '<...>-field' } }}`;
- set explicit IDs on `MenuItem` options.

For `Autocomplete`:
- set `data-testid` on the rendered input through `renderInput`;
- set `inputProps.data-testid` for the actual input node;
- set deterministic `data-testid` on `renderOption` items (for example by index).

### 8.5 Shared-first rule
If behavior comes from a shared component, add base `data-testid` values in that shared component first.
Feature-specific IDs should only be added for feature-only business actions or content.

## 9) Current localStorage keys
- `admin-frontend-access-token`
- `admin-frontend-user`
- `admin-frontend-theme-mode`

Do not change these keys without explicit migration requirements.

## 10) Text management
- Put domain text in `<feature>.ui-text.ts` for that feature.
- Keep generic shared text near shared components (example: `components/shared/shared.ui-text.ts`).
- For table empty states, reuse shared copy from `components/shared/shared.ui-text.ts`:
  - base empty: `No records created yet`
  - filtered/criteria empty: `No records found.`

## 11) Number, money, and status formatting
- Display monetary values with thousands separators in UI.
- Prefer a shared formatter/helper (for example locale-based `toLocaleString`) instead of ad-hoc string concatenation in components.
- For order statuses, always use `utils/orderStatus.ts#getOrderStatusColor` (do not inline per-component color logic).
- Current order status color mapping:
  - `Draft` -> `text.primary`
  - `In Process` -> `primary.main`
  - `Completed` -> `success.main`
  - `Canceled` -> `error.main`

## 12) Pre-handoff checklist
- Ensure code is in correct layer (`api`, `features`, `components/shared`, `app`).
- Ensure `data-testid` coverage for interactive and validation-critical elements.
- Ensure existing IDs are not broken.
- Run:
  - `npx tsc -p tsconfig.json --noEmit --pretty false`
  - `npm run lint`
- For larger changes also run:
  - `npm run build`

## 13) Definition of done for agent tasks
Task is done when:
- architecture and patterns are respected;
- business flow and UI behavior are consistent with current modules;
- automation-oriented `data-testid` values are added/updated correctly;
- typecheck and lint pass;
- no unrelated refactors are introduced outside task scope.
