import {
  Box,
  Button,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material'
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import { Link, useParams } from 'react-router-dom'
import type { CustomerOrder } from '@/api/modules/customers.api'
import { DataTable, type DataTableColumn } from '@/components/shared/DataTable'
import { formatDateTime } from '@/utils/date'
import { getOrderStatusColor } from '@/utils/orderStatus'
import {
  useCustomerOrdersQuery,
  useCustomerQuery,
} from '@/features/customers/hooks/useCustomersQuery'
import { customersUiText } from '@/features/customers/customers.ui-text'

function CustomerDetailsSkeleton() {
  return (
    <Stack spacing={2.5} data-testid="customer-details-page-skeleton">
      <Paper sx={{ p: { xs: 2, md: 3 } }} data-testid="customer-details-page-skeleton-summary">
        <Stack spacing={2}>
          <Skeleton variant="text" width={120} height={28} />
          <Skeleton variant="text" width={260} height={52} />
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
            <Skeleton variant="rounded" height={180} />
            <Skeleton variant="rounded" height={180} />
          </Box>
          <Skeleton variant="rounded" height={120} />
        </Stack>
      </Paper>
      <Paper sx={{ p: { xs: 2, md: 3 } }} data-testid="customer-details-page-skeleton-orders">
        <Stack spacing={2}>
          <Skeleton variant="text" width={120} height={44} />
          <Skeleton variant="rounded" height={280} />
        </Stack>
      </Paper>
    </Stack>
  )
}

function resolveLastModified(order: CustomerOrder) {
  const history = order.history ?? order.History ?? []
  const lastHistoryEntry = history.length > 0 ? history.at(-1) : undefined
  const value =
    lastHistoryEntry?.changedOn ??
    order.changedOn ??
    lastHistoryEntry?.createdOn ??
    lastHistoryEntry?.createdAt ??
    lastHistoryEntry?.updatedOn ??
    lastHistoryEntry?.updatedAt ??
    order.lastModified ??
    order.updatedOn ??
    order.updatedAt

  return value ? formatDateTime(value) : '-'
}

function getCustomerOrderColumns(): DataTableColumn<CustomerOrder>[] {
  return [
    {
      key: '_id',
      label: customersUiText.detailsPage.orderColumns.orderNumber,
      width: '28%',
      minWidth: 250,
      render: (row) => (
        <Button
          component={Link}
          to={`/orders/${row._id}`}
          variant="text"
          sx={{ textTransform: 'none', px: 0, minWidth: 0 }}
        >
          {row._id}
        </Button>
      ),
    },
    {
      key: 'total_price',
      label: customersUiText.detailsPage.orderColumns.price,
      width: '12%',
      minWidth: 120,
      render: (row) => `$${row.total_price}`,
    },
    {
      key: 'status',
      label: customersUiText.detailsPage.orderColumns.status,
      width: '16%',
      minWidth: 150,
      render: (row) => (
        <Typography sx={{ color: getOrderStatusColor(row.status) }}>
          {row.status}
        </Typography>
      ),
    },
    {
      key: 'createdOn',
      label: customersUiText.detailsPage.orderColumns.createdOn,
      width: '22%',
      minWidth: 220,
      render: (row) => formatDateTime(row.createdOn),
    },
    {
      key: 'lastModified',
      label: customersUiText.detailsPage.orderColumns.lastModified,
      width: '22%',
      minWidth: 220,
      render: (row) => resolveLastModified(row),
    },
  ]
}

function DetailsField({ label, value }: { label: string; value: string }) {
  return (
    <Stack spacing={0.25}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700 }} data-testid={`customer-details-${label.toLowerCase().replace(/\s+/g, '-')}-label`}>
        {label}
      </Typography>
      <Typography color="text.secondary" data-testid={`customer-details-${label.toLowerCase().replace(/\s+/g, '-')}-value`}>
        {value}
      </Typography>
    </Stack>
  )
}

function InlineDetailsField({ label, value }: { label: string; value: string }) {
  return (
    <Typography color="text.secondary" data-testid={`customer-details-inline-${label.toLowerCase()}-value`}>
      <Typography component="span" variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
        {label}:
      </Typography>{' '}
      {value}
    </Typography>
  )
}

