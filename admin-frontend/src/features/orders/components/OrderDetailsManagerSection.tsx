import {
  Autocomplete,
  Button,
  CircularProgress,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Manager } from '@/api/modules/managers.api'
import type { OrderDetails } from '@/api/modules/orders.api'
import { useOrderManagerOptionsQuery } from '@/features/orders/hooks/useOrdersQuery'
import { ordersUiText } from '@/features/orders/orders.ui-text'

type OrderDetailsManagerSectionProps = {
  order: OrderDetails
  assignedManagerDisplayValue: string
  isManagerAssigned: boolean
  isManagerActionPending: boolean
  isManagerEditMode: boolean
  isEmbedded?: boolean
  onStartManagerEdit: () => void
  onCancelManagerEdit: () => void
  onSaveManagerEdit: (managerId: string) => Promise<boolean> | boolean
  onUnassignManager: () => void
}

const ASSIGNABLE_MANAGER_ROLES = new Set(['USER', 'ADMIN'])

function resolveManagerName(manager: Manager) {
  const fullName = `${manager.firstName ?? ''} ${manager.lastName ?? ''}`.trim()
  return fullName || manager.username
}

function formatManagerLabel(manager: Manager) {
  return `${resolveManagerName(manager)} (${manager.username})`
}

function resolveManagerSortKey(manager: Manager) {
  const fullName = `${manager.firstName ?? ''} ${manager.lastName ?? ''}`.trim()
  return (fullName || manager.username).toLocaleLowerCase()
}

function isAssignableManager(user: Manager) {
  return user.roles.some((role) => ASSIGNABLE_MANAGER_ROLES.has(role))
}

function InlineManagerEditor({
  order,
  isSubmitting,
  onCancel,
  onSave,
}: {
  order: OrderDetails
  isSubmitting: boolean
  onCancel: () => void
  onSave: (managerId: string) => Promise<boolean> | boolean
}) {
  const [search, setSearch] = useState('')
  const [selectedManagerId, setSelectedManagerId] = useState(order.assignedManager?._id ?? '')
  const managerOptionsQuery = useOrderManagerOptionsQuery(true)

  const availableManagers = useMemo(() => {
    const managers = (managerOptionsQuery.data ?? []).filter(isAssignableManager)
    const managerById = new Map(managers.map((manager) => [manager._id, manager]))

    if (
      order.assignedManager &&
      typeof order.assignedManager._id === 'string' &&
      !managerById.has(order.assignedManager._id)
    ) {
      managerById.set(order.assignedManager._id, {
        _id: order.assignedManager._id,
        username: order.assignedManager.username,
        firstName: order.assignedManager.firstName,
        lastName: order.assignedManager.lastName,
        createdOn: order.assignedManager.createdOn,
        roles: order.assignedManager.roles ?? [],
      })
    }

    return [...managerById.values()].sort((left, right) =>
      resolveManagerSortKey(left).localeCompare(resolveManagerSortKey(right)),
    )
  }, [managerOptionsQuery.data, order.assignedManager])

  const filteredManagers = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase()
    if (!normalizedSearch) return availableManagers
    return availableManagers.filter((manager) => {
      const firstName = (manager.firstName ?? '').toLocaleLowerCase()
      const lastName = (manager.lastName ?? '').toLocaleLowerCase()
      const username = (manager.username ?? '').toLocaleLowerCase()
      return (
        firstName.includes(normalizedSearch) ||
        lastName.includes(normalizedSearch) ||
        username.includes(normalizedSearch)
      )
    })
  }, [availableManagers, search])

  const selectedManager = useMemo(
    () => availableManagers.find((manager) => manager._id === selectedManagerId) ?? null,
    [availableManagers, selectedManagerId],
  )
  const currentManagerId = order.assignedManager?._id ?? ''
  const isSaveDisabled =
    (managerOptionsQuery.isLoading && availableManagers.length === 0) ||
    isSubmitting ||
    !selectedManagerId ||
    selectedManagerId === currentManagerId

  return (
    <Paper
      variant="outlined"
      sx={{ p: 1.25, borderColor: 'divider' }}
      data-testid="order-details-manager-inline-edit-mode"
    >
      <Stack spacing={1.25}>
        <Autocomplete
          options={filteredManagers}
          value={selectedManager}
          openOnFocus
          disableClearable
          forcePopupIcon={false}
          loading={managerOptionsQuery.isLoading || managerOptionsQuery.isFetching}
          filterOptions={(options) => options}
          getOptionLabel={formatManagerLabel}
          isOptionEqualToValue={(option, value) => option._id === value._id}
          onClose={() => setSearch('')}
          onChange={(_, manager) => {
            if (!manager) return
            setSelectedManagerId(manager._id)
            setSearch('')
          }}
          onInputChange={(_, value, reason) => {
            if (reason === 'reset') return
            setSearch(value)
          }}
          noOptionsText={
            <Typography data-testid="order-details-manager-inline-list-empty" color="text.secondary">
              {ordersUiText.dialogs.details.assignManagerNoResults}
            </Typography>
          }
          loadingText={
            <Stack direction="row" spacing={1} alignItems="center" data-testid="order-details-manager-inline-list-loading">
              <CircularProgress size={16} />
              <Typography color="text.secondary">
                {ordersUiText.dialogs.details.assignManagerLoading}
              </Typography>
            </Stack>
          }
          renderOption={(props, manager, state) => {
            const { key, ...optionProps } = props
            return (
              <li key={key} {...optionProps} data-testid={`order-details-manager-inline-item-${state.index}`}>
                <Typography sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                  {formatManagerLabel(manager)}
                </Typography>
              </li>
            )
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              label={ordersUiText.dialogs.details.assignManagerSearchLabel}
              placeholder={ordersUiText.dialogs.details.assignManagerSearchPlaceholder}
              disabled={isSubmitting}
              data-testid="order-details-manager-inline-search-input"
              inputProps={{
                ...params.inputProps,
                'data-testid': 'order-details-manager-inline-search-input-field',
              }}
            />
          )}
        />

        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Button
            variant="contained"
            onClick={() => void onSave(selectedManagerId)}
            disabled={isSaveDisabled}
            data-testid="order-details-manager-inline-save-button"
          >
            {isSubmitting ? (
              <CircularProgress size={18} color="inherit" />
            ) : (
              ordersUiText.dialogs.details.assignManagerSave
            )}
          </Button>
          <Button
            variant="outlined"
            onClick={onCancel}
            disabled={isSubmitting}
            data-testid="order-details-manager-inline-cancel-button"
          >
            {ordersUiText.dialogs.cancel}
          </Button>
        </Stack>
      </Stack>
    </Paper>
  )
}

