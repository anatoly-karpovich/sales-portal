import { Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Stack } from '@mui/material'
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
      <DialogTitle>{title}</DialogTitle>
      <DialogContent dividers>
        <Stack>
          {values.map((value) => (
            <FormControlLabel
              key={value}
              control={<Checkbox checked={draft.includes(value)} onChange={() => toggleValue(value)} />}
              label={value}
            />
          ))}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setDraft([])}>Clear</Button>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={() => onApply(draft)}>
          Apply
        </Button>
      </DialogActions>
    </Dialog>
  )
}
