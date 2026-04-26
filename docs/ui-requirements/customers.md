# Customers Module - UI Requirements

> Purpose: provide full visibility into the customer directory, safe CRUD flows, and contextual order history.

## Quick Facts

| Aspect | Details |
| --- | --- |
| Entry points | `#/customers`, `#/customers/add`, `#/customers/{id}`, `#/customers/{id}/edit` |
| APIs | `/api/customers`, `/api/customers/all`, `/api/customers/:id`, `/api/customers/:id/orders`, `/api/settings` |
| Filters | Cities from `settings.delivery.pickupAddresses` + `Other` |
| Success copy | "Customer was successfully created/updated/deleted" |
| Error copy | "Failed to create customer", "Failed to update customer", "Customer with this email already exists." |

## List Page Anatomy

| Block | Description |
| --- | --- |
| Header & CTA | Title plus `+ Add Customer` button linking to the add flow. |
| Utility row | Search bar (shared component), Filter button, prefixed chip container, Export button. |
| Data table | Columns Email, Name, City, Created On. Sortable: Email, Name, Created On. |
| Row actions | Details (`#/customers/{id}`), Edit (`#/customers/{id}/edit`), Delete (standard confirmation modal asking whether to remove the customer). |
| Pagination | Auto-adjusts when deletions empty the current page. Empty state reads "No records found." for active search/filters and "No customers created yet." for empty base dataset. |

### Search and Filter Rules
- Search button stays disabled until the input has text.
- Search chip label is prefixed: `Search: <value>`.
- City filter options are loaded from `settings.delivery.pickupAddresses` keys plus `Other`.
- City filter chips are prefixed: `City: <value>`.
- `Other` chip maps to backend flag `includeOtherCities=true`.
- Selected concrete cities map to repeated backend query param `city`.

## Forms (Add/Edit)

| Field | Validation highlights |
| --- | --- |
| Email | Valid email format, required. |
| Name | 1-40 alphabetic chars with single spaces. |
| City | 1-20 alphabetic chars. |
| Street | 1-40 alpha-numeric chars. |
| House | Numeric 1-999. |
| Flat | Numeric 1-9999. |
| Phone | Must start with `+` and be 10-20 digits. |
| Notes | Up to 250 chars, no `<` or `>`. |

- Layout: responsive two-column grid with inline validation that disables Save when rules fail.
- City control uses `Autocomplete` with options from `settings.delivery.defaultCities` plus `Other`.
- Create mode defaults to the first city from `settings.delivery.defaultCities`.
- If `Other` is selected, a custom city input is enabled and required.
- If a default city is selected, custom city input is disabled.
- Edit mode maps stored city to default options using case-insensitive trimmed matching; non-default city maps to `Other`.
- Forms are blocked with skeleton/error state until settings are loaded.
- Controls: `Save New Customer` (or `Save Changes`), `Clear all`, breadcrumb-style back link.
- Edit page places `Delete Customer` next to Save; it invokes the same confirmation modal as the list and returns to the table after success.

## Customer Details Page

| Section | Content |
| --- | --- |
| Summary | Back link, title, edit pencil linking to `#/customers/{id}/edit`. |
| Contact | Email, name, phone. |
| Address | City, street, house, flat. |
| Registration & Notes | `createdOn` formatted via shared date util; notes default to `-` when empty. |
| Orders table | Columns Order Number (link to details), Price (prefixed with `$`), Status (colored), Created On, Last Modified. Empty state uses "No orders for this customer yet." |

## Backend Contracts

| Method | Endpoint | Notes |
| --- | --- | --- |
| GET | `/api/customers` | Accepts `search`, repeated `city`, `includeOtherCities`, `sortField`, `sortOrder`, `page`, `limit` (10-100). Returns `{ Customers, total, page, limit, search, city, includeOtherCities, sorting }`. |
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
