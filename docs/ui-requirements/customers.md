# Customers Module – UI Requirements

> **Purpose:** provide full visibility and maintenance tools for the customer directory—before, during, and after ordering.

## Quick Facts

| Aspect | Details |
| --- | --- |
| Entry points | `#/customers`, `#/customers/add`, `#/customers/{id}`, `#/customers/{id}/edit` |
| API surface | `/api/customers`, `/api/customers/all`, `/api/customers/:id`, `/api/customers/:id/orders` |
| Filters | Countries: USA, Canada, Belarus, Ukraine, Germany, France, Great Britain, Russia |
| Success copy | “Customer was successfully created/updated/deleted” |
| Error copy | “Failed to create customer”, “Failed to update customer”, “Customer with this email already exists.” |

## Page Anatomy (List)

| Block | Description |
| --- | --- |
| Header & CTA | Page title + `+ Add Customer` button linking to add flow. |
| Utility row | Search bar (shared behavior), Filter button, chip container. |
| Data table | Columns: Email, Name, Country, Created On; sortable on all columns. |
| Row actions | Details (navigates to profile-style page), Edit, Delete (standard confirmation modal). |
| Pagination & states | Auto-adjust page number when deletions empty the current page; show table spinner while loading and “No records created yet” when empty. |

### Search & Filter Rules
- Search button is disabled until text exists; submission stores the query in `state.search.customers`, renders a chip, clears the input, and triggers `getSortedCustomers`.
- Filter modal mirrors the product experience but uses the country list. Chips show each active country filter; removal updates state without extra network calls until needed.

## Forms (Add/Edit)

| Field | Validation Highlights |
| --- | --- |
| Email | Valid email format, required. |
| Name | 1–40 alphabetic chars, single spaces. |
| Country | Drop-down (same whitelist). |
| City, Street | Alphabetic/alphanumeric limits, 1–40 chars. |
| House, Flat | Numeric ranges (House 1–999, Flat 1–9999). |
| Phone | Must start with `+`, 10–20 digits. |
| Notes | Up to 250 chars, no `<`/`>`. |

- Form layout: responsive two-column grid with inline labels.
- Actions: `Save New Customer` (or `Save Changes`), `Clear all`, plus breadcrumb-style back link.
- Save button stays disabled until all validation rules pass AND the form differs from the persisted values.
- Delete button (on edit page) opens the same confirmation modal as the list; success returns to the table.

## Customer Details Page

| Section | Content |
| --- | --- |
| Summary card | Back link, title, edit pencil linking to `#/customers/{id}/edit`. |
| Contact info | Email, name, phone. |
| Address | Country, city, street, house, flat. |
| Registration & Notes | `createdOn` formatted via `formatDateToDateAndTime`; notes fallback to `-`. |
| Orders table | Columns: Order Number (links to order details), Price (prefixed with `$`), Status (colored), Created On, Last Modified (last history entry). Falls back to “No records created yet” when empty. |

## Backend Contracts

| Method | Endpoint | Notes |
| --- | --- | --- |
| GET | `/api/customers` | Supports `search`, repeated `country`, `sortField`, `sortOrder`, `page`, `limit (10–100)`; returns `{ Customers, total, page, limit, sorting }`. |
| GET | `/api/customers/all` | Lightweight list for selectors (e.g., order creation). |
| GET | `/api/customers/:id` | Populates detail/edit views. |
| GET | `/api/customers/:id/orders` | Orders table on detail page. |
| POST | `/api/customers` | Creates new customer. |
| PUT | `/api/customers/:id` | Updates record. |
| DELETE | `/api/customers/:id` | Returns `204`. |

## Notifications & Feedback
- Success scenarios show toasts such as “Customer was successfully created”.
- Duplicate email attempts should produce “Customer with this email already exists.”
- Other failures surface descriptive copy (“Failed to create customer”, “Unable to update customer. Please try again later.”).
- Chips can be cleared individually; removing the last filter should reload the unfiltered dataset automatically.
