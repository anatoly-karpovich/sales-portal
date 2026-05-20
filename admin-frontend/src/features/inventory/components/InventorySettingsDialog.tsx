import { useMemo, useState } from 'react'
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import type { InventoryStatus, InventoryVariant } from '@/api/modules/inventory.api'
import { inventoryUiText } from '@/features/inventory/inventory.ui-text'

type InventorySettingsDialogProps = {
  open: boolean
  productId: string
  variant: InventoryVariant
  variantDisplayName: string
  manufacturer: string
  attributeLabels: string[]
  isSubmitting: boolean
  onClose: () => void
  onSubmit: (payload: {
    productId: string
    variantId: string
    lowStockThreshold?: number
    allowSellingOutOfStock?: boolean
  }) => Promise<void> | void
}

type DirectOrderOption = 'Allowed' | 'Blocked'

function getInventoryStatusColor(status: InventoryStatus) {
  if (status === 'Out Of Stock') return 'error'
  if (status === 'Low Stock') return 'warning'
  if (status === 'In Stock') return 'success'
  return 'default'
}

function resolveStockStatusAfterUpdate(available: number, threshold: number): InventoryStatus {
  if (available <= 0) return 'Out Of Stock'
  if (available <= threshold) return 'Low Stock'
  return 'In Stock'
}

