export function getOrderStatusColor(status: string) {
  switch (status) {
    case 'Draft':
      return 'text.primary'
    case 'In Process':
      return 'primary.main'
    case 'Completed':
      return 'success.main'
    case 'Canceled':
      return 'error.main'
    default:
      return 'text.primary'
  }
}
