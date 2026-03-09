import { Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, IconButton, Stack, Typography } from '@mui/material'
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

  const toggleValue = (value: string) => {
    setDraft((current) => (current.includes(value) ? current.filter((item) => item !== value) : [...current, value]))
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      TransitionProps={{
        onEnter: () => setDraft(selected),
      }}
    >
      <DialogTitle sx={{ pr: 6 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <FilterAltOutlinedIcon color="action" fontSize="small" />
          <Typography variant="h6" component="span" sx={{ fontWeight: 700 }}>
            {title}
          </Typography>
        </Stack>
        <IconButton aria-label="close" onClick={onClose} sx={{ position: 'absolute', right: 16, top: 12 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ px: 3, py: 2, display: 'grid', placeItems: 'center' }}>
        <Stack
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            columnGap: 2,
            width: '100%',
            maxWidth: 320,
          }}
        >
          {values.map((value) => (
            <FormControlLabel
              key={value}
              control={<Checkbox checked={draft.includes(value)} onChange={() => toggleValue(value)} />}
              label={value}
            />
          ))}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Box sx={{ flexGrow: 1 }} />
        <Button variant="contained" onClick={() => onApply(draft)}>
          Apply
        </Button>
        <Button onClick={() => setDraft([])}>Clear Filters</Button>
      </DialogActions>
    </Dialog>
  )
}
