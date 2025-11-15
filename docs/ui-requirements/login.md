# Login Module – UI Requirements

> **Purpose:** provide a frictionless entry point to the portal, handling auth securely while giving immediate feedback on failures.

## Page Overview

| Element | Description |
| --- | --- |
| Route | `#/login` (standalone, removes sidebar/header and disconnects socket connections). |
| Layout | Split screen: illustration left, form card right, full-height viewport. |
| Overlay | `.overlay` wrapper with centered spinner ready for background blocking scenarios. |
| Social icons | Facebook/Twitter/LinkedIn icon buttons in the header row – decorative only until OAuth arrives. |

## Form Specification

| Control | Details |
| --- | --- |
| Email field | `#emailinput`, type email, placeholder “Enter a valid email address”, autocomplete off. |
| Password field | `#passwordinput`, type password, placeholder “Enter password”, autocomplete off. |
| Remember me | Checkbox `#remembermecheckbox`. |
| Helper text | `<h4 id="errorMessage">Credentials are required</h4>` reserved for inline validation copy. |
| Submit | `.loginBtn` primary button labelled “Login”. |

## Interaction Flow
1. User clicks **Login** → prevent default submission, collect `{ username, password }`.
2. Replace button text with spinner (`setSpinnerToButton`) to communicate progress.
3. Call `POST /api/login` via `SignInService.signIn`.
4. On `200 OK`:
   - Persist the `Authorization` header as a cookie.
   - Store `response.data.User` in `window.localStorage` (`user`) and assign to `state.user`.
   - Remove the login overlay from the DOM.
   - Route to `#/home`.
5. On failure:
   - Restore button text, remove spinner.
   - Show red toast using either server message (“Incorrect credentials”, etc.) or fallback “Connection issue. Please try again later.”

## Error & Edge Cases
- Use the inline “Credentials are required” block to warn users about missing inputs before hitting the backend.
- 401/400 responses should not reset the form—keep typed credentials so users can correct them quickly.
- On network issues, keep the overlay hidden (no blocking spinner) and allow retries immediately.
