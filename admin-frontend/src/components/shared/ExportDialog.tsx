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
  onSubmit: (payload: {
    format: 'csv' | 'json'
    exportFrom: 'all' | 'filtered'
    fields: string[]
  }) => Promise<void>
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
      setFields(defaultFields.filter((field) => availableFields.includes(field)))
      setIsSubmitting(false)
    }
  }, [availableFields, defaultFields, open])

  const selectedFieldsCount = useMemo(
    () => availableFields.filter((value) => fields.includes(value)).length,
    [availableFields, fields],
  )

  const isAllSelected = useMemo(
    () => availableFields.length > 0 && selectedFieldsCount === availableFields.length,
    [availableFields.length, selectedFieldsCount],
  )
  const isSelectAllIndeterminate =
    selectedFieldsCount > 0 && selectedFieldsCount < availableFields.length

  const toggleField = (value: string) => {
    setFields((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    )
  }

  const toggleSelectAll = () => {
    setFields(isAllSelected ? [] : [...availableFields])
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

  const toFieldTestId = (field: string) => field.toLowerCase().replace(/_/g, '-')

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" data-testid="export-dialog">
      <DialogTitle sx={{ pr: 6, fontWeight: 700 }} data-testid="export-dialog-title-section">
        Export Data
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{ position: 'absolute', right: 16, top: 12 }}
          data-testid="export-dialog-close-button"
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ px: 3, py: 2.5 }} data-testid="export-dialog-content">
        <Stack spacing={2.75}>
          <Stack spacing={1} data-testid="export-dialog-format-section">
            <Typography
              component="label"
              sx={{ fontWeight: 700 }}
              data-testid="export-dialog-format-label"
            >
              File format:{' '}
              <Box component="span" sx={{ color: 'error.main' }}>
                *
              </Box>
            </Typography>
            <RadioGroup
              row
              value={format}
              onChange={(event) => setFormat(event.target.value as 'csv' | 'json')}
              data-testid="export-dialog-format-options"
            >
              <FormControlLabel
                value="csv"
                control={<Radio />}
                label="CSV"
                data-testid="export-dialog-format-csv-option"
              />
              <FormControlLabel
                value="json"
                control={<Radio />}
                label="JSON"
                data-testid="export-dialog-format-json-option"
              />
            </RadioGroup>
          </Stack>

          <Stack spacing={1} data-testid="export-dialog-source-section">
            <Typography
              component="label"
              sx={{ fontWeight: 700 }}
              data-testid="export-dialog-source-label"
            >
              Export from:{' '}
              <Box component="span" sx={{ color: 'error.main' }}>
                *
              </Box>
            </Typography>
            <RadioGroup
              row
              value={exportFrom}
              onChange={(event) => setExportFrom(event.target.value as 'all' | 'filtered')}
              data-testid="export-dialog-source-options"
            >
              <FormControlLabel
                value="filtered"
                control={<Radio />}
                label="Filtered"
                data-testid="export-dialog-source-filtered-option"
              />
              <FormControlLabel
                value="all"
                control={<Radio />}
                label="All"
                data-testid="export-dialog-source-all-option"
              />
            </RadioGroup>
          </Stack>

          <Box
            sx={{ border: 1, borderColor: 'divider', borderRadius: 1.5, px: 1.5, py: 1.25 }}
            data-testid="export-dialog-fields-section"
          >
            <Typography
              component="label"
              sx={{ fontWeight: 700 }}
              data-testid="export-dialog-fields-label"
            >
              Select fields to include:{' '}
              <Box component="span" sx={{ color: 'error.main' }}>
                *
              </Box>
            </Typography>
            <Stack spacing={0.25} sx={{ mt: 1 }} data-testid="export-dialog-fields-options">
              <FormControlLabel
                control={
                  <Checkbox
                    checked={isAllSelected}
                    indeterminate={isSelectAllIndeterminate}
                    disabled={!availableFields.length || isSubmitting}
                    onChange={toggleSelectAll}
                    data-testid="export-dialog-fields-select-all-checkbox"
                  />
                }
                label="Select All"
                data-testid="export-dialog-fields-select-all-option"
              />
              {availableFields.map((value) => (
                <FormControlLabel
                  key={value}
                  control={
                    <Checkbox
                      checked={fields.includes(value)}
                      disabled={isSubmitting}
                      onChange={() => toggleField(value)}
                      data-testid={`export-dialog-field-${toFieldTestId(value)}-checkbox`}
                    />
                  }
                  label={formatFieldLabel(value)}
                  data-testid={`export-dialog-field-${toFieldTestId(value)}-option`}
                />
              ))}
            </Stack>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }} data-testid="export-dialog-actions">
        <Box sx={{ flexGrow: 1 }} />
        <Button
          variant="contained"
          disabled={!fields.length || isSubmitting}
          onClick={() => void submit()}
          data-testid="export-dialog-download-button"
        >
          {isSubmitting ? <CircularProgress size={18} color="inherit" /> : 'Download'}
        </Button>
        <Button onClick={onClose} data-testid="export-dialog-cancel-button">
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  )
}