export function OrderDetailsManagerSection({
  order,
  assignedManagerDisplayValue,
  isManagerAssigned,
  isManagerActionPending,
  isManagerEditMode,
  isEmbedded = false,
  onStartManagerEdit,
  onCancelManagerEdit,
  onSaveManagerEdit,
  onUnassignManager,
}: OrderDetailsManagerSectionProps) {
  const rootSx = { p: { xs: 2, md: 2.5 } }
  const content = (
    <Stack spacing={1.75}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          {ordersUiText.detailsPage.labels.assignedManager}
        </Typography>
        {!isManagerEditMode ? (
          <Stack direction="row" spacing={1}>
            <Button
              variant="text"
              disabled={isManagerActionPending}
              onClick={onStartManagerEdit}
              data-testid={
                isManagerAssigned
                  ? 'order-details-manager-edit-trigger'
                  : 'order-details-manager-assign-trigger'
              }
              sx={{ textTransform: 'none' }}
            >
              {isManagerAssigned ? 'Change' : 'Assign'}
            </Button>
            {isManagerAssigned ? (
              <Button
                variant="text"
                color="error"
                disabled={isManagerActionPending}
                onClick={onUnassignManager}
                data-testid="order-details-manager-unassign-trigger"
                sx={{ textTransform: 'none' }}
              >
                Unassign
              </Button>
            ) : null}
          </Stack>
        ) : null}
      </Stack>

      {isManagerAssigned ? (
        typeof order.assignedManager?._id === 'string' && order.assignedManager._id.length > 0 ? (
          <Button
            component={Link}
            to={`/managers/${order.assignedManager._id}`}
            variant="text"
            sx={{
              px: 0,
              minWidth: 0,
              textTransform: 'none',
              textDecoration: 'underline',
              justifyContent: 'flex-start',
              alignSelf: 'flex-start',
            }}
            data-testid="order-details-assigned-manager-value"
          >
            <Typography component="span" sx={{ fontStyle: 'italic' }}>
              {assignedManagerDisplayValue}
            </Typography>
          </Button>
        ) : (
          <Typography sx={{ fontStyle: 'italic' }} data-testid="order-details-assigned-manager-value">
            {assignedManagerDisplayValue}
          </Typography>
        )
      ) : (
        <Stack spacing={0.5}>
          <Typography sx={{ fontWeight: 700 }} data-testid="order-details-assigned-manager-value">
            {ordersUiText.detailsPage.history.notAssigned}
          </Typography>
          <Typography color="text.secondary" variant="body2">
            Select manager before processing
          </Typography>
        </Stack>
      )}

      {isManagerEditMode ? (
        <InlineManagerEditor
          order={order}
          isSubmitting={isManagerActionPending}
          onCancel={onCancelManagerEdit}
          onSave={onSaveManagerEdit}
        />
      ) : null}
    </Stack>
  )

  if (isEmbedded) {
    return (
      <Stack sx={rootSx} data-testid="order-details-manager-section">
        {content}
      </Stack>
    )
  }

  return (
    <Paper sx={rootSx} data-testid="order-details-manager-section">
      {content}
    </Paper>
  )
}