export function InventorySettingsDialog({
  open,
  productId,
  variant,
  variantDisplayName,
  manufacturer,
  attributeLabels,
  isSubmitting,
  onClose,
  onSubmit,
}: InventorySettingsDialogProps) {
  const [thresholdInput, setThresholdInput] = useState(String(variant.lowStockThreshold))
  const [directOrder, setDirectOrder] = useState<DirectOrderOption>(
    variant.allowSellingOutOfStock ? 'Allowed' : 'Blocked',
  )

  const nextThreshold = useMemo(() => {
    const parsed = Number(thresholdInput.trim())
    if (!Number.isInteger(parsed) || parsed < 0) return null
    return parsed
  }, [thresholdInput])

  const nextAllowSelling = directOrder === 'Allowed'
  const thresholdChanged = nextThreshold !== null && nextThreshold !== variant.lowStockThreshold
  const directOrderChanged = nextAllowSelling !== variant.allowSellingOutOfStock
  const hasChanges = thresholdChanged || directOrderChanged
  const thresholdError = nextThreshold === null

  const stockStatusAfterUpdate =
    nextThreshold === null
      ? variant.stockStatus
      : resolveStockStatusAfterUpdate(variant.available, nextThreshold)

  const previewBorderColor = useMemo(() => {
    if (stockStatusAfterUpdate === 'Out Of Stock') return 'error.main'
    if (stockStatusAfterUpdate === 'Low Stock') return 'warning.main'
    return 'success.main'
  }, [stockStatusAfterUpdate])

  const handleClose = () => {
    if (isSubmitting) return
    onClose()
  }

  const handleSubmit = async () => {
    if (isSubmitting || thresholdError || !hasChanges || nextThreshold === null) return

    await onSubmit({
      productId,
      variantId: variant.variantId,
      lowStockThreshold: nextThreshold,
      allowSellingOutOfStock: nextAllowSelling,
    })
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="sm"
      disableEscapeKeyDown={isSubmitting}
      data-testid="inventory-settings-dialog"
    >
      <DialogTitle data-testid="inventory-settings-dialog-title-section">
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
          <Stack spacing={0.5}>
            <Typography
              variant="h6"
              sx={{ fontWeight: 700 }}
              data-testid="inventory-settings-dialog-title"
            >
              {inventoryUiText.detailsPage.labels.settingsTitle}
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              data-testid="inventory-settings-dialog-subtitle"
            >
              {variantDisplayName}
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              data-testid="inventory-settings-dialog-meta"
            >
              {[manufacturer, ...attributeLabels].join(' • ')}
            </Typography>
          </Stack>

          <Chip
            size="small"
            label={variant.stockStatus}
            color={getInventoryStatusColor(variant.stockStatus)}
            variant="outlined"
            data-testid="inventory-settings-dialog-stock-status-chip"
          />
        </Stack>
      </DialogTitle>

      <DialogContent dividers data-testid="inventory-settings-dialog-content">
        <Stack spacing={2}>
          <Box
            sx={{
              display: 'grid',
              gap: 1,
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' },
            }}
            data-testid="inventory-settings-dialog-current-state"
          >
            <Paper variant="outlined" sx={{ p: 1.25 }}>
              <Typography variant="caption" color="text.secondary">
                {inventoryUiText.detailsPage.labels.currentQuantity}
              </Typography>
              <Typography
                sx={{ mt: 0.5, fontWeight: 700 }}
                data-testid="inventory-settings-dialog-current-quantity"
              >
                {variant.quantity}
              </Typography>
            </Paper>
            <Paper variant="outlined" sx={{ p: 1.25 }}>
              <Typography variant="caption" color="text.secondary">
                {inventoryUiText.detailsPage.labels.currentReserved}
              </Typography>
              <Typography
                sx={{ mt: 0.5, fontWeight: 700 }}
                data-testid="inventory-settings-dialog-current-reserved"
              >
                {variant.reserved}
              </Typography>
            </Paper>
            <Paper variant="outlined" sx={{ p: 1.25 }}>
              <Typography variant="caption" color="text.secondary">
                {inventoryUiText.detailsPage.labels.currentAvailable}
              </Typography>
              <Typography
                sx={{ mt: 0.5, fontWeight: 700 }}
                data-testid="inventory-settings-dialog-current-available"
              >
                {variant.available}
              </Typography>
            </Paper>
          </Box>

          <TextField
            type="number"
            label={inventoryUiText.detailsPage.labels.lowStockThreshold}
            value={thresholdInput}
            onChange={(event) => setThresholdInput(event.target.value)}
            data-testid="inventory-settings-dialog-threshold"
            inputProps={{
              min: 0,
              step: 1,
              inputMode: 'numeric',
              'data-testid': 'inventory-settings-dialog-threshold-field',
            }}
            error={thresholdError}
            helperText={
              thresholdError ? inventoryUiText.detailsPage.validation.thresholdInvalid : ' '
            }
          />

          <TextField
            select
            label={inventoryUiText.detailsPage.labels.directOrder}
            value={directOrder}
            onChange={(event) => setDirectOrder(event.target.value as DirectOrderOption)}
            data-testid="inventory-settings-dialog-direct-order"
            SelectProps={{
              inputProps: { 'data-testid': 'inventory-settings-dialog-direct-order-field' },
            }}
          >
            <MenuItem
              value="Allowed"
              data-testid="inventory-settings-dialog-direct-order-option-allowed"
            >
              {inventoryUiText.detailsPage.labels.allowed}
            </MenuItem>
            <MenuItem
              value="Blocked"
              data-testid="inventory-settings-dialog-direct-order-option-blocked"
            >
              {inventoryUiText.detailsPage.labels.blocked}
            </MenuItem>
          </TextField>

          <Paper
            variant="outlined"
            sx={{ p: 1.5, borderColor: previewBorderColor }}
            data-testid="inventory-settings-dialog-preview"
          >
            <Typography sx={{ fontWeight: 700, mb: 1 }}>
              {inventoryUiText.detailsPage.labels.settingsPreview}
            </Typography>

            <Box
              sx={{
                display: 'grid',
                gap: 1,
                gridTemplateColumns: {
                  xs: 'repeat(2, minmax(0, 1fr))',
                  md: 'repeat(2, minmax(0, 1fr))',
                },
              }}
              data-testid="inventory-settings-dialog-preview-grid"
            >
              <Paper variant="outlined" sx={{ p: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  {inventoryUiText.detailsPage.labels.threshold}
                </Typography>
                <Typography
                  sx={{ mt: 0.25, fontWeight: 700 }}
                  data-testid="inventory-settings-dialog-preview-threshold"
                >
                  {variant.lowStockThreshold} → {nextThreshold ?? '—'}
                </Typography>
              </Paper>

              <Paper variant="outlined" sx={{ p: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  {inventoryUiText.detailsPage.labels.directOrder}
                </Typography>
                <Typography
                  sx={{ mt: 0.25, fontWeight: 700 }}
                  data-testid="inventory-settings-dialog-preview-direct-order"
                >
                  {variant.allowSellingOutOfStock
                    ? inventoryUiText.detailsPage.labels.allowed
                    : inventoryUiText.detailsPage.labels.blocked}{' '}
                  →{' '}
                  {nextAllowSelling
                    ? inventoryUiText.detailsPage.labels.allowed
                    : inventoryUiText.detailsPage.labels.blocked}
                </Typography>
              </Paper>
            </Box>

            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 1 }}
              data-testid="inventory-settings-dialog-preview-stock-status-after-update"
            >
              {inventoryUiText.detailsPage.labels.stockStatusAfterUpdate}: {stockStatusAfterUpdate}
            </Typography>
          </Paper>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }} data-testid="inventory-settings-dialog-actions">
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={isSubmitting || thresholdError || !hasChanges}
          data-testid="inventory-settings-dialog-save-button"
        >
          {inventoryUiText.detailsPage.actions.saveSettings}
        </Button>
        <Button
          onClick={handleClose}
          disabled={isSubmitting}
          data-testid="inventory-settings-dialog-cancel-button"
        >
          {inventoryUiText.detailsPage.actions.cancel}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
