export function getOrderStatusColor(status: string) {
  switch (status) {
    case 'Draft':
      return 'text.primary'
    case 'In Process':
    case 'Partially Received':
      return 'primary.main'
    case 'Received':
      return 'success.main'
    case 'Canceled':
      return 'error.main'
    default:
      return 'text.primary'
  }
}
