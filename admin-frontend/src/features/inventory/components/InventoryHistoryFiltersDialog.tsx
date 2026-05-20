import CloseIcon from '@mui/icons-material/Close'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import FilterAltOutlinedIcon from '@mui/icons-material/FilterAltOutlined'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
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
  TextField,
  Typography,
} from '@mui/material'
import { useState } from 'react'

type InventoryHistoryFiltersApplyPayload = {
  type: string[]
  fromDate: string
  toDate: string
}

type Props = {
  open: boolean
  title: string
  typeTitle: string
  dateFromLabel: string
  dateToLabel: string
  typeValues: string[]
  selectedType: string[]
  selectedFromDate: string
  selectedToDate: string
  onClose: () => void
  onApply: (values: InventoryHistoryFiltersApplyPayload) => void
}

type ExpandedAccordion = 'type' | 'date'

function toOptionTestId(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function InventoryHistoryFiltersDialog({
  open,
  title,
  typeTitle,
  dateFromLabel,
  dateToLabel,
  typeValues,
  selectedType,
  selectedFromDate,
  selectedToDate,
  onClose,
  onApply,
}: Props) {
  const [typeDraft, setTypeDraft] = useState<string[]>([])
  const [fromDateDraft, setFromDateDraft] = useState('')
  const [toDateDraft, setToDateDraft] = useState('')
  const [expandedAccordion, setExpandedAccordion] = useState<ExpandedAccordion>('type')

  const clearAllFilters = () => {
    setTypeDraft([])
    setFromDateDraft('')
    setToDateDraft('')
  }

  const applyFilters = () => {
    onApply({
      type: typeDraft,
      fromDate: fromDateDraft,
      toDate: toDateDraft,
    })
  }

  const toggleType = (value: string) => {
    setTypeDraft((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    )
  }

  const selectedDateCount = Number(Boolean(fromDateDraft)) + Number(Boolean(toDateDraft))

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      data-testid="inventory-history-filter-dialog"
      TransitionProps={{
        onEnter: () => {
          setTypeDraft(selectedType)
          setFromDateDraft(selectedFromDate)
          setToDateDraft(selectedToDate)
          setExpandedAccordion('type')
        },
      }}
    >
      <DialogTitle sx={{ pr: 6 }} data-testid="inventory-history-filter-dialog-title-section">
        <Stack
          direction="row"
          alignItems="center"
          spacing={1}
          data-testid="inventory-history-filter-dialog-title-row"
        >
          <FilterAltOutlinedIcon color="action" fontSize="small" />
          <Typography
            variant="h6"
            component="span"
            sx={{ fontWeight: 700 }}
            data-testid="inventory-history-filter-dialog-title-text"
          >
            {title}
          </Typography>
        </Stack>
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{ position: 'absolute', right: 16, top: 12 }}
          data-testid="inventory-history-filter-dialog-close-button"
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent
        dividers
        sx={{ px: 3, py: 2.5 }}
        data-testid="inventory-history-filter-dialog-content"
      >
        <Stack spacing={1.5} data-testid="inventory-history-filter-dialog-accordion-list">
          <Accordion
            disableGutters
            expanded={expandedAccordion === 'type'}
            onChange={() => setExpandedAccordion('type')}
            data-testid="inventory-history-filter-dialog-type-accordion"
            sx={{
              border: 1,
              borderColor: 'divider',
              borderRadius: 1.5,
              overflow: 'hidden',
              boxShadow: 'none',
              '&::before': { display: 'none' },
            }}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              sx={{
                px: 2,
                py: 1,
                minHeight: 0,
                '& .MuiAccordionSummary-content': { my: 0 },
              }}
              data-testid="inventory-history-filter-dialog-type-accordion-summary"
            >
              <Box
                sx={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  pr: 1,
                }}
              >
                <Typography sx={{ fontWeight: 600 }}>{typeTitle}</Typography>
                {typeDraft.length > 0 ? (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    data-testid="inventory-history-filter-dialog-type-selected-count"
                  >
                    {`${typeDraft.length} selected`}
                  </Typography>
                ) : null}
              </Box>
            </AccordionSummary>
            <AccordionDetails
              sx={{ px: 2, pt: 0.5, pb: 1.5 }}
              data-testid="inventory-history-filter-dialog-type-accordion-details"
            >
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                  columnGap: 2,
                }}
                data-testid="inventory-history-filter-dialog-type-options-list"
              >
                {typeValues.map((value) => (
                  <FormControlLabel
                    key={value}
                    control={
                      <Checkbox checked={typeDraft.includes(value)} onChange={() => toggleType(value)} />
                    }
                    label={value}
                    data-testid={`inventory-history-filter-dialog-type-option-${toOptionTestId(value)}-checkbox`}
                  />
                ))}
              </Box>
            </AccordionDetails>
          </Accordion>

          <Accordion
            disableGutters
            expanded={expandedAccordion === 'date'}
            onChange={() => setExpandedAccordion('date')}
            data-testid="inventory-history-filter-dialog-date-accordion"
            sx={{
              border: 1,
              borderColor: 'divider',
              borderRadius: 1.5,
              overflow: 'hidden',
              boxShadow: 'none',
              '&::before': { display: 'none' },
            }}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              sx={{
                px: 2,
                py: 1,
                minHeight: 0,
                '& .MuiAccordionSummary-content': { my: 0 },
              }}
              data-testid="inventory-history-filter-dialog-date-accordion-summary"
            >
              <Box
                sx={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  pr: 1,
                }}
              >
                <Typography sx={{ fontWeight: 600 }}>Date Range</Typography>
                {selectedDateCount > 0 ? (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    data-testid="inventory-history-filter-dialog-date-selected-count"
                  >
                    {`${selectedDateCount} selected`}
                  </Typography>
                ) : null}
              </Box>
            </AccordionSummary>
            <AccordionDetails
              sx={{ px: 2, pt: 0.5, pb: 1.5 }}
              data-testid="inventory-history-filter-dialog-date-accordion-details"
            >
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField
                  label={dateFromLabel}
                  type="date"
                  size="small"
                  value={fromDateDraft}
                  onChange={(event) => setFromDateDraft(event.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={{ flex: 1 }}
                  inputProps={{ 'data-testid': 'inventory-history-filter-dialog-from-date-field' }}
                  data-testid="inventory-history-filter-dialog-from-date-input"
                />
                <TextField
                  label={dateToLabel}
                  type="date"
                  size="small"
                  value={toDateDraft}
                  onChange={(event) => setToDateDraft(event.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={{ flex: 1 }}
                  inputProps={{ 'data-testid': 'inventory-history-filter-dialog-to-date-field' }}
                  data-testid="inventory-history-filter-dialog-to-date-input"
                />
              </Stack>
            </AccordionDetails>
          </Accordion>

        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }} data-testid="inventory-history-filter-dialog-actions">
        <Box sx={{ flexGrow: 1 }} />
        <Button
          variant="contained"
          onClick={applyFilters}
          data-testid="inventory-history-filter-dialog-apply-button"
        >
          Apply
        </Button>
        <Button
          onClick={clearAllFilters}
          data-testid="inventory-history-filter-dialog-clear-button"
        >
          Clear Filters
        </Button>
      </DialogActions>
    </Dialog>
  )
}
