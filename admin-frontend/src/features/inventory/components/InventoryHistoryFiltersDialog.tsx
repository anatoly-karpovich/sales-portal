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
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useState } from 'react'

type InventoryHistoryFiltersApplyPayload = {
  type: string[]
  orderId: string
  fromDate: string
  toDate: string
  sortOrder: 'asc' | 'desc'
}

type Props = {
  open: boolean
  title: string
  typeTitle: string
  sortTitle: string
  orderIdLabel: string
  dateFromLabel: string
  dateToLabel: string
  sortNewestLabel: string
  sortOldestLabel: string
  typeValues: string[]
  selectedType: string[]
  selectedOrderId: string
  selectedFromDate: string
  selectedToDate: string
  selectedSortOrder: 'asc' | 'desc'
  onClose: () => void
  onApply: (values: InventoryHistoryFiltersApplyPayload) => void
}

type ExpandedAccordion = 'type' | 'order' | 'date' | 'sort'

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
  sortTitle,
  orderIdLabel,
  dateFromLabel,
  dateToLabel,
  sortNewestLabel,
  sortOldestLabel,
  typeValues,
  selectedType,
  selectedOrderId,
  selectedFromDate,
  selectedToDate,
  selectedSortOrder,
  onClose,
  onApply,
}: Props) {
  const [typeDraft, setTypeDraft] = useState<string[]>([])
  const [orderIdDraft, setOrderIdDraft] = useState('')
  const [fromDateDraft, setFromDateDraft] = useState('')
  const [toDateDraft, setToDateDraft] = useState('')
  const [sortOrderDraft, setSortOrderDraft] = useState<'asc' | 'desc'>('desc')
  const [expandedAccordion, setExpandedAccordion] = useState<ExpandedAccordion>('type')

  const clearAllFilters = () => {
    setTypeDraft([])
    setOrderIdDraft('')
    setFromDateDraft('')
    setToDateDraft('')
    setSortOrderDraft('desc')
  }

  const applyFilters = () => {
    onApply({
      type: typeDraft,
      orderId: orderIdDraft.trim(),
      fromDate: fromDateDraft,
      toDate: toDateDraft,
      sortOrder: sortOrderDraft,
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
          setOrderIdDraft(selectedOrderId)
          setFromDateDraft(selectedFromDate)
          setToDateDraft(selectedToDate)
          setSortOrderDraft(selectedSortOrder)
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
            expanded={expandedAccordion === 'order'}
            onChange={() => setExpandedAccordion('order')}
            data-testid="inventory-history-filter-dialog-order-accordion"
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
              data-testid="inventory-history-filter-dialog-order-accordion-summary"
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
                <Typography sx={{ fontWeight: 600 }}>{orderIdLabel}</Typography>
                {orderIdDraft ? (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    data-testid="inventory-history-filter-dialog-order-selected-count"
                  >
                    1 selected
                  </Typography>
                ) : null}
              </Box>
            </AccordionSummary>
            <AccordionDetails
              sx={{ px: 2, pt: 0.5, pb: 1.5 }}
              data-testid="inventory-history-filter-dialog-order-accordion-details"
            >
              <TextField
                label={orderIdLabel}
                size="small"
                value={orderIdDraft}
                onChange={(event) => setOrderIdDraft(event.target.value)}
                fullWidth
                inputProps={{ 'data-testid': 'inventory-history-filter-dialog-order-id-field' }}
                data-testid="inventory-history-filter-dialog-order-id-input"
              />
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

          <Accordion
            disableGutters
            expanded={expandedAccordion === 'sort'}
            onChange={() => setExpandedAccordion('sort')}
            data-testid="inventory-history-filter-dialog-sort-accordion"
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
              data-testid="inventory-history-filter-dialog-sort-accordion-summary"
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
                <Typography sx={{ fontWeight: 600 }}>{sortTitle}</Typography>
                {sortOrderDraft === 'asc' ? (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    data-testid="inventory-history-filter-dialog-sort-selected-count"
                  >
                    1 selected
                  </Typography>
                ) : null}
              </Box>
            </AccordionSummary>
            <AccordionDetails
              sx={{ px: 2, pt: 0.5, pb: 1.5 }}
              data-testid="inventory-history-filter-dialog-sort-accordion-details"
            >
              <TextField
                label={sortTitle}
                select
                size="small"
                value={sortOrderDraft}
                onChange={(event) => setSortOrderDraft(event.target.value as 'asc' | 'desc')}
                fullWidth
                SelectProps={{
                  inputProps: { 'data-testid': 'inventory-history-filter-dialog-sort-order-field' },
                }}
                data-testid="inventory-history-filter-dialog-sort-order-input"
              >
                <MenuItem
                  value="desc"
                  data-testid="inventory-history-filter-dialog-sort-order-desc-option"
                >
                  {sortNewestLabel}
                </MenuItem>
                <MenuItem
                  value="asc"
                  data-testid="inventory-history-filter-dialog-sort-order-asc-option"
                >
                  {sortOldestLabel}
                </MenuItem>
              </TextField>
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

