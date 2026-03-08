# Login Module - UI Requirements

> Purpose: provide a secure, frictionless entry into the portal while giving users immediate feedback on authentication issues.

## Page Overview

| Element | Description |
| --- | --- |
| Route | `#/login`; this view disconnects any active sockets and removes sidebar/header chrome. |
| Layout | Split screen: illustration on the left, form card on the right, full-height hero. |
| Overlay | `.overlay` wrapper with centered spinner that can block the UI during background work. |
| Social icons | Facebook, Twitter, LinkedIn icon buttons in the header row (decorative until OAuth support). |

## Form Specification

| Control | Details |
| --- | --- |
| Email input | `#emailinput`, type `email`, placeholder "Enter a valid email address", autocomplete off. |
| Password input | `#passwordinput`, type `password`, placeholder "Enter password", autocomplete off. |
| Remember me | Checkbox `#remembermecheckbox`. |
| Helper text | `<h4 id="errorMessage">Credentials are required</h4>` reserved for inline validation. |
| Submit | `.loginBtn` primary button labelled "Login". |

## Interaction Flow
1. User clicks **Login**. Prevent default submission and build `{ username, password }`.
2. Replace button content with a spinner via `setSpinnerToButton`.
3. Call `POST /api/login` through `SignInService.signIn`.
4. On `200 OK`:
   - Persist the `Authorization` header as a cookie.
   - Store `response.data.User` in `window.localStorage` (`user`) and assign it to `state.user`.
   - Remove the login overlay node.
   - Navigate to `#/home`.
5. On failure:
   - Restore the button text, remove the spinner.
   - Show a red toast with either the server message ("Incorrect credentials") or the generic "Connection issue. Please try again later."

## Error and Edge Cases
- Use the inline helper text to warn about empty inputs before hitting the API.
- 400/401 responses should not clear the inputs; let users retry quickly.
- Network failures should not lock the overlay spinner; keep the view interactive for immediate retries.
