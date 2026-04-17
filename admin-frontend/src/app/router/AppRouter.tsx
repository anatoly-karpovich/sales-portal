import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/app/layout/AppShell'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { HomePage } from '@/features/home/pages/HomePage'
import { OrdersPage } from '@/features/orders/pages/OrdersPage'
import { OrderDetailsPage } from '@/features/orders/pages/OrderDetailsPage'
import { ProductsPage } from '@/features/products/pages/ProductsPage'
import { ProductCreatePage } from '@/features/products/pages/ProductCreatePage'
import { ProductEditPage } from '@/features/products/pages/ProductEditPage'
import { CustomersPage } from '@/features/customers/pages/CustomersPage'
import { CustomerCreatePage } from '@/features/customers/pages/CustomerCreatePage'
import { CustomerDetailsPage } from '@/features/customers/pages/CustomerDetailsPage'
import { CustomerEditPage } from '@/features/customers/pages/CustomerEditPage'
import { ManagersPage } from '@/features/users/pages/ManagersPage'
import { ProtectedRoute } from '@/app/router/ProtectedRoute'
import { PublicOnlyRoute } from '@/app/router/PublicOnlyRoute'

function ProtectedLayout() {
  return (
    <ProtectedRoute>
      <AppShell />
    </ProtectedRoute>
  )
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <LoginPage />
          </PublicOnlyRoute>
        }
      />
      <Route element={<ProtectedLayout />}>
        <Route path="/home" element={<HomePage />} />
        <Route path="/orders/:orderId" element={<OrderDetailsPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/products/add" element={<ProductCreatePage />} />
        <Route path="/products/:productId/edit" element={<ProductEditPage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/customers/add" element={<CustomerCreatePage />} />
        <Route path="/customers/:customerId/edit" element={<CustomerEditPage />} />
        <Route path="/customers/:customerId" element={<CustomerDetailsPage />} />
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/managers" element={<ManagersPage />} />
        <Route path="/" element={<Navigate to="/home" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export function AppRouter() {
  return (
    <HashRouter>
      <AppRoutes />
    </HashRouter>
  )
}
