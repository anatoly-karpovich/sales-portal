export type NavigationItem = {
  to: string
  label: string
}

export const navigationItems: NavigationItem[] = [
  { to: '/home', label: 'Home' },
  { to: '/orders', label: 'Orders' },
  { to: '/products', label: 'Products' },
  { to: '/customers', label: 'Customers' },
  { to: '/managers', label: 'Managers' },
]
