import { apiClient } from '@/api/client'

type MetricsResponse = {
  IsSuccess: boolean
  ErrorMessage: string | null
  Metrics: {
    orders: {
      totalRevenue: number
      totalOrders: number
      averageOrderValue: number
      totalCanceledOrders: number
      recentOrders: Array<{
        _id: string
        status: string
        total_price: number
        customer: { _id: string; name: string; email: string }
        createdOn: string
      }>
      ordersCountPerDay: Array<{ date: { year: number; month: number; day: number }; count: number }>
    }
    customers: {
      totalNewCustomers: number
      topCustomers: Array<{
        _id: string
        customerName: string
        customerEmail: string
        totalSpent: number
        ordersCount: number
      }>
      customerGrowth: Array<{ date: { year: number; month: number; day: number }; count: number }>
    }
    products: {
      topProducts: Array<{ name: string; sales: number }>
    }
  }
}

export async function getMetrics() {
  const response = await apiClient.get<MetricsResponse>('/metrics')
  return response.data.Metrics
}
