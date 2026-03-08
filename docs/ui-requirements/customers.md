# Customers Module - UI Requirements

> Purpose: provide full visibility into the customer directory, along with safe CRUD flows and contextual order history.

## Quick Facts

| Aspect | Details |
| --- | --- |
| Entry points | `#/customers`, `#/customers/add`, `#/customers/{id}`, `#/customers/{id}/edit` |
| APIs | `/api/customers`, `/api/customers/all`, `/api/customers/:id`, `/api/customers/:id/orders` |
| Filters | Countries: USA, Canada, Belarus, Ukraine, Germany, France, Great Britain, Russia |
| Success copy | "Customer was successfully created/updated/deleted" |
| Error copy | "Failed to create customer", "Failed to update customer", "Customer with this email already exists." |

## List Page Anatomy

| Block | Description |
| --- | --- |
| Header & CTA | Title plus `+ Add Customer` button linking to the add flow. |
| Utility row | Search bar (shared component), Filter button, chip container. |
| Data table | Columns Email, Name, Country, Created On; sortable on every column. |
| Row actions | Details (`#/customers/{id}`), Edit (`#/customers/{id}/edit`), Delete (standard confirmation modal asking whether to remove the customer). |
| Pagination | Auto-adjusts when deletions empty the current page; spinner shows while `getCustomersAndRenderTable` is running; empty state reads "No records created yet". |

### Search and Filter Rules
- Search button stays disabled until the input has text. Submitting stores the query in `state.search.customers`, renders a chip, clears the input, and fetches sorted data.
- Filter modal mirrors the products pattern but uses the country whitelist. Chips represent active countries; removing a chip updates filter state without extra network calls until needed.

## Forms (Add/Edit)

| Field | Validation highlights |
| --- | --- |
| Email | Valid email format, required. |
| Name | 1-40 alphabetic chars with single spaces. |
| Country | Select from the whitelist. |
| City | 1-20 alphabetic chars. |
| Street | 1-40 alpha-numeric chars. |
| House | Numeric 1-999. |
| Flat | Numeric 1-9999. |
| Phone | Must start with `+` and be 10-20 digits. |
| Notes | Up to 250 chars, no `<` or `>`. |

- Layout: responsive two-column grid with inline validation that disables the Save button when rules fail.
- Controls: `Save New Customer` (or `Save Changes`), `Clear all`, breadcrumb-style back link.
- Save button remains disabled until validations pass and the user changes a value.
- Edit page places `Delete Customer` next to Save; it invokes the same confirmation modal as the list and returns to the table after success.

## Customer Details Page

| Section | Content |
| --- | --- |
| Summary | Back link, title, edit pencil linking to `#/customers/{id}/edit`. |
| Contact | Email, name, phone. |
| Address | Country, city, street, house, flat. |
| Registration & Notes | `createdOn` formatted via `formatDateToDateAndTime`; notes default to `-` when empty. |
| Orders table | Columns Order Number (link to details), Price (prefixed with `$`), Status (colored), Created On, Last Modified (latest history entry). Empty state uses "No records created yet". |

## Backend Contracts

| Method | Endpoint | Notes |
| --- | --- | --- |
| GET | `/api/customers` | Accepts `search`, repeated `country`, `sortField`, `sortOrder`, `page`, `limit` (10-100). Returns `{ Customers, total, page, limit, sorting }`. |
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
- Removing the final filter chip should refresh the table to show unfiltered data.
