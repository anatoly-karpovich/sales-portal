# Navigation Module – UI Requirements

> **Goal:** keep users oriented across desktop and mobile layouts with synchronized header, sidebar, and notification experiences.

## Header (Top Nav)

| Section | Content |
| --- | --- |
| Brand & links | Brand label “Sales Portal” plus links defined in `navigationMenuOptions` (Home, Orders, Products, Customers, Managers). Clicking calls `sideMenuClickHandler` and highlights the active item using `activateNavigationMenuItem`. |
| Utilities | Notification bell with badge (`#notification-bell`), theme toggle button (`#theme-toggle`), user menu linking to manager profile, sign-out icon. |
| Responsiveness | Collapses into hamburger; toggler opens the mobile off-canvas described below. |

## Notification Bell
- Shares behavior with the sidebar bell: toggles the popover documented in `notifications.md`.
- Badge shows unread count only for events tied to the logged-in user.
- Clicking outside the popover closes it automatically.

## Mobile Off-Canvas

| Element | Behavior |
| --- | --- |
| Drawer (`#mobileOffcanvas`) | Mirrors main navigation as stacked links. `handleMobileNavigationClick` prevents default navigation, activates the item, closes the drawer, and routes via `setRoute`. |
| Footer | Full-width Logout button for touch accessibility. |

## Sidebar (Desktop Left Rail)

| Block | Description |
| --- | --- |
| Brand + nav | Same modules as header but presented as vertical pills; `sideMenuClickHandler` keeps router state in sync. |
| Theme switch | Toggle switch `#sp-theme-switch` for dark mode. |
| Profile dropdown | Avatar, first name, menu items: Profile (`#/managers/{id}`), Change Password (if non-admin), Sign out. |
| Notification bell | Mirrors top nav bell for users who prefer side controls. |
| Extras | “Currency exchange” widget (demo component) near the bottom; hide on narrow screens if space is limited. |

## Theme Switching
- Header icon button and sidebar switch both call `switchTheme`.
- `switchTheme` persists the choice (`localStorage.theme`), updates HTML/background colors, and toggles `data-bs-theme` (“light”/“dark”).
- When enabling dark mode, ensure sidebar background uses `themeBgColors.dark` and header icon flips to the sun icon; revert when switching back to light mode.

## Profile & Sign-out
- Clicking the profile link opens manager details; if the stored ID is missing, fall back to signing out to avoid stale sessions.
- `signOutHandler` behavior:
  1. Show page-level spinner (`setSpinnerToBody`).
  2. Call `POST /api/logout`.
  3. On success, hide spinner, remove authorization cookie/localStorage token, remove the sidebar DOM node, reset notification state, and route to `#/login`.
  4. On failure, show error toast and keep the user on the current page.
