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
import {
  INVENTORY_MANUAL_ADJUSTMENT_TYPES,
  type InventoryManualAdjustmentType,
  type InventoryStatus,
  type InventoryVariant,
} from '@/api/modules/inventory.api'
import { inventoryUiText } from '@/features/inventory/inventory.ui-text'

const MAX_COMMENT_LENGTH = 250

type InventoryAdjustDialogProps = {
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
    type: InventoryManualAdjustmentType
    quantity: number
    reason?: string
    comment?: string
  }) => Promise<void> | void
}

function getInventoryStatusColor(status: InventoryStatus) {
  if (status === 'Out Of Stock') return 'error'
  if (status === 'Low Stock') return 'warning'
  if (status === 'In Stock') return 'success'
  return 'default'
}

type AdjustmentPreview = {
  quantity: number | null
  quantityAfter: number
  quantityChange: number
  availableAfter: number
  errorMessage: string | null
}

function buildAdjustmentPreview(
  variant: InventoryVariant,
  type: InventoryManualAdjustmentType,
  quantityInput: string,
): AdjustmentPreview {
  const normalizedInput = quantityInput.trim()
  const quantity = normalizedInput.length > 0 ? Number(normalizedInput) : null

  if (quantity === null || !Number.isInteger(quantity) || quantity <= 0) {
    return {
      quantity,
      quantityAfter: variant.quantity,
      quantityChange: 0,
      availableAfter: variant.available,
      errorMessage: inventoryUiText.detailsPage.validation.quantityRequired,
    }
  }

  let quantityAfter = variant.quantity
  if (type === 'Manual Increase' || type === 'Return') {
    quantityAfter = variant.quantity + quantity
  } else if (type === 'Manual Decrease' || type === 'Damage') {
    quantityAfter = variant.quantity - quantity
  } else {
    quantityAfter = quantity
  }

  if (quantityAfter < 0) {
    return {
      quantity,
      quantityAfter,
      quantityChange: quantityAfter - variant.quantity,
      availableAfter: variant.available,
      errorMessage: inventoryUiText.detailsPage.validation.quantityNegative,
    }
  }

  if (quantityAfter < variant.reserved) {
    return {
      quantity,
      quantityAfter,
      quantityChange: quantityAfter - variant.quantity,
      availableAfter: Math.max(quantityAfter - variant.reserved, 0),
      errorMessage: inventoryUiText.detailsPage.validation.quantityLowerThanReserved,
    }
  }

  return {
    quantity,
    quantityAfter,
    quantityChange: quantityAfter - variant.quantity,
    availableAfter: Math.max(quantityAfter - variant.reserved, 0),
    errorMessage: null,
  }
}