export function CustomerDetailsPage() {
  const { customerId } = useParams<{ customerId: string }>()

  const shouldLoadCustomer = Boolean(customerId)
  const {
    data: customer,
    isLoading: isCustomerLoading,
  } = useCustomerQuery(customerId ?? '', shouldLoadCustomer)
  const {
    data: orders,
    isLoading: isOrdersLoading,
  } = useCustomerOrdersQuery(customerId ?? '', shouldLoadCustomer)

  if (!customerId) {
    return (
      <Paper sx={{ p: 3 }} data-testid="customer-details-page-missing-id">
        <Typography color="error" data-testid="customer-details-page-missing-id-error-text">
          {customersUiText.errors.missingCustomerId}
        </Typography>
      </Paper>
    )
  }

  if (isCustomerLoading || isOrdersLoading) {
    return <CustomerDetailsSkeleton />
  }

  if (!customer) {
    return (
      <Paper sx={{ p: 3 }} data-testid="customer-details-page-not-found">
        <Typography color="error" data-testid="customer-details-page-not-found-error-text">
          {customersUiText.errors.customerNotFound}
        </Typography>
      </Paper>
    )
  }

  const orderRows = orders ?? []

  return (
    <Stack spacing={2.5} data-testid="customer-details-page">
      <Paper sx={{ p: { xs: 2, md: 3 } }} data-testid="customer-details-page-summary">
        <Stack spacing={2.5}>
          <Button
            component={Link}
            to="/customers"
            variant="text"
            startIcon={<ArrowBackRoundedIcon fontSize="small" />}
            sx={{ alignSelf: 'flex-start', px: 0, textTransform: 'none' }}
            data-testid="customer-details-back-to-list-link"
          >
            {customersUiText.form.backToCustomers}
          </Button>

          <Stack direction="row" spacing={1} alignItems="center" data-testid="customer-details-header">
            <Typography variant="h4" sx={{ fontWeight: 700 }} data-testid="customer-details-title">
              {customersUiText.detailsPage.title}
            </Typography>
            <Button
              component={Link}
              to={`/customers/${customer._id}/edit`}
              variant="text"
              startIcon={<EditOutlinedIcon fontSize="small" />}
              sx={{ textTransform: 'none' }}
              data-testid="customer-details-edit-link"
            >
              {customersUiText.detailsPage.editButton}
            </Button>
          </Stack>

          <Box
            sx={{
              display: 'grid',
              gap: 3,
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            }}
            data-testid="customer-details-main-grid"
          >
            <Stack spacing={1.5} data-testid="customer-details-contact-section">
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {customersUiText.detailsPage.contactTitle}
              </Typography>
              <DetailsField label={customersUiText.detailsPage.fields.email} value={customer.email} />
              <DetailsField label={customersUiText.detailsPage.fields.name} value={customer.name} />
              <DetailsField label={customersUiText.detailsPage.fields.phone} value={customer.phone} />
            </Stack>

            <Stack spacing={1.5} data-testid="customer-details-address-section">
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {customersUiText.detailsPage.addressTitle}
              </Typography>
              <Stack spacing={0.35}>
                <InlineDetailsField label={customersUiText.detailsPage.fields.country} value={customer.country} />
                <InlineDetailsField label={customersUiText.detailsPage.fields.city} value={customer.city} />
                <InlineDetailsField label={customersUiText.detailsPage.fields.street} value={customer.street} />
                <InlineDetailsField label={customersUiText.detailsPage.fields.house} value={String(customer.house)} />
                <InlineDetailsField label={customersUiText.detailsPage.fields.flat} value={String(customer.flat)} />
              </Stack>
            </Stack>
          </Box>

          <Box
            sx={{
              display: 'grid',
              gap: 3,
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            }}
            data-testid="customer-details-meta-grid"
          >
            <Stack spacing={1.5} data-testid="customer-details-registration-section">
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {customersUiText.detailsPage.registrationDateTitle}
              </Typography>
              <Typography color="text.secondary" data-testid="customer-details-registration-date-value">
                {formatDateTime(customer.createdOn)}
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {customersUiText.detailsPage.notesTitle}
              </Typography>
              <Typography
                color="text.secondary"
                data-testid="customer-details-notes-text"
                sx={{
                  maxWidth: '100%',
                  whiteSpace: 'pre-wrap',
                  overflowWrap: 'anywhere',
                  wordBreak: 'break-word',
                }}
              >
                {customer.notes?.trim() ? customer.notes : '-'}
              </Typography>
            </Stack>
            <Box />
          </Box>
        </Stack>
      </Paper>

      <Paper sx={{ p: { xs: 2, md: 3 } }} data-testid="customer-details-page-orders">
        <Stack spacing={1.5}>
          <Typography variant="h5" sx={{ fontWeight: 700 }} data-testid="customer-details-orders-title">
            {customersUiText.detailsPage.ordersTitle}
          </Typography>
          <DataTable
            rows={orderRows}
            columns={getCustomerOrderColumns()}
            sortField="createdOn"
            sortOrder="desc"
            onSort={() => undefined}
            isLoading={false}
            emptyText={customersUiText.detailsPage.emptyOrders}
          />
        </Stack>
      </Paper>
    </Stack>
  )
}
