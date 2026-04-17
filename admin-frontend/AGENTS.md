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
- `api/modules/*.api.ts` - backend contracts and domain requests (`products`, `metrics`, `notifications`, `orders`, `customers`).

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
- `features/products` (most complete module)
  - `pages/ProductsPage.tsx` - list, filters, export, pagination, dialogs
  - `pages/ProductUpsertPage.tsx`, `ProductCreatePage.tsx`, `ProductEditPage.tsx`
  - `hooks/useProductsPageState.ts` - UI orchestration + query params
  - `hooks/useProductsQuery.ts` - query/mutation layer
  - `config/productsTableColumns.ts` - table schema, sort fields, export fields
  - `components/ProductForm.tsx`, `ProductDetailsDialog.tsx`, `ProductsTableActionsCell.tsx`
  - `forms/*` - form mappers, touched state, validation
  - `products.ui-text.ts` - labels, validation text, toast text
- `features/customers` (implemented in iteration 5)
  - `pages/CustomersPage.tsx` - list, filters, export, pagination, delete flow
  - `pages/CustomerUpsertPage.tsx`, `CustomerCreatePage.tsx`, `CustomerEditPage.tsx`
  - `pages/CustomerDetailsPage.tsx` - customer summary and orders table
  - `hooks/useCustomersPageState.ts` - UI orchestration + query params
  - `hooks/useCustomersQuery.ts` - query/mutation layer
  - `config/customersTableColumns.ts` - table schema, sort fields, export fields
  - `components/CustomerForm.tsx`, `CustomersTableActionsCell.tsx`
  - `forms/*` - form mappers, touched state, validation
  - `customers.ui-text.ts` - labels, validation text, toast text
- `features/orders`, `features/users`
  - list pages are placeholders using `PagePlaceholder`;
  - `orders/:orderId` currently points to `OrderDetailsPage` placeholder (iteration 6 target).

### 4.4 Shared UI layer
- `components/shared`
  - `DataTable`
  - `SearchToolbar`
  - `FilterDialog`
  - `FilterChips`
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

### 8.4 MUI input specifics
For `TextField`:
- set `data-testid` on the component;
- also set `inputProps={{ 'data-testid': '<...>-field' }}` for actual input node.

For `TextField select`:
- set `SelectProps={{ inputProps: { 'data-testid': '<...>-field' } }}`;
- set explicit IDs on `MenuItem` options.

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

## 11) Pre-handoff checklist
- Ensure code is in correct layer (`api`, `features`, `components/shared`, `app`).
- Ensure `data-testid` coverage for interactive and validation-critical elements.
- Ensure existing IDs are not broken.
- Run:
  - `npx tsc -p tsconfig.json --noEmit --pretty false`
  - `npm run lint`
- For larger changes also run:
  - `npm run build`

## 12) Definition of done for agent tasks
Task is done when:
- architecture and patterns are respected;
- business flow and UI behavior are consistent with current modules;
- automation-oriented `data-testid` values are added/updated correctly;
- typecheck and lint pass;
- no unrelated refactors are introduced outside task scope.
