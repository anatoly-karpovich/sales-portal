import {
  Autocomplete,
  Button,
  CircularProgress,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
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
  isManagerEditable: boolean
  isManagerActionPending: boolean
  isManagerEditMode: boolean
  isEmbedded?: boolean
  onStartManagerEdit: () => void
  onCancelManagerEdit: () => void
  onSaveManagerEdit: (managerId: string | null) => Promise<boolean> | boolean
}

const ASSIGNABLE_MANAGER_ROLES = new Set(['USER', 'ADMIN'])
const NOT_ASSIGNED_OPTION_ID = '__not_assigned__'

type ManagerSelectOption = {
  id: string
  label: string
  searchValue: string
}

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
  onSave: (managerId: string | null) => Promise<boolean> | boolean
}) {
  const [search, setSearch] = useState('')
  const [selectedManagerId, setSelectedManagerId] = useState(
    order.assignedManager?._id ?? NOT_ASSIGNED_OPTION_ID,
  )
  const managerOptionsQuery = useOrderManagerOptionsQuery(true)

  const availableOptions = useMemo<ManagerSelectOption[]>(() => {
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

    const sortedManagers = [...managerById.values()].sort((left, right) =>
      resolveManagerSortKey(left).localeCompare(resolveManagerSortKey(right)),
    )

    const managerOptions = sortedManagers.map((manager) => ({
      id: manager._id,
      label: formatManagerLabel(manager),
      searchValue: `${manager.firstName ?? ''} ${manager.lastName ?? ''} ${manager.username}`.toLocaleLowerCase(),
    }))

    return [
      {
        id: NOT_ASSIGNED_OPTION_ID,
        label: ordersUiText.detailsPage.history.notAssigned,
        searchValue: ordersUiText.detailsPage.history.notAssigned.toLocaleLowerCase(),
      },
      ...managerOptions,
    ]
  }, [managerOptionsQuery.data, order.assignedManager])

  const filteredOptions = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase()
    if (!normalizedSearch) return availableOptions
    return availableOptions.filter((option) => option.searchValue.includes(normalizedSearch))
  }, [availableOptions, search])

  const selectedOption = useMemo(
    () => availableOptions.find((option) => option.id === selectedManagerId) ?? null,
    [availableOptions, selectedManagerId],
  )
  const currentManagerId = order.assignedManager?._id ?? NOT_ASSIGNED_OPTION_ID
  const isSaveDisabled =
    (managerOptionsQuery.isLoading && availableOptions.length === 0) ||
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
          options={filteredOptions}
          value={selectedOption}
          openOnFocus
          disableClearable
          forcePopupIcon={false}
          loading={managerOptionsQuery.isLoading || managerOptionsQuery.isFetching}
          filterOptions={(options) => options}
          getOptionLabel={(option) => option.label}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          onClose={() => setSearch('')}
          onChange={(_, option) => {
            if (!option) return
            setSelectedManagerId(option.id)
            setSearch('')
          }}
          onInputChange={(_, value, reason) => {
            if (reason === 'reset') return
            setSearch(value)
          }}
          noOptionsText={
            <Typography
              data-testid="order-details-manager-inline-list-empty"
              color="text.secondary"
            >
              {ordersUiText.dialogs.details.assignManagerNoResults}
            </Typography>
          }
          loadingText={
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              data-testid="order-details-manager-inline-list-loading"
            >
              <CircularProgress size={16} />
              <Typography color="text.secondary">
                {ordersUiText.dialogs.details.assignManagerLoading}
              </Typography>
            </Stack>
          }
          renderOption={(props, option, state) => {
            const { key, ...optionProps } = props
            return (
              <li
                key={key}
                {...optionProps}
                data-testid={`order-details-manager-inline-item-${state.index}`}
              >
                <Typography sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                  {option.label}
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
            onClick={() =>
              void onSave(
                selectedManagerId === NOT_ASSIGNED_OPTION_ID ? null : selectedManagerId,
              )
            }
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
  isManagerEditable,
  isManagerActionPending,
  isManagerEditMode,
  isEmbedded = false,
  onStartManagerEdit,
  onCancelManagerEdit,
  onSaveManagerEdit,
}: OrderDetailsManagerSectionProps) {
  const isManagerAssigned = Boolean(order.assignedManager)
  const rootSx = { p: { xs: 2, md: 2.5 } }
  const content = (
    <Stack spacing={1.75}>
      <Stack
        direction="row"
        alignItems="center"
        gap={1}
      >
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          {ordersUiText.detailsPage.labels.assignedManager}
        </Typography>
        {!isManagerEditMode && isManagerEditable ? (
          <IconButton
            size="small"
            disabled={isManagerActionPending}
            onClick={onStartManagerEdit}
            data-testid="order-details-manager-edit-trigger"
            aria-label="Edit assigned manager"
          >
            <EditOutlinedIcon fontSize="small" />
          </IconButton>
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
            <Typography component="span">
              {assignedManagerDisplayValue}
            </Typography>
          </Button>
        ) : (
          <Typography data-testid="order-details-assigned-manager-value">
            {assignedManagerDisplayValue}
          </Typography>
        )
      ) : (
        <Stack spacing={0.5}>
          <Typography sx={{ fontWeight: 700 }} data-testid="order-details-assigned-manager-value">
            {ordersUiText.detailsPage.history.notAssigned}
          </Typography>
          <Typography color="text.secondary" variant="body2">
            {ordersUiText.detailsPage.placeholders.managerAutoAssignOnProcess}
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
