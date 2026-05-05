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
import { useMemo, useState } from 'react'

type ProductsFiltersApplyPayload = {
  manufacturer: string[]
  status: string[]
  minPrice: number | null
  maxPrice: number | null
}

type Props = {
  open: boolean
  title: string
  manufacturersTitle: string
  statusTitle: string
  priceTitle: string
  minPriceLabel: string
  maxPriceLabel: string
  invalidPriceRangeText: string
  manufacturerValues: string[]
  selectedManufacturer: string[]
  statusValues: string[]
  selectedStatus: string[]
  selectedMinPrice: number | null
  selectedMaxPrice: number | null
  onClose: () => void
  onApply: (values: ProductsFiltersApplyPayload) => void
}

type ExpandedAccordion = 'manufacturer' | 'status' | 'price'
type StringArrayStateSetter = (value: string[] | ((prev: string[]) => string[])) => void

const PRICE_INPUT_PATTERN = /^(?:\d+(?:\.\d*)?)?$/

function toOptionTestId(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

function parsePriceInput(value: string): number | null | 'invalid' {
  const normalized = value.trim()
  if (!normalized) return null

  if (!/^\d+(?:\.\d+)?$/.test(normalized)) {
    return 'invalid'
  }

  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : 'invalid'
}

export function ProductsFiltersDialog({
  open,
  title,
  manufacturersTitle,
  statusTitle,
  priceTitle,
  minPriceLabel,
  maxPriceLabel,
  invalidPriceRangeText,
  manufacturerValues,
  selectedManufacturer,
  statusValues,
  selectedStatus,
  selectedMinPrice,
  selectedMaxPrice,
  onClose,
  onApply,
}: Props) {
  const [manufacturerDraft, setManufacturerDraft] = useState<string[]>([])
  const [statusDraft, setStatusDraft] = useState<string[]>([])
  const [minPriceDraft, setMinPriceDraft] = useState('')
  const [maxPriceDraft, setMaxPriceDraft] = useState('')
  const [expandedAccordion, setExpandedAccordion] = useState<ExpandedAccordion>('manufacturer')

  const parsedMinPrice = useMemo(() => parsePriceInput(minPriceDraft), [minPriceDraft])
  const parsedMaxPrice = useMemo(() => parsePriceInput(maxPriceDraft), [maxPriceDraft])

  const hasInvalidPriceInput = parsedMinPrice === 'invalid' || parsedMaxPrice === 'invalid'
  const hasInvalidPriceRange =
    typeof parsedMinPrice === 'number' &&
    typeof parsedMaxPrice === 'number' &&
    parsedMinPrice > parsedMaxPrice
  const hasPriceValidationError = hasInvalidPriceInput || hasInvalidPriceRange
  const selectedPriceFiltersCount = (minPriceDraft ? 1 : 0) + (maxPriceDraft ? 1 : 0)

  const toggleValue = (
    value: string,
    currentValues: string[],
    setValues: StringArrayStateSetter,
  ) => {
    setValues(
      currentValues.includes(value)
        ? currentValues.filter((item) => item !== value)
        : [...currentValues, value],
    )
  }

  const clearAllFilters = () => {
    setManufacturerDraft([])
    setStatusDraft([])
    setMinPriceDraft('')
    setMaxPriceDraft('')
  }

  const applyFilters = () => {
    if (hasPriceValidationError) return

    onApply({
      manufacturer: manufacturerDraft,
      status: statusDraft,
      minPrice: parsedMinPrice === null ? null : parsedMinPrice,
      maxPrice: parsedMaxPrice === null ? null : parsedMaxPrice,
    })
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      data-testid="products-list-filter-dialog"
      TransitionProps={{
        onEnter: () => {
          setManufacturerDraft(selectedManufacturer)
          setStatusDraft(selectedStatus)
          setMinPriceDraft(selectedMinPrice === null ? '' : String(selectedMinPrice))
          setMaxPriceDraft(selectedMaxPrice === null ? '' : String(selectedMaxPrice))
          setExpandedAccordion('manufacturer')
        },
      }}
    >
      <DialogTitle sx={{ pr: 6 }} data-testid="products-list-filter-dialog-title-section">
        <Stack
          direction="row"
          alignItems="center"
          spacing={1}
          data-testid="products-list-filter-dialog-title-row"
        >
          <FilterAltOutlinedIcon color="action" fontSize="small" />
          <Typography
            variant="h6"
            component="span"
            sx={{ fontWeight: 700 }}
            data-testid="products-list-filter-dialog-title-text"
          >
            {title}
          </Typography>
        </Stack>
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{ position: 'absolute', right: 16, top: 12 }}
          data-testid="products-list-filter-dialog-close-button"
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ px: 3, py: 2.5 }} data-testid="products-list-filter-dialog-content">
        <Stack spacing={1.5} data-testid="products-list-filter-dialog-accordion-list">
          <Accordion
            disableGutters
            expanded={expandedAccordion === 'manufacturer'}
            onChange={() => setExpandedAccordion('manufacturer')}
            data-testid="products-list-filter-dialog-manufacturer-accordion"
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
              data-testid="products-list-filter-dialog-manufacturer-accordion-summary"
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
                <Typography sx={{ fontWeight: 600 }}>{manufacturersTitle}</Typography>
                {manufacturerDraft.length > 0 ? (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    data-testid="products-list-filter-dialog-manufacturer-selected-count"
                  >
                    {`${manufacturerDraft.length} selected`}
                  </Typography>
                ) : null}
              </Box>
            </AccordionSummary>
            <AccordionDetails
              sx={{ px: 2, pt: 0.5, pb: 1.5 }}
              data-testid="products-list-filter-dialog-manufacturer-accordion-details"
            >
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                  columnGap: 2,
                }}
                data-testid="products-list-filter-dialog-manufacturer-options-list"
              >
                {manufacturerValues.map((value) => (
                  <FormControlLabel
                    key={value}
                    control={
                      <Checkbox
                        checked={manufacturerDraft.includes(value)}
                        onChange={() =>
                          toggleValue(value, manufacturerDraft, setManufacturerDraft)
                        }
                      />
                    }
                    label={value}
                    data-testid={`products-list-filter-dialog-manufacturer-option-${toOptionTestId(value)}-checkbox`}
                  />
                ))}
              </Box>
            </AccordionDetails>
          </Accordion>

          <Accordion
            disableGutters
            expanded={expandedAccordion === 'status'}
            onChange={() => setExpandedAccordion('status')}
            data-testid="products-list-filter-dialog-status-accordion"
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
              data-testid="products-list-filter-dialog-status-accordion-summary"
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
                <Typography sx={{ fontWeight: 600 }}>{statusTitle}</Typography>
                {statusDraft.length > 0 ? (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    data-testid="products-list-filter-dialog-status-selected-count"
                  >
                    {`${statusDraft.length} selected`}
                  </Typography>
                ) : null}
              </Box>
            </AccordionSummary>
            <AccordionDetails
              sx={{ px: 2, pt: 0.5, pb: 1.5 }}
              data-testid="products-list-filter-dialog-status-accordion-details"
            >
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                  columnGap: 2,
                }}
                data-testid="products-list-filter-dialog-status-options-list"
              >
                {statusValues.map((value) => (
                  <FormControlLabel
                    key={value}
                    control={
                      <Checkbox
                        checked={statusDraft.includes(value)}
                        onChange={() => toggleValue(value, statusDraft, setStatusDraft)}
                      />
                    }
                    label={value}
                    data-testid={`products-list-filter-dialog-status-option-${toOptionTestId(value)}-checkbox`}
                  />
                ))}
              </Box>
            </AccordionDetails>
          </Accordion>

          <Accordion
            disableGutters
            expanded={expandedAccordion === 'price'}
            onChange={() => setExpandedAccordion('price')}
            data-testid="products-list-filter-dialog-price-accordion"
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
              data-testid="products-list-filter-dialog-price-accordion-summary"
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
                <Typography sx={{ fontWeight: 600 }}>{priceTitle}</Typography>
                {minPriceDraft || maxPriceDraft ? (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    data-testid="products-list-filter-dialog-price-selected-count"
                  >
                    {`${selectedPriceFiltersCount} selected`}
                  </Typography>
                ) : null}
              </Box>
            </AccordionSummary>
            <AccordionDetails
              sx={{ px: 2, pt: 0.5, pb: 1.5 }}
              data-testid="products-list-filter-dialog-price-accordion-details"
            >
              <Stack spacing={1.5} data-testid="products-list-filter-dialog-price-fields">
                <TextField
                  fullWidth
                  label={minPriceLabel}
                  value={minPriceDraft}
                  onChange={(event) => {
                    const value = event.target.value.trim()
                    if (PRICE_INPUT_PATTERN.test(value)) {
                      setMinPriceDraft(value)
                    }
                  }}
                  error={hasPriceValidationError}
                  helperText={hasPriceValidationError ? invalidPriceRangeText : ' '}
                  data-testid="products-list-filter-dialog-price-min"
                  inputProps={{
                    inputMode: 'decimal',
                    'data-testid': 'products-list-filter-dialog-price-min-field',
                  }}
                />
                <TextField
                  fullWidth
                  label={maxPriceLabel}
                  value={maxPriceDraft}
                  onChange={(event) => {
                    const value = event.target.value.trim()
                    if (PRICE_INPUT_PATTERN.test(value)) {
                      setMaxPriceDraft(value)
                    }
                  }}
                  error={hasPriceValidationError}
                  helperText={hasPriceValidationError ? invalidPriceRangeText : ' '}
                  data-testid="products-list-filter-dialog-price-max"
                  inputProps={{
                    inputMode: 'decimal',
                    'data-testid': 'products-list-filter-dialog-price-max-field',
                  }}
                />
              </Stack>
            </AccordionDetails>
          </Accordion>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }} data-testid="products-list-filter-dialog-actions">
        <Box sx={{ flexGrow: 1 }} />
        <Button
          variant="contained"
          onClick={applyFilters}
          disabled={hasPriceValidationError}
          data-testid="products-list-filter-dialog-apply-button"
        >
          Apply
        </Button>
        <Button
          onClick={clearAllFilters}
          data-testid="products-list-filter-dialog-clear-button"
        >
          Clear Filters
        </Button>
      </DialogActions>
    </Dialog>
  )
}
