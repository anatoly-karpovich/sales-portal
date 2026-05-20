import numeral from 'numeral'

type UnknownRecord = Record<string, unknown>

type HomeChartSeries = {
  labels: string[]
  data: number[]
}

export type HomeMetricsViewModel = {
  metricCards: {
    ordersThisYear: string
    totalRevenue: string
    newCustomers: string
    averageOrderValue: string
    canceledOrders: string
  }
  charts: {
    ordersByDay: HomeChartSeries
    topProducts: HomeChartSeries
    customerGrowth: HomeChartSeries
  }
  recentOrders: Array<{
    id: string
    customerName: string
    status: string
    totalPrice: string
    createdOn: string
  }>
  topCustomers: Array<{
    id: string
    name: string
    email: string
    totalSpent: string
    ordersCount: number
  }>
}

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === 'object' ? (value as UnknownRecord) : {}
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
  }
  return fallback
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function formatCompactNumber(value: number) {
  return numeral(value).format('0.[0]a')
}

function formatCompactCurrency(value: number) {
  return `$${numeral(value).format('0.[0]a')}`
}

function toDateLabel(value: unknown, fallback = '-') {
  const date = asRecord(value)
  const year = asNumber(date.year, 0)
  const month = asNumber(date.month, 0)
  const day = asNumber(date.day, 0)

  if (year <= 0 || month < 1 || month > 12 || day < 1 || day > 31) {
    return fallback
  }

  const mm = String(month).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  return `${year}-${mm}-${dd}`
}

function toChartSeries(
  items: unknown[],
  resolveLabel: (item: UnknownRecord) => string,
  resolveData: (item: UnknownRecord) => number,
): HomeChartSeries {
  const labels: string[] = []
  const data: number[] = []

  items.forEach((item, index) => {
    const entry = asRecord(item)
    const label = resolveLabel(entry) || `Item ${index + 1}`
    labels.push(label)
    data.push(resolveData(entry))
  })

  return { labels, data }
}

export function normalizeMetricsForHome(metrics: unknown): HomeMetricsViewModel {
  const root = asRecord(metrics)
  const orders = asRecord(root.orders)
  const customers = asRecord(root.customers)
  const products = asRecord(root.products)

  const totalOrders = asNumber(orders.totalOrders)
  const totalRevenue = asNumber(orders.totalRevenue)
  const averageOrderValue = Math.round(asNumber(orders.averageOrderValue))
  const totalCanceledOrders = asNumber(orders.totalCanceledOrders)
  const totalNewCustomers = asNumber(customers.totalNewCustomers)

  const ordersByDay = toChartSeries(
    asArray(orders.ordersCountPerDay),
    (entry) => toDateLabel(entry.date),
    (entry) => asNumber(entry.count),
  )

  const topProducts = toChartSeries(
    asArray(products.topProducts),
    (entry) => asString(entry.name, 'Unknown'),
    (entry) => asNumber(entry.sales),
  )

  const customerGrowth = toChartSeries(
    asArray(customers.customerGrowth),
    (entry) => toDateLabel(entry.date),
    (entry) => asNumber(entry.count),
  )

  const recentOrders = asArray(orders.recentOrders).map((item, index) => {
    const entry = asRecord(item)
    const customer = asRecord(entry.customer)
    const totalPrice = asNumber(entry.total_price)

    return {
      id: asString(entry._id, `order-${index}`),
      customerName: asString(customer.name, '-'),
      status: asString(entry.status, '-'),
      totalPrice: formatCompactCurrency(totalPrice),
      createdOn: asString(entry.createdOn),
    }
  })

  const topCustomers = asArray(customers.topCustomers).map((item, index) => {
    const entry = asRecord(item)
    const totalSpent = asNumber(entry.totalSpent)

    return {
      id: asString(entry._id, `customer-${index}`),
      name: asString(entry.customerName, '-'),
      email: asString(entry.customerEmail, '-'),
      totalSpent: formatCompactCurrency(totalSpent),
      ordersCount: asNumber(entry.ordersCount),
    }
  })

  return {
    metricCards: {
      ordersThisYear: formatCompactNumber(totalOrders),
      totalRevenue: formatCompactCurrency(totalRevenue),
      newCustomers: formatCompactNumber(totalNewCustomers),
      averageOrderValue: formatCompactCurrency(averageOrderValue),
      canceledOrders: formatCompactNumber(totalCanceledOrders),
    },
    charts: {
      ordersByDay,
      topProducts,
      customerGrowth,
    },
    recentOrders,
    topCustomers,
  }
}
