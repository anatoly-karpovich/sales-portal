import { useParams } from 'react-router-dom'
import { PagePlaceholder } from '@/components/common/PagePlaceholder'

export function OrderDetailsPage() {
  const { orderId } = useParams<{ orderId: string }>()

  return (
    <PagePlaceholder
      title="Order Details"
      description={
        orderId
          ? `Order details migration (orderId: ${orderId}) is planned for iteration 6.`
          : 'Order details migration is planned for iteration 6.'
      }
      testIdPrefix="order-details-page-placeholder"
    />
  )
}
