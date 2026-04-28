# Customers Module - UI Requirements

> Purpose: provide full visibility into the customer directory, safe CRUD flows, and contextual order history.

## Quick Facts

| Aspect | Details |
| --- | --- |
| Entry points | `#/customers`, `#/customers/add`, `#/customers/{id}`, `#/customers/{id}/edit` |
| APIs | `/api/customers`, `/api/customers/all`, `/api/customers/:id`, `/api/customers/:id/orders` |
| Filters | US states (all 50), displayed as state code in filter modal (`NY`, `CA`, ...) |
| Success copy | "Customer was successfully created/updated/deleted" |
| Error copy | "Failed to create customer", "Failed to update customer", "Customer with this email already exists." |

## List Page Anatomy

| Block | Description |
| --- | --- |
| Header & CTA | Title plus `+ Add Customer` button linking to the add flow. |
| Utility row | Search bar (shared component), Filter button, prefixed chip container, Export button. |
| Data table | Columns Email, Name, State, City, Created On. Sortable: Email, Name, Created On. |
| Row actions | Details (`#/customers/{id}`), Edit (`#/customers/{id}/edit`), Delete (standard confirmation modal asking whether to remove the customer). |
| Pagination | Auto-adjusts when deletions empty the current page. Empty state reads "No records found." for active search/filters and "No customers created yet." for empty base dataset. |

### Search and Filter Rules
- Search button stays disabled until the input has text.
- Search chip label is prefixed: `Search: <value>`.
- State filter options use all US state codes (`AL..WY`).
- State filter chips are prefixed: `State: <value>`.
- Selected states map to repeated backend query param `state`.

## Forms (Add/Edit)

| Field | Validation highlights |
| --- | --- |
| Email | Valid email format, required. |
| Name | 1-40 alphabetic chars with single spaces. |
| State | Required, must be valid US state code. |
| City | 1-20 chars, supports alphabetic names with spaces, dot, hyphen, apostrophe. |
| Street | 1-40 alpha-numeric chars. |
| House | Numeric 1-999. |
| Apartment | Optional, numeric 1-9999. |
| Zip Code | Required, `12345` or `12345-6789` format (masked input). |
| Phone | Must start with `+` and be 10-20 digits. |
| Notes | Up to 250 chars, no `<` or `>`. |

- Layout: responsive two-column grid with inline validation that disables Save when rules fail.
- State control uses `Autocomplete` with searchable labels in `CODE — State Name` format.
- City is plain text input (not dropdown).
- Apartment is optional; when empty it is not sent in payload.
- Controls: `Save New Customer` (or `Save Changes`), `Clear all`, breadcrumb-style back link.
- Edit page places `Delete Customer` next to Save; it invokes the same confirmation modal as the list and returns to the table after success.

## Customer Details Page

| Section | Content |
| --- | --- |
| Summary | Back link, title, edit pencil linking to `#/customers/{id}/edit`. |
| Contact | Email, name, phone. |
| Address | State, City, Street, House, Zip Code, optional Apartment. |
| Registration & Notes | `createdOn` formatted via shared date util; notes default to `-` when empty. |
| Orders table | Columns Order Number (link to details), Price (prefixed with `$`), Status (colored), Created On, Last Modified. Empty state uses "No orders for this customer yet." |

## Backend Contracts

| Method | Endpoint | Notes |
| --- | --- | --- |
| GET | `/api/customers` | Accepts `search`, repeated `state`, optional `includeOtherStates`, `sortField`, `sortOrder`, `page`, `limit` (10-100). Returns `{ Customers, total, page, limit, search, state, includeOtherStates, sorting }`. |
| GET | `/api/customers/all` | Provides a lightweight list for dropdowns (e.g., order creation). |
| GET | `/api/customers/:id` | Fetches a single record for detail or edit screens. |
| GET | `/api/customers/:id/orders` | Supplies the orders table on the detail page. |
| POST | `/api/customers` | Creates a customer. |
| PUT | `/api/customers/:id` | Updates the customer. |
| DELETE | `/api/customers/:id` | Returns `204` on success. |

## Feedback Guidelines
- Success toasts: "Customer was successfully created/updated/deleted."
- Conflict handling: duplicate email returns "Customer with this email already exists."
- Other failures surface descriptive copy such as "Failed to create customer. Please try again later."
- Removing the last search/filter chip refreshes the table to unfiltered state.