export function InventoryAdjustDialog({
  open,
  productId,
  variant,
  variantDisplayName,
  manufacturer,
  attributeLabels,
  isSubmitting,
  onClose,
  onSubmit,
}: InventoryAdjustDialogProps) {
  const [type, setType] = useState<InventoryManualAdjustmentType>('Manual Increase')
  const [quantityInput, setQuantityInput] = useState('1')
  const [reason, setReason] = useState('')
  const [comment, setComment] = useState('')

  const preview = useMemo(
    () => buildAdjustmentPreview(variant, type, quantityInput),
    [quantityInput, type, variant],
  )
  const isCommentTooLong = comment.length > MAX_COMMENT_LENGTH

  const previewBorderColor = useMemo(() => {
    if (preview.errorMessage) return 'error.main'
    if (preview.availableAfter === 0) return 'error.main'
    if (preview.availableAfter <= variant.lowStockThreshold || preview.quantityChange < 0) {
      return 'warning.main'
    }
    return 'success.main'
  }, [preview, variant.lowStockThreshold])

  const handleClose = () => {
    if (isSubmitting) return
    onClose()
  }

  const handleSubmit = async () => {
    if (isSubmitting || preview.errorMessage || isCommentTooLong || preview.quantity === null) return

    const normalizedReason = reason.trim()
    const normalizedComment = comment.trim()

    await onSubmit({
      productId,
      variantId: variant.variantId,
      type,
      quantity: preview.quantity,
      reason: normalizedReason.length > 0 ? normalizedReason : undefined,
      comment: normalizedComment.length > 0 ? normalizedComment : undefined,
    })
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="sm"
      disableEscapeKeyDown={isSubmitting}
      data-testid="inventory-adjust-dialog"
    >
      <DialogTitle data-testid="inventory-adjust-dialog-title-section">
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
          <Stack spacing={0.5}>
            <Typography variant="h6" sx={{ fontWeight: 700 }} data-testid="inventory-adjust-dialog-title">
              {inventoryUiText.detailsPage.labels.adjustTitle}
            </Typography>
            <Typography variant="body2" color="text.secondary" data-testid="inventory-adjust-dialog-subtitle">
              {variantDisplayName}
            </Typography>
            <Typography variant="body2" color="text.secondary" data-testid="inventory-adjust-dialog-meta">
              {[manufacturer, ...attributeLabels].join(' • ')}
            </Typography>
          </Stack>

          <Chip
            size="small"
            label={variant.stockStatus}
            color={getInventoryStatusColor(variant.stockStatus)}
            variant="outlined"
            data-testid="inventory-adjust-dialog-stock-status-chip"
          />
        </Stack>
      </DialogTitle>

      <DialogContent dividers data-testid="inventory-adjust-dialog-content">
        <Stack spacing={2}>
          <Box
            sx={{
              display: 'grid',
              gap: 1,
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' },
            }}
            data-testid="inventory-adjust-dialog-current-state"
          >
            <Paper variant="outlined" sx={{ p: 1.25 }}>
              <Typography variant="caption" color="text.secondary">
                {inventoryUiText.detailsPage.labels.currentQuantity}
              </Typography>
              <Typography sx={{ mt: 0.5, fontWeight: 700 }} data-testid="inventory-adjust-dialog-current-quantity">
                {variant.quantity}
              </Typography>
            </Paper>
            <Paper variant="outlined" sx={{ p: 1.25 }}>
              <Typography variant="caption" color="text.secondary">
                {inventoryUiText.detailsPage.labels.currentReserved}
              </Typography>
              <Typography sx={{ mt: 0.5, fontWeight: 700 }} data-testid="inventory-adjust-dialog-current-reserved">
                {variant.reserved}
              </Typography>
            </Paper>
            <Paper variant="outlined" sx={{ p: 1.25 }}>
              <Typography variant="caption" color="text.secondary">
                {inventoryUiText.detailsPage.labels.currentAvailable}
              </Typography>
              <Typography sx={{ mt: 0.5, fontWeight: 700 }} data-testid="inventory-adjust-dialog-current-available">
                {variant.available}
              </Typography>
            </Paper>
          </Box>

          <TextField
            select
            label={inventoryUiText.detailsPage.labels.adjustmentType}
            value={type}
            onChange={(event) => setType(event.target.value as InventoryManualAdjustmentType)}
            data-testid="inventory-adjust-dialog-type"
            SelectProps={{ inputProps: { 'data-testid': 'inventory-adjust-dialog-type-field' } }}
          >
            {INVENTORY_MANUAL_ADJUSTMENT_TYPES.map((value) => (
              <MenuItem
                key={value}
                value={value}
                data-testid={`inventory-adjust-dialog-type-option-${value.toLowerCase().replaceAll(' ', '-')}`}
              >
                {value}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            type="number"
            label={
              type === 'Manual Correction'
                ? inventoryUiText.detailsPage.labels.newQuantity
                : inventoryUiText.detailsPage.labels.adjustmentAmount
            }
            value={quantityInput}
            onChange={(event) => setQuantityInput(event.target.value)}
            data-testid="inventory-adjust-dialog-quantity"
            inputProps={{
              min: 1,
              step: 1,
              inputMode: 'numeric',
              'data-testid': 'inventory-adjust-dialog-quantity-field',
            }}
            error={Boolean(preview.errorMessage)}
            helperText={preview.errorMessage || ' '}
          />

          <TextField
            label={inventoryUiText.detailsPage.labels.reason}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder={inventoryUiText.detailsPage.placeholders.reason}
            data-testid="inventory-adjust-dialog-reason"
            inputProps={{ 'data-testid': 'inventory-adjust-dialog-reason-field' }}
          />

          <TextField
            label={inventoryUiText.detailsPage.labels.comment}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder={inventoryUiText.detailsPage.placeholders.comment}
            data-testid="inventory-adjust-dialog-comment"
            multiline
            minRows={3}
            error={isCommentTooLong}
            helperText={
              isCommentTooLong
                ? inventoryUiText.detailsPage.validation.commentTooLong
                : `${inventoryUiText.detailsPage.labels.commentLimit} (${comment.length}/${MAX_COMMENT_LENGTH})`
            }
            inputProps={{
              maxLength: MAX_COMMENT_LENGTH,
              'data-testid': 'inventory-adjust-dialog-comment-field',
            }}
          />

          <Paper
            variant="outlined"
            sx={{ p: 1.5, borderColor: previewBorderColor }}
            data-testid="inventory-adjust-dialog-preview"
          >
            <Typography sx={{ fontWeight: 700, mb: 1 }}>
              {inventoryUiText.detailsPage.labels.resultPreview}
            </Typography>
            {preview.errorMessage ? (
              <Typography color="error.main" data-testid="inventory-adjust-dialog-preview-error">
                {preview.errorMessage}
              </Typography>
            ) : (
              <Box
                sx={{
                  display: 'grid',
                  gap: 1,
                  gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' },
                }}
                data-testid="inventory-adjust-dialog-preview-grid"
              >
                <Paper variant="outlined" sx={{ p: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    {inventoryUiText.detailsPage.labels.quantity}
                  </Typography>
                  <Typography sx={{ mt: 0.25, fontWeight: 700 }} data-testid="inventory-adjust-dialog-preview-quantity">
                    {variant.quantity} → {preview.quantityAfter}
                  </Typography>
                </Paper>
                <Paper variant="outlined" sx={{ p: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    {inventoryUiText.detailsPage.labels.available}
                  </Typography>
                  <Typography sx={{ mt: 0.25, fontWeight: 700 }} data-testid="inventory-adjust-dialog-preview-available">
                    {variant.available} → {preview.availableAfter}
                  </Typography>
                </Paper>
                <Paper variant="outlined" sx={{ p: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    {inventoryUiText.detailsPage.labels.reserved}
                  </Typography>
                  <Typography sx={{ mt: 0.25, fontWeight: 700 }} data-testid="inventory-adjust-dialog-preview-reserved">
                    {variant.reserved} → {variant.reserved}
                  </Typography>
                </Paper>
                <Paper variant="outlined" sx={{ p: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    {inventoryUiText.detailsPage.labels.change}
                  </Typography>
                  <Typography sx={{ mt: 0.25, fontWeight: 700 }} data-testid="inventory-adjust-dialog-preview-change">
                    {preview.quantityChange > 0 ? '+' : ''}
                    {preview.quantityChange}
                  </Typography>
                </Paper>
              </Box>
            )}
          </Paper>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }} data-testid="inventory-adjust-dialog-actions">
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={Boolean(preview.errorMessage) || isCommentTooLong || isSubmitting}
          data-testid="inventory-adjust-dialog-save-button"
        >
          {inventoryUiText.detailsPage.actions.saveAdjustment}
        </Button>
        <Button onClick={handleClose} disabled={isSubmitting} data-testid="inventory-adjust-dialog-cancel-button">
          {inventoryUiText.detailsPage.actions.cancel}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
