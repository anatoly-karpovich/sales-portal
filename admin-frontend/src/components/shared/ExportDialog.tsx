import { Button, Checkbox, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, FormLabel, Radio, RadioGroup, Stack } from '@mui/material'
import { useEffect, useMemo, useState } from 'react'

type Props = {
  open: boolean
  availableFields: string[]
  defaultFields: string[]
  onClose: () => void
  onSubmit: (payload: { format: 'csv' | 'json'; exportFrom: 'all' | 'filtered'; fields: string[] }) => Promise<void>
}

export function ExportDialog({ open, availableFields, defaultFields, onClose, onSubmit }: Props) {
  const [format, setFormat] = useState<'csv' | 'json'>('csv')
  const [exportFrom, setExportFrom] = useState<'all' | 'filtered'>('all')
  const [fields, setFields] = useState<string[]>(defaultFields)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setFormat('csv')
      setExportFrom('all')
      setFields(defaultFields)
      setIsSubmitting(false)
    }
  }, [open, defaultFields])

  const isAllSelected = useMemo(
    () => availableFields.length > 0 && availableFields.every((value) => fields.includes(value)),
    [availableFields, fields],
  )

  const toggleField = (value: string) => {
    setFields((current) => (current.includes(value) ? current.filter((item) => item !== value) : [...current, value]))
  }

  const toggleSelectAll = () => {
    setFields((current) => (current.length === availableFields.length ? [] : [...availableFields]))
  }

  const submit = async () => {
    if (!fields.length) return
    setIsSubmitting(true)
    try {
      await onSubmit({ format, exportFrom, fields })
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Export Data</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5}>
          <Stack spacing={1}>
            <FormLabel>File format</FormLabel>
            <RadioGroup row value={format} onChange={(event) => setFormat(event.target.value as 'csv' | 'json')}>
              <FormControlLabel value="csv" control={<Radio />} label="CSV" />
              <FormControlLabel value="json" control={<Radio />} label="JSON" />
            </RadioGroup>
          </Stack>

          <Stack spacing={1}>
            <FormLabel>Export from</FormLabel>
            <RadioGroup row value={exportFrom} onChange={(event) => setExportFrom(event.target.value as 'all' | 'filtered')}>
              <FormControlLabel value="all" control={<Radio />} label="All" />
              <FormControlLabel value="filtered" control={<Radio />} label="Filtered" />
            </RadioGroup>
          </Stack>

          <Stack spacing={1}>
            <FormControlLabel control={<Checkbox checked={isAllSelected} onChange={toggleSelectAll} />} label="Select All" />
            {availableFields.map((value) => (
              <FormControlLabel
                key={value}
                control={<Checkbox checked={fields.includes(value)} onChange={() => toggleField(value)} />}
                label={value}
              />
            ))}
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={!fields.length || isSubmitting} onClick={() => void submit()}>
          {isSubmitting ? <CircularProgress size={18} color="inherit" /> : 'Download'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
