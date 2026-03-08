# Navigation Module - UI Requirements

> Goal: keep users oriented across desktop and mobile layouts with synchronized header, sidebar, and notification experiences.

## Header (Top Navigation)

| Section | Content |
| --- | --- |
| Brand and links | Brand label "Sales Portal" plus links defined in `navigationMenuOptions` (Home, Orders, Products, Customers, Managers). Each link calls `sideMenuClickHandler` and highlights the active item via `activateNavigationMenuItem`. |
| Utilities | Notification bell with badge (`#notification-bell`), theme toggle button (`#theme-toggle`), user menu linking to the manager profile, and a sign-out icon. |
| Responsiveness | Collapses into a hamburger menu that opens the mobile off-canvas. |

## Notification Bell
- Shared behavior for header and sidebar bells: toggle the popover described in `notifications.md`.
- Badge displays only unread counts for the current user.
- Clicking outside the popover dismisses it.

## Mobile Off-Canvas

| Element | Behavior |
| --- | --- |
| Drawer (`#mobileOffcanvas`) | Mirrors the main navigation as stacked links. `handleMobileNavigationClick` prevents default navigation, activates the item, closes the drawer, and routes via `setRoute`. |
| Footer | Full-width Logout button for touch users. |

## Sidebar (Desktop Left Rail)

| Block | Description |
| --- | --- |
| Brand + nav | Same modules as the header but displayed as vertical pills. |
| Theme switch | Toggle (`#sp-theme-switch`) that calls `switchTheme`. |
| Profile dropdown | Avatar, first name, and options: Profile (`#/managers/{id}`), Change Password (if non-admin), Sign out. |
| Notification bell | Mirrors the top nav bell for users who prefer side controls. |
| Extras | "Currency exchange" widget (demo) near the bottom; hide on narrow screens if space is tight. |

## Theme Switching
- Header icon button and sidebar switch both call `switchTheme`.
- `switchTheme` saves the choice (`localStorage.theme`), updates HTML/background colors, and toggles `data-bs-theme` ("light"/"dark").
- When dark mode is enabled, set sidebar backgrounds to `themeBgColors.dark` and switch the header icon to the sun glyph; revert when returning to light mode.

## Profile and Sign-out
- Profile links open the manager details page; if the stored ID is missing, fall back to signing out for safety.
- `signOutHandler` flow:
  1. Show the body-level spinner (`setSpinnerToBody`).
  2. Call `POST /api/logout`.
  3. On success, hide the spinner, clear auth cookie/localStorage token, remove the sidebar node, reset notification state, and route to `#/login`.
  4. On failure, show an error toast and keep the user on the current page.
