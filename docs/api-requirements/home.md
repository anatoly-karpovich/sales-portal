# Home Module - API Requirements

> Purpose: define dashboard metrics contract for the home page.

## Quick Facts

| Aspect | Details |
| --- | --- |
| Endpoint | `GET /api/metrics` |
| Auth | Required |
| Success envelope | `{ IsSuccess, Metrics, ErrorMessage }` |
| Failure envelope | `{ IsSuccess: false, ErrorMessage }` |

## Endpoint

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/metrics` | Returns aggregated KPI/cards/charts data for orders, customers, and products. |

## Response Contract (`200`)

```json
{
  "IsSuccess": true,
  "Metrics": {
    "orders": {
      "totalRevenue": 0,
      "totalOrders": 0,
      "averageOrderValue": 0,
      "totalCanceledOrders": 0,
      "recentOrders": [],
      "ordersCountPerDay": []
    },
    "customers": {
      "totalNewCustomers": 0,
      "topCustomers": [],
      "customerGrowth": []
    },
    "products": {
      "topProducts": []
    }
  },
  "ErrorMessage": null
}
```

## Notes for Consumers

- `recentOrders` contains order objects used by dashboard shortcuts.
- `ordersCountPerDay` and `customerGrowth` contain date buckets (`year`, `month`, `day`) plus `count`.
- `topProducts` and `topCustomers` are already pre-aggregated/ranked by backend.
- On backend error: `500` with `{ IsSuccess: false, ErrorMessage }`.
