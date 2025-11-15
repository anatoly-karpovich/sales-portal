# Home Module – UI Requirements

> **Purpose:** the dashboard landing page summarizing store performance and offering shortcuts into core modules.

## Layout Blueprint

| Zone | Description |
| --- | --- |
| Hero | Headline “Welcome to Sales Management Portal”, supporting copy (“Monitor key metrics…”). |
| CTA Cards | Three equal Bootstrap cards linking to Orders, Products, Customers—each with icon, description, and primary button (`#/orders`, `#/products`, `#/customers`). |
| Metrics Row | Five KPI cards (Orders This Year, Total Revenue, New Customers, Avg Order Value, Canceled Orders). |
| Charts Row | Orders line chart + Top sold products bar chart + Customer growth line chart. |
| Tables Row | Recent Orders table + Top Customers table. |

## KPIs & Charts

| Widget | Data source | Notes |
| --- | --- | --- |
| Orders This Year | `metrics.orders.totalOrders` | Card displays icon + label + metric. |
| Total Revenue | `metrics.orders.totalRevenue` formatted via `numeral(...).format("0.0a")`. |
| New Customers | `metrics.customers.totalNewCustomers`. |
| Avg Order Value | `metrics.orders.averageOrderValue` (formatted). |
| Canceled Orders | `metrics.orders.totalCanceledOrders`. |
| Orders Chart | `metrics.orders.ordersCountPerDay` – Chart.js line chart with integer y-axis ticks. |
| Top Products Chart | `metrics.products.topProducts` – Chart.js bar chart with five colors. |
| Customer Growth Chart | `metrics.customers.customerGrowth` – Chart.js line chart. |

`loadCharts` initializes all canvases; ensure each chart resizes responsively inside its card.

## Tables

| Table | Columns | Source |
| --- | --- | --- |
| Recent Orders (`#recent-orders-container`) | Customer, Status, Total, Details icon linking to `#/orders/{id}` | `metrics.orders.recentOrders` |
| Top Customers (`#top-customers-container`) | Customer Name, Total Spent, Details link (`#/customers/{id}`) | `metrics.customers.topCustomers` |

Both tables use `.table-striped` and live inside `.table-responsive` wrappers for horizontal overflow.

## Data Dependencies
- All content comes from `/api/metrics` (handled by `MetricsController`), combining:
  - Orders: `totalRevenue`, `totalOrders`, `averageOrderValue`, `totalCanceledOrders`, `recentOrders`, `ordersCountPerDay`.
  - Customers: `totalNewCustomers`, `topCustomers`, `customerGrowth`.
  - Products: `topProducts`.
- Frontend should default to empty arrays before mapping to avoid runtime errors when metrics are missing.
