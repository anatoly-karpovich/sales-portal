import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Radio,
  RadioGroup,
  Stack,
  Typography,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
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

  const formatFieldLabel = (field: string) => {
    if (field === '_id') return 'Id'
    return field
      .replace(/_/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\b\w/g, (char) => char.toUpperCase())
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ pr: 6, fontWeight: 700 }}>
        Export Data
        <IconButton aria-label="close" onClick={onClose} sx={{ position: 'absolute', right: 16, top: 12 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ px: 3, py: 2.5 }}>
        <Stack spacing={2.75}>
          <Stack spacing={1}>
            <Typography component="label" sx={{ fontWeight: 700 }}>
              File format: <Box component="span" sx={{ color: 'error.main' }}>*</Box>
            </Typography>
            <RadioGroup row value={format} onChange={(event) => setFormat(event.target.value as 'csv' | 'json')}>
              <FormControlLabel value="csv" control={<Radio />} label="CSV" />
              <FormControlLabel value="json" control={<Radio />} label="JSON" />
            </RadioGroup>
          </Stack>

          <Stack spacing={1}>
            <Typography component="label" sx={{ fontWeight: 700 }}>
              Export from: <Box component="span" sx={{ color: 'error.main' }}>*</Box>
            </Typography>
            <RadioGroup row value={exportFrom} onChange={(event) => setExportFrom(event.target.value as 'all' | 'filtered')}>
              <FormControlLabel value="filtered" control={<Radio />} label="Filtered" />
              <FormControlLabel value="all" control={<Radio />} label="All" />
            </RadioGroup>
          </Stack>

          <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1.5, px: 1.5, py: 1.25 }}>
            <Typography component="label" sx={{ fontWeight: 700 }}>
              Select fields to include: <Box component="span" sx={{ color: 'error.main' }}>*</Box>
            </Typography>
            <Stack spacing={0.25} sx={{ mt: 1 }}>
              <FormControlLabel control={<Checkbox checked={isAllSelected} onChange={toggleSelectAll} />} label="Select All" />
              {availableFields.map((value) => (
                <FormControlLabel
                  key={value}
                  control={<Checkbox checked={fields.includes(value)} onChange={() => toggleField(value)} />}
                  label={formatFieldLabel(value)}
                />
              ))}
            </Stack>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Box sx={{ flexGrow: 1 }} />
        <Button variant="contained" disabled={!fields.length || isSubmitting} onClick={() => void submit()}>
          {isSubmitting ? <CircularProgress size={18} color="inherit" /> : 'Download'}
        </Button>
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  )
}
