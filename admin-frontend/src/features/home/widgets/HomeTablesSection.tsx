import { Box, IconButton, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip, Typography } from '@mui/material'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import { Link } from 'react-router-dom'
import type { HomeMetricsViewModel } from '@/features/home/mappers/homeMetrics.mapper'
import { formatDateTime } from '@/utils/date'
import { getOrderStatusColor } from '@/utils/orderStatus'

type Props = {
  recentOrders: HomeMetricsViewModel['recentOrders']
  topCustomers: HomeMetricsViewModel['topCustomers']
}

export function HomeTablesSection({ recentOrders, topCustomers }: Props) {
  return (
    <Box
      sx={{
        display: 'grid',
        gap: 2,
        gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
      }}
      data-testid="home-tables-section"
    >
      <Paper sx={{ p: 2.5 }} data-testid="home-recent-orders-table-card">
        <Typography variant="h6" sx={{ mb: 1.5, fontWeight: 700 }} data-testid="home-recent-orders-table-title">
          Recent Orders
        </Typography>
        <TableContainer sx={{ overflowX: 'auto' }} data-testid="home-recent-orders-table-container">
          <Table size="small" sx={{ minWidth: 620 }} data-testid="home-recent-orders-table">
            <TableHead data-testid="home-recent-orders-table-head">
              <TableRow data-testid="home-recent-orders-table-head-row">
                <TableCell data-testid="home-recent-orders-header-customer">Customer</TableCell>
                <TableCell data-testid="home-recent-orders-header-status">Status</TableCell>
                <TableCell data-testid="home-recent-orders-header-total">Total</TableCell>
                <TableCell data-testid="home-recent-orders-header-created">Created</TableCell>
                <TableCell data-testid="home-recent-orders-header-details">Details</TableCell>
              </TableRow>
            </TableHead>
            <TableBody data-testid="home-recent-orders-table-body">
              {recentOrders.map((order, index) => (
                <TableRow key={order.id} data-testid={`home-recent-orders-row-${index}`}>
                  <TableCell data-testid={`home-recent-orders-row-${index}-customer`}>{order.customerName}</TableCell>
                  <TableCell data-testid={`home-recent-orders-row-${index}-status`}>
                    <Typography component="span" sx={{ color: getOrderStatusColor(order.status) }}>
                      {order.status}
                    </Typography>
                  </TableCell>
                  <TableCell data-testid={`home-recent-orders-row-${index}-total`}>{order.totalPrice}</TableCell>
                  <TableCell data-testid={`home-recent-orders-row-${index}-created`}>{formatDateTime(order.createdOn)}</TableCell>
                  <TableCell>
                    <Tooltip title="Details">
                      <IconButton component={Link} to="/orders" size="small" data-testid={`home-recent-orders-row-${index}-details-button`}>
                        <VisibilityOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Paper sx={{ p: 2.5 }} data-testid="home-top-customers-table-card">
        <Typography variant="h6" sx={{ mb: 1.5, fontWeight: 700 }} data-testid="home-top-customers-table-title">
          Top Customers
        </Typography>
        <TableContainer sx={{ overflowX: 'auto' }} data-testid="home-top-customers-table-container">
          <Table size="small" sx={{ minWidth: 620 }} data-testid="home-top-customers-table">
            <TableHead data-testid="home-top-customers-table-head">
              <TableRow data-testid="home-top-customers-table-head-row">
                <TableCell data-testid="home-top-customers-header-name">Customer Name</TableCell>
                <TableCell data-testid="home-top-customers-header-email">Email</TableCell>
                <TableCell data-testid="home-top-customers-header-total-spent">Total Spent</TableCell>
                <TableCell data-testid="home-top-customers-header-orders">Orders</TableCell>
                <TableCell data-testid="home-top-customers-header-details">Details</TableCell>
              </TableRow>
            </TableHead>
            <TableBody data-testid="home-top-customers-table-body">
              {topCustomers.map((customer, index) => (
                <TableRow key={customer.id} data-testid={`home-top-customers-row-${index}`}>
                  <TableCell data-testid={`home-top-customers-row-${index}-name`}>{customer.name}</TableCell>
                  <TableCell data-testid={`home-top-customers-row-${index}-email`}>{customer.email}</TableCell>
                  <TableCell data-testid={`home-top-customers-row-${index}-total-spent`}>{customer.totalSpent}</TableCell>
                  <TableCell data-testid={`home-top-customers-row-${index}-orders`}>{customer.ordersCount}</TableCell>
                  <TableCell>
                    <Tooltip title="Details">
                      <IconButton component={Link} to="/customers" size="small" data-testid={`home-top-customers-row-${index}-details-button`}>
                        <VisibilityOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  )
}
