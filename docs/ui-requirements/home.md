# Home Module - UI Requirements

> Purpose: serve as the post-login dashboard summarizing KPIs and giving quick links into Orders, Products, and Customers.

## Layout Blueprint

| Zone | Description |
| --- | --- |
| Hero | Headline "Welcome to Sales Management Portal" with a supporting paragraph. |
| CTA cards | Three equal cards linking to Orders, Products, Customers. Each shows an icon, a short description, and a primary button. |
| Metrics row | Five KPI cards fed by `/api/metrics`: Orders This Year, Total Revenue, New Customers, Average Order Value, Canceled Orders. |
| Charts row | Orders line chart, Top Products bar chart, Customer Growth line chart (Chart.js). |
| Tables row | Recent Orders table plus Top Customers table. |

## KPIs and Charts

| Widget | Data source | Notes |
| --- | --- | --- |
| Orders This Year | `metrics.orders.totalOrders` | Displayed with shopping cart icon. |
| Total Revenue | `metrics.orders.totalRevenue` | Use `numeral(...).format("0.0a")`. |
| New Customers | `metrics.customers.totalNewCustomers` | People icon. |
| Average Order Value | `metrics.orders.averageOrderValue` | Format to `$` with short notation. |
| Canceled Orders | `metrics.orders.totalCanceledOrders` | Red icon to emphasize. |
| Orders chart | `metrics.orders.ordersCountPerDay` | Chart.js line chart with integer y-axis ticks. |
| Top products chart | `metrics.products.topProducts` | Chart.js bar chart with five colors. |
| Customer growth chart | `metrics.customers.customerGrowth` | Chart.js line chart across recent days. |

`loadCharts` fetches the canvas contexts and instantiates Chart.js objects; ensure charts resize responsively within their cards.

## Tables

| Table | Columns | Data |
| --- | --- | --- |
| Recent Orders (`#recent-orders-container`) | Customer, Status, Total, Details | `metrics.orders.recentOrders`; Details link navigates to the order. |
| Top Customers (`#top-customers-container`) | Customer Name, Total Spent, Details | `metrics.customers.topCustomers`; Details link navigates to the customer profile. |

Both tables live inside `.table-responsive` wrappers so they scroll on smaller screens.

## Data Dependencies
- All content comes from `/api/metrics`, assembled in `MetricsController`.
  - Orders: `totalRevenue`, `totalOrders`, `averageOrderValue`, `totalCanceledOrders`, `recentOrders`, `ordersCountPerDay`.
  - Customers: `totalNewCustomers`, `topCustomers`, `customerGrowth`.
  - Products: `topProducts`.
- Default to empty arrays before mapping over data to avoid runtime errors when metrics are temporarily unavailable.
