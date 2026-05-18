import { Suspense, lazy, type ReactNode } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/app/layout/AppShell'
import { ProtectedRoute } from '@/app/router/ProtectedRoute'
import { PublicOnlyRoute } from '@/app/router/PublicOnlyRoute'
import { NotFoundPage } from '@/app/router/NotFoundPage'
import { RouteLoadingFallback } from '@/app/router/RouteLoadingFallback'

const LoginPage = lazy(async () => ({ default: (await import('@/features/auth/pages/LoginPage')).LoginPage }))
const HomePage = lazy(async () => ({ default: (await import('@/features/home/pages/HomePage')).HomePage }))
const OrdersPage = lazy(async () => ({ default: (await import('@/features/orders/pages/OrdersPage')).OrdersPage }))
const OrderCreatePage = lazy(async () => ({ default: (await import('@/features/orders/pages/OrderCreatePage')).OrderCreatePage }))
const OrderDetailsPage = lazy(async () => ({ default: (await import('@/features/orders/pages/OrderDetailsPage')).OrderDetailsPage }))
const ProductsPage = lazy(async () => ({ default: (await import('@/features/products/pages/ProductsPage')).ProductsPage }))
const ProductCreatePage = lazy(async () => ({ default: (await import('@/features/products/pages/ProductCreatePage')).ProductCreatePage }))
const ProductDetailsPage = lazy(async () => ({ default: (await import('@/features/products/pages/ProductDetailsPage')).ProductDetailsPage }))
const InventoryPage = lazy(async () => ({ default: (await import('@/features/inventory/pages/InventoryPage')).InventoryPage }))
const InventoryDetailsPage = lazy(async () => ({ default: (await import('@/features/inventory/pages/InventoryDetailsPage')).InventoryDetailsPage }))
const CategoriesPage = lazy(async () => ({ default: (await import('@/features/categories/pages/CategoriesPage')).CategoriesPage }))
const CustomersPage = lazy(async () => ({ default: (await import('@/features/customers/pages/CustomersPage')).CustomersPage }))
const CustomerCreatePage = lazy(async () => ({ default: (await import('@/features/customers/pages/CustomerCreatePage')).CustomerCreatePage }))
const CustomerDetailsPage = lazy(async () => ({ default: (await import('@/features/customers/pages/CustomerDetailsPage')).CustomerDetailsPage }))
const CustomerEditPage = lazy(async () => ({ default: (await import('@/features/customers/pages/CustomerEditPage')).CustomerEditPage }))
const ManagersPage = lazy(async () => ({ default: (await import('@/features/managers/pages/ManagersPage')).ManagersPage }))
const ManagerCreatePage = lazy(async () => ({ default: (await import('@/features/managers/pages/ManagerCreatePage')).ManagerCreatePage }))
const ManagerDetailsPage = lazy(async () => ({ default: (await import('@/features/managers/pages/ManagerDetailsPage')).ManagerDetailsPage }))

function ProtectedLayout() {
  return (
    <ProtectedRoute>
      <AppShell />
    </ProtectedRoute>
  )
}

function SuspendedRoute({ children }: { children: ReactNode }) {
  return <Suspense fallback={<RouteLoadingFallback />}>{children}</Suspense>
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <SuspendedRoute>
              <LoginPage />
            </SuspendedRoute>
          </PublicOnlyRoute>
        }
      />
      <Route element={<ProtectedLayout />}>
        <Route
          path="/home"
          element={
            <SuspendedRoute>
              <HomePage />
            </SuspendedRoute>
          }
        />
        <Route
          path="/orders/add"
          element={
            <SuspendedRoute>
              <OrderCreatePage />
            </SuspendedRoute>
          }
        />
        <Route
          path="/orders/:orderId"
          element={
            <SuspendedRoute>
              <OrderDetailsPage />
            </SuspendedRoute>
          }
        />
        <Route
          path="/orders"
          element={
            <SuspendedRoute>
              <OrdersPage />
            </SuspendedRoute>
          }
        />
        <Route
          path="/products/add"
          element={
            <SuspendedRoute>
              <ProductCreatePage />
            </SuspendedRoute>
          }
        />
        <Route
          path="/products/:productId/inventory"
          element={
            <SuspendedRoute>
              <InventoryDetailsPage />
            </SuspendedRoute>
          }
        />
        <Route
          path="/products/:productId"
          element={
            <SuspendedRoute>
              <ProductDetailsPage />
            </SuspendedRoute>
          }
        />
        <Route
          path="/products"
          element={
            <SuspendedRoute>
              <ProductsPage />
            </SuspendedRoute>
          }
        />
        <Route
          path="/inventory"
          element={
            <SuspendedRoute>
              <InventoryPage />
            </SuspendedRoute>
          }
        />
        <Route
          path="/categories"
          element={
            <SuspendedRoute>
              <CategoriesPage />
            </SuspendedRoute>
          }
        />
        <Route
          path="/customers/add"
          element={
            <SuspendedRoute>
              <CustomerCreatePage />
            </SuspendedRoute>
          }
        />
        <Route
          path="/customers/:customerId/edit"
          element={
            <SuspendedRoute>
              <CustomerEditPage />
            </SuspendedRoute>
          }
        />
        <Route
          path="/customers/:customerId"
          element={
            <SuspendedRoute>
              <CustomerDetailsPage />
            </SuspendedRoute>
          }
        />
        <Route
          path="/customers"
          element={
            <SuspendedRoute>
              <CustomersPage />
            </SuspendedRoute>
          }
        />
        <Route
          path="/managers/add"
          element={
            <SuspendedRoute>
              <ManagerCreatePage />
            </SuspendedRoute>
          }
        />
        <Route
          path="/managers/:managerId"
          element={
            <SuspendedRoute>
              <ManagerDetailsPage />
            </SuspendedRoute>
          }
        />
        <Route
          path="/managers"
          element={
            <SuspendedRoute>
              <ManagersPage />
            </SuspendedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
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

