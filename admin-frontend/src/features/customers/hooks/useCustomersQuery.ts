import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createCustomer,
  deleteCustomer,
  exportCustomers,
  getCustomerById,
  getCustomerOrders,
  getCustomers,
  updateCustomer,
  type CustomerExportPayload,
  type CustomersQuery,
  type CustomerUpsertPayload,
} from '@/api/modules/customers.api'
import { customersQueryKeys } from '@/features/customers/hooks/customersQueryKeys'

export function useCustomersQuery(query: CustomersQuery) {
  return useQuery({
    queryKey: customersQueryKeys.list(query),
    queryFn: () => getCustomers(query),
    placeholderData: (previousData) => previousData,
  })
}

export function useCustomersExportMutation() {
  return useMutation({
    mutationFn: (payload: CustomerExportPayload) => exportCustomers(payload),
  })
}

export function useCustomerQuery(customerId: string, enabled = true) {
  return useQuery({
    queryKey: customersQueryKeys.detail(customerId),
    queryFn: () => getCustomerById(customerId),
    enabled,
  })
}

export function useCustomerOrdersQuery(customerId: string, enabled = true) {
  return useQuery({
    queryKey: customersQueryKeys.orderList(customerId),
    queryFn: () => getCustomerOrders(customerId),
    enabled,
  })
}

export function useCreateCustomerMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CustomerUpsertPayload) => createCustomer(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: customersQueryKeys.all })
    },
  })
}

export function useUpdateCustomerMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ customerId, payload }: { customerId: string; payload: CustomerUpsertPayload }) =>
      updateCustomer(customerId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: customersQueryKeys.all })
    },
  })
}

export function useDeleteCustomerMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (customerId: string) => deleteCustomer(customerId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: customersQueryKeys.all })
    },
  })
}
