export const MANUFACTURERS = ['Apple', 'Samsung', 'Google', 'Microsoft', 'Sony', 'Xiaomi', 'Amazon', 'Tesla'] as const

export const ORDER_STATUSES = ['Draft', 'In Process', 'Completed', 'Canceled'] as const

export const DELIVERY_STATUSES = [
  'Draft',
  'Delivery Scheduled',
  'Pickup Scheduled',
  'Partially Delivered',
  'Delivered',
] as const

export const PAGE_LIMIT_OPTIONS = [10, 25, 50, 100] as const
