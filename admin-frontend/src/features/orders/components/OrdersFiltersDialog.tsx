import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import CloseIcon from '@mui/icons-material/Close'
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

type OrdersFiltersApplyPayload = {
  status: string[]
  deliveryStatus: string[]
}

type Props = {
  open: boolean
  title: string
  orderStatusTitle: string
  deliveryStatusTitle: string
  statusValues: string[]
  selectedStatus: string[]
  deliveryStatusValues: string[]
  selectedDeliveryStatus: string[]
  onClose: () => void
  onApply: (values: OrdersFiltersApplyPayload) => void
}

type ExpandedAccordion = 'order-status' | 'delivery-status'

function toOptionTestId(value: string) {
  return value.toLowerCase().replace(/\s+/g, '-')
}

type StringArrayStateSetter = (value: string[] | ((prev: string[]) => string[])) => void

export function OrdersFiltersDialog({
  open,
  title,
  orderStatusTitle,
  deliveryStatusTitle,
  statusValues,
  selectedStatus,
  deliveryStatusValues,
  selectedDeliveryStatus,
  onClose,
  onApply,
}: Props) {
  const [statusDraft, setStatusDraft] = useState<string[]>([])
  const [deliveryStatusDraft, setDeliveryStatusDraft] = useState<string[]>([])
  const [expandedAccordion, setExpandedAccordion] = useState<ExpandedAccordion>('order-status')

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

  const handleAccordionChange = (panel: ExpandedAccordion) => {
    setExpandedAccordion(panel)
  }

  const clearAllFilters = () => {
    setStatusDraft([])
    setDeliveryStatusDraft([])
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      data-testid="orders-list-filter-dialog"
      TransitionProps={{
        onEnter: () => {
          setStatusDraft(selectedStatus)
          setDeliveryStatusDraft(selectedDeliveryStatus)
          setExpandedAccordion('order-status')
        },
      }}
    >
      <DialogTitle sx={{ pr: 6 }} data-testid="orders-list-filter-dialog-title-section">
        <Stack direction="row" alignItems="center" spacing={1} data-testid="orders-list-filter-dialog-title-row">
          <FilterAltOutlinedIcon color="action" fontSize="small" />
          <Typography
            variant="h6"
            component="span"
            sx={{ fontWeight: 700 }}
            data-testid="orders-list-filter-dialog-title-text"
          >
            {title}
          </Typography>
        </Stack>
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{ position: 'absolute', right: 16, top: 12 }}
          data-testid="orders-list-filter-dialog-close-button"
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ px: 3, py: 2.5 }} data-testid="orders-list-filter-dialog-content">
        <Stack spacing={1.5} data-testid="orders-list-filter-dialog-accordion-list">
          <Accordion
            disableGutters
            expanded={expandedAccordion === 'order-status'}
            onChange={() => handleAccordionChange('order-status')}
            data-testid="orders-list-filter-dialog-order-status-accordion"
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
                '& .MuiAccordionSummary-content': {
                  my: 0,
                },
              }}
              data-testid="orders-list-filter-dialog-order-status-accordion-summary"
            >
              <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1 }}>
                <Typography sx={{ fontWeight: 600 }}>{orderStatusTitle}</Typography>
                {statusDraft.length > 0 ? (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    data-testid="orders-list-filter-dialog-order-status-selected-count"
                  >
                    {`${statusDraft.length} selected`}
                  </Typography>
                ) : null}
              </Box>
            </AccordionSummary>
            <AccordionDetails
              sx={{ px: 2, pt: 0.5, pb: 1.5 }}
              data-testid="orders-list-filter-dialog-order-status-accordion-details"
            >
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '1fr',
                  columnGap: 2,
                }}
                data-testid="orders-list-filter-dialog-order-status-options-list"
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
                    data-testid={`orders-list-filter-dialog-order-status-option-${toOptionTestId(value)}-checkbox`}
                  />
                ))}
              </Box>
            </AccordionDetails>
          </Accordion>

          <Accordion
            disableGutters
            expanded={expandedAccordion === 'delivery-status'}
            onChange={() => handleAccordionChange('delivery-status')}
            data-testid="orders-list-filter-dialog-delivery-status-accordion"
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
                '& .MuiAccordionSummary-content': {
                  my: 0,
                },
              }}
              data-testid="orders-list-filter-dialog-delivery-status-accordion-summary"
            >
              <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1 }}>
                <Typography sx={{ fontWeight: 600 }}>{deliveryStatusTitle}</Typography>
                {deliveryStatusDraft.length > 0 ? (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    data-testid="orders-list-filter-dialog-delivery-status-selected-count"
                  >
                    {`${deliveryStatusDraft.length} selected`}
                  </Typography>
                ) : null}
              </Box>
            </AccordionSummary>
            <AccordionDetails
              sx={{ px: 2, pt: 0.5, pb: 1.5 }}
              data-testid="orders-list-filter-dialog-delivery-status-accordion-details"
            >
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '1fr',
                  columnGap: 2,
                }}
                data-testid="orders-list-filter-dialog-delivery-status-options-list"
              >
                {deliveryStatusValues.map((value) => (
                  <FormControlLabel
                    key={value}
                    control={
                      <Checkbox
                        checked={deliveryStatusDraft.includes(value)}
                        onChange={() =>
                          toggleValue(value, deliveryStatusDraft, setDeliveryStatusDraft)
                        }
                      />
                    }
                    label={value}
                    data-testid={`orders-list-filter-dialog-delivery-status-option-${toOptionTestId(value)}-checkbox`}
                  />
                ))}
              </Box>
            </AccordionDetails>
          </Accordion>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }} data-testid="orders-list-filter-dialog-actions">
        <Box sx={{ flexGrow: 1 }} />
        <Button
          variant="contained"
          onClick={() => onApply({ status: statusDraft, deliveryStatus: deliveryStatusDraft })}
          data-testid="orders-list-filter-dialog-apply-button"
        >
          Apply
        </Button>
        <Button onClick={clearAllFilters} data-testid="orders-list-filter-dialog-clear-button">
          Clear Filters
        </Button>
      </DialogActions>
    </Dialog>
  )
}
