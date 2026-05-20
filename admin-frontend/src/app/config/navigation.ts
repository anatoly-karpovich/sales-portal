export type NavigationSubItem = {
  to: string
  label: string
  testIdSuffix: string
}

export type NavigationItem = {
  to: string
  label: string
  children?: NavigationSubItem[]
}

export const navigationItems: NavigationItem[] = [
  { to: '/home', label: 'Home' },
  { to: '/orders', label: 'Orders' },
  { to: '/products', label: 'Products' },
  {
    to: '/inventory',
    label: 'Inventory',
    children: [
      { to: '/inventory', label: 'Inventory List', testIdSuffix: 'inventory-list' },
      {
        to: '/inventory/reservations',
        label: 'Reservations',
        testIdSuffix: 'inventory-reservations',
      },
    ],
  },
  { to: '/categories', label: 'Categories' },
  { to: '/customers', label: 'Customers' },
  { to: '/managers', label: 'Managers' },
]
