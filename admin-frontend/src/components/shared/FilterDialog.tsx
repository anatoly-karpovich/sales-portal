import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Stack,
  Typography,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import FilterAltOutlinedIcon from '@mui/icons-material/FilterAltOutlined'
import { useState } from 'react'

type Props = {
  open: boolean
  title: string
  values: string[]
  selected: string[]
  onClose: () => void
  onApply: (values: string[]) => void
}

export function FilterDialog({ open, title, values, selected, onClose, onApply }: Props) {
  const [draft, setDraft] = useState<string[]>([])
  const toOptionTestId = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')

  const toggleValue = (value: string) => {
    setDraft((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    )
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      data-testid="filter-dialog"
      TransitionProps={{
        onEnter: () => setDraft(selected),
      }}
    >
      <DialogTitle sx={{ pr: 6 }} data-testid="filter-dialog-title-section">
        <Stack
          direction="row"
          alignItems="center"
          spacing={1}
          data-testid="filter-dialog-title-row"
        >
          <FilterAltOutlinedIcon color="action" fontSize="small" />
          <Typography
            variant="h6"
            component="span"
            sx={{ fontWeight: 700 }}
            data-testid="filter-dialog-title-text"
          >
            {title}
          </Typography>
        </Stack>
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{ position: 'absolute', right: 16, top: 12 }}
          data-testid="filter-dialog-close-button"
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent
        dividers
        sx={{ px: 3, py: 2, display: 'grid', placeItems: 'center' }}
        data-testid="filter-dialog-content"
      >
        <Stack
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            columnGap: 2,
            width: '100%',
            maxWidth: 320,
          }}
          data-testid="filter-dialog-options-list"
        >
          {values.map((value) => (
            <FormControlLabel
              key={value}
              control={
                <Checkbox checked={draft.includes(value)} onChange={() => toggleValue(value)} />
              }
              label={value}
              data-testid={`filter-dialog-option-${toOptionTestId(value)}-checkbox`}
            />
          ))}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }} data-testid="filter-dialog-actions">
        <Box sx={{ flexGrow: 1 }} />
        <Button
          variant="contained"
          onClick={() => onApply(draft)}
          data-testid="filter-dialog-apply-button"
        >
          Apply
        </Button>
        <Button onClick={() => setDraft([])} data-testid="filter-dialog-clear-button">
          Clear Filters
        </Button>
      </DialogActions>
    </Dialog>
  )
}
