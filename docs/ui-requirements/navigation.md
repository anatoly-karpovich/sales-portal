# Navigation Module - UI Requirements

> Goal: keep users oriented across desktop and mobile top navigation with consistent routing, active-state highlighting, and quick access to auth/theme/notifications actions.

## Header (Top Navigation)

| Section | Content |
| --- | --- |
| Brand | `Sales Portal` link routes to `#/home`. |
| Primary nav | `Home`, `Orders`, `Products`, `Inventory`, `Categories`, `Customers`, `Managers`. Active state uses route-prefix matching. |
| Utilities | Notifications bell, theme toggle, user first-name link (to `#/managers/{userId}` when available), logout icon button. |
| Responsiveness | Desktop shows horizontal nav buttons; mobile collapses into hamburger `Menu`. |

## Inventory Nested Navigation

### Desktop
- `Inventory` is a hover-triggered parent item.
- Hover opens a dropdown with:
  - `Inventory List` -> `#/inventory`
  - `Reservations` -> `#/inventory/reservations`
- Dropdown closes on pointer leave with a short delay (`~200ms`) to avoid flicker on trigger/menu boundary.
- Both `#/inventory` and `#/inventory/reservations` keep the top-level `Inventory` nav item in active state.

### Mobile
- Tap on `Inventory` opens nested inventory sub-menu.
- Sub-menu includes:
  - `Back`
  - `Inventory List`
  - `Reservations`
- Back returns to root mobile menu without routing.

## Mobile Menu

| Element | Behavior |
| --- | --- |
| Root menu | Mirrors top-level nav links. Non-nested items navigate and close menu. |
| Nested flow | Inventory item opens nested view instead of direct route. |
| Footer action | Logout action is always present and closes menu before execution. |

## Notifications and Theme
- Notifications bell behavior is shared across pages and follows requirements from `notifications.md`.
- Theme toggle switches `light/dark` mode through shared ThemeMode context and persisted localStorage key.

## User and Logout
- User label in top bar links to manager details when current user id exists; otherwise it is disabled.
- Logout action:
  1. calls auth logout flow;
  2. navigates to `#/login` on success;
  3. keeps pending visual state while request is in flight.

## Test IDs (Navigation-specific)
- Required desktop ids:
  - `app-shell-nav-inventory-trigger`
  - `app-shell-nav-inventory-list-link`
  - `app-shell-nav-inventory-reservations-link`
- Required mobile ids:
  - `app-shell-mobile-nav-inventory-trigger`
  - `app-shell-mobile-nav-inventory-back-button`
  - `app-shell-mobile-nav-inventory-list-link`
  - `app-shell-mobile-nav-inventory-reservations-link`
