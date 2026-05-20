import AddRoundedIcon from '@mui/icons-material/AddRounded'
import RemoveRoundedIcon from '@mui/icons-material/RemoveRounded'
import { IconButton, Stack, TextField } from '@mui/material'

type OrderProductQuantityControlProps = {
  value: number
  min: number
  max: number
  disabled?: boolean
  readOnly?: boolean
  onChange?: (value: number) => void
  testIdPrefix: string
}

function clampQuantity(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export function OrderProductQuantityControl({
  value,
  min,
  max,
  disabled = false,
  readOnly = false,
  onChange,
  testIdPrefix,
}: OrderProductQuantityControlProps) {
  const isControlDisabled = disabled || readOnly || !onChange
  const canIncrease = !isControlDisabled && value < max
  const canDecrease = !isControlDisabled && value > min

  const handleIncrease = () => {
    if (!canIncrease || !onChange) return
    onChange(clampQuantity(value + 1, min, max))
  }

  const handleDecrease = () => {
    if (!canDecrease || !onChange) return
    onChange(clampQuantity(value - 1, min, max))
  }

  const handleInputChange = (nextRawValue: string) => {
    if (isControlDisabled || !onChange) return
    if (!nextRawValue.trim()) return
    const parsed = Number(nextRawValue)
    if (!Number.isFinite(parsed)) return
    onChange(clampQuantity(Math.round(parsed), min, max))
  }

  return (
    <Stack
      direction="row"
      spacing={0.75}
      alignItems="center"
      onClick={(event) => {
        event.stopPropagation()
      }}
      onMouseDown={(event) => {
        event.stopPropagation()
      }}
      onPointerDown={(event) => {
        event.stopPropagation()
      }}
      data-testid={`${testIdPrefix}-quantity-control`}
    >
      <IconButton
        size="small"
        onClick={handleDecrease}
        disabled={!canDecrease}
        data-testid={`${testIdPrefix}-quantity-decrease-button`}
      >
        <RemoveRoundedIcon fontSize="small" />
      </IconButton>

      <TextField
        type="number"
        size="small"
        value={value}
        onChange={(event) => handleInputChange(event.target.value)}
        disabled={isControlDisabled}
        sx={{
          width: 62,
          '& .MuiInputBase-input': {
            textAlign: 'center',
            px: 0.5,
          },
          '& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button':
            {
              appearance: 'none',
              margin: 0,
            },
          '& input[type=number]': {
            MozAppearance: 'textfield',
          },
        }}
        data-testid={`${testIdPrefix}-quantity-input`}
        inputProps={{
          min,
          max,
          step: 1,
          readOnly: isControlDisabled,
          'data-testid': `${testIdPrefix}-quantity-input-field`,
        }}
      />

      <IconButton
        size="small"
        onClick={handleIncrease}
        disabled={!canIncrease}
        data-testid={`${testIdPrefix}-quantity-increase-button`}
      >
        <AddRoundedIcon fontSize="small" />
      </IconButton>
    </Stack>
  )
}
