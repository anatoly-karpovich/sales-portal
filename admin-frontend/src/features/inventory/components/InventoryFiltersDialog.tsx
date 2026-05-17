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
  Typography,
} from '@mui/material'
import { useState } from 'react'

type InventoryFiltersApplyPayload = {
  manufacturer: string[]
  productStatus: string[]
  inventoryStatus: string[]
}

type Props = {
  open: boolean
  title: string
  manufacturerTitle: string
  productStatusTitle: string
  inventoryStatusTitle: string
  manufacturerValues: string[]
  selectedManufacturer: string[]
  productStatusValues: string[]
  selectedProductStatus: string[]
  inventoryStatusValues: string[]
  selectedInventoryStatus: string[]
  onClose: () => void
  onApply: (values: InventoryFiltersApplyPayload) => void
}

type ExpandedAccordion = 'inventoryStatus' | 'productStatus' | 'manufacturer'
type StringArrayStateSetter = (value: string[] | ((prev: string[]) => string[])) => void

function toOptionTestId(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

function toggleValue(
  value: string,
  currentValues: string[],
  setValues: StringArrayStateSetter,
) {
  setValues(
    currentValues.includes(value)
      ? currentValues.filter((item) => item !== value)
      : [...currentValues, value],
  )
}

export function InventoryFiltersDialog({
  open,
  title,
  manufacturerTitle,
  productStatusTitle,
  inventoryStatusTitle,
  manufacturerValues,
  selectedManufacturer,
  productStatusValues,
  selectedProductStatus,
  inventoryStatusValues,
  selectedInventoryStatus,
  onClose,
  onApply,
}: Props) {
  const [manufacturerDraft, setManufacturerDraft] = useState<string[]>([])
  const [productStatusDraft, setProductStatusDraft] = useState<string[]>([])
  const [inventoryStatusDraft, setInventoryStatusDraft] = useState<string[]>([])
  const [expandedAccordion, setExpandedAccordion] = useState<ExpandedAccordion>('inventoryStatus')

  const clearAllFilters = () => {
    setManufacturerDraft([])
    setProductStatusDraft([])
    setInventoryStatusDraft([])
  }

  const applyFilters = () => {
    onApply({
      manufacturer: manufacturerDraft,
      productStatus: productStatusDraft,
      inventoryStatus: inventoryStatusDraft,
    })
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      data-testid="inventory-list-filter-dialog"
      TransitionProps={{
        onEnter: () => {
          setManufacturerDraft(selectedManufacturer)
          setProductStatusDraft(selectedProductStatus)
          setInventoryStatusDraft(selectedInventoryStatus)
          setExpandedAccordion('inventoryStatus')
        },
      }}
    >
      <DialogTitle sx={{ pr: 6 }} data-testid="inventory-list-filter-dialog-title-section">
        <Stack direction="row" alignItems="center" spacing={1} data-testid="inventory-list-filter-dialog-title-row">
          <FilterAltOutlinedIcon color="action" fontSize="small" />
          <Typography
            variant="h6"
            component="span"
            sx={{ fontWeight: 700 }}
            data-testid="inventory-list-filter-dialog-title-text"
          >
            {title}
          </Typography>
        </Stack>
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{ position: 'absolute', right: 16, top: 12 }}
          data-testid="inventory-list-filter-dialog-close-button"
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ px: 3, py: 2.5 }} data-testid="inventory-list-filter-dialog-content">
        <Stack spacing={1.5} data-testid="inventory-list-filter-dialog-accordion-list">
          <Accordion
            disableGutters
            expanded={expandedAccordion === 'inventoryStatus'}
            onChange={() => setExpandedAccordion('inventoryStatus')}
            data-testid="inventory-list-filter-dialog-inventory-status-accordion"
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
              data-testid="inventory-list-filter-dialog-inventory-status-accordion-summary"
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
                <Typography sx={{ fontWeight: 600 }}>{inventoryStatusTitle}</Typography>
                {inventoryStatusDraft.length > 0 ? (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    data-testid="inventory-list-filter-dialog-inventory-status-selected-count"
                  >
                    {`${inventoryStatusDraft.length} selected`}
                  </Typography>
                ) : null}
              </Box>
            </AccordionSummary>
            <AccordionDetails
              sx={{ px: 2, pt: 0.5, pb: 1.5 }}
              data-testid="inventory-list-filter-dialog-inventory-status-accordion-details"
            >
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                  columnGap: 2,
                }}
                data-testid="inventory-list-filter-dialog-inventory-status-options-list"
              >
                {inventoryStatusValues.map((value) => (
                  <FormControlLabel
                    key={value}
                    control={
                      <Checkbox
                        checked={inventoryStatusDraft.includes(value)}
                        onChange={() =>
                          toggleValue(value, inventoryStatusDraft, setInventoryStatusDraft)
                        }
                      />
                    }
                    label={value}
                    data-testid={`inventory-list-filter-dialog-inventory-status-option-${toOptionTestId(value)}-checkbox`}
                  />
                ))}
              </Box>
            </AccordionDetails>
          </Accordion>

          <Accordion
            disableGutters
            expanded={expandedAccordion === 'productStatus'}
            onChange={() => setExpandedAccordion('productStatus')}
            data-testid="inventory-list-filter-dialog-product-status-accordion"
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
              data-testid="inventory-list-filter-dialog-product-status-accordion-summary"
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
                <Typography sx={{ fontWeight: 600 }}>{productStatusTitle}</Typography>
                {productStatusDraft.length > 0 ? (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    data-testid="inventory-list-filter-dialog-product-status-selected-count"
                  >
                    {`${productStatusDraft.length} selected`}
                  </Typography>
                ) : null}
              </Box>
            </AccordionSummary>
            <AccordionDetails
              sx={{ px: 2, pt: 0.5, pb: 1.5 }}
              data-testid="inventory-list-filter-dialog-product-status-accordion-details"
            >
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                  columnGap: 2,
                }}
                data-testid="inventory-list-filter-dialog-product-status-options-list"
              >
                {productStatusValues.map((value) => (
                  <FormControlLabel
                    key={value}
                    control={
                      <Checkbox
                        checked={productStatusDraft.includes(value)}
                        onChange={() =>
                          toggleValue(value, productStatusDraft, setProductStatusDraft)
                        }
                      />
                    }
                    label={value}
                    data-testid={`inventory-list-filter-dialog-product-status-option-${toOptionTestId(value)}-checkbox`}
                  />
                ))}
              </Box>
            </AccordionDetails>
          </Accordion>

          <Accordion
            disableGutters
            expanded={expandedAccordion === 'manufacturer'}
            onChange={() => setExpandedAccordion('manufacturer')}
            data-testid="inventory-list-filter-dialog-manufacturer-accordion"
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
              data-testid="inventory-list-filter-dialog-manufacturer-accordion-summary"
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
                <Typography sx={{ fontWeight: 600 }}>{manufacturerTitle}</Typography>
                {manufacturerDraft.length > 0 ? (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    data-testid="inventory-list-filter-dialog-manufacturer-selected-count"
                  >
                    {`${manufacturerDraft.length} selected`}
                  </Typography>
                ) : null}
              </Box>
            </AccordionSummary>
            <AccordionDetails
              sx={{ px: 2, pt: 0.5, pb: 1.5 }}
              data-testid="inventory-list-filter-dialog-manufacturer-accordion-details"
            >
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                  columnGap: 2,
                }}
                data-testid="inventory-list-filter-dialog-manufacturer-options-list"
              >
                {manufacturerValues.map((value) => (
                  <FormControlLabel
                    key={value}
                    control={
                      <Checkbox
                        checked={manufacturerDraft.includes(value)}
                        onChange={() => toggleValue(value, manufacturerDraft, setManufacturerDraft)}
                      />
                    }
                    label={value}
                    data-testid={`inventory-list-filter-dialog-manufacturer-option-${toOptionTestId(value)}-checkbox`}
                  />
                ))}
              </Box>
            </AccordionDetails>
          </Accordion>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }} data-testid="inventory-list-filter-dialog-actions">
        <Box sx={{ flexGrow: 1 }} />
        <Button
          variant="contained"
          onClick={applyFilters}
          data-testid="inventory-list-filter-dialog-apply-button"
        >
          Apply
        </Button>
        <Button onClick={clearAllFilters} data-testid="inventory-list-filter-dialog-clear-button">
          Clear Filters
        </Button>
      </DialogActions>
    </Dialog>
  )
}
