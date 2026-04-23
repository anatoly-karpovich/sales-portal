import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'
import type { OrderComment, OrderDetails } from '@/api/modules/orders.api'
import { OrderHistoryTimeline } from '@/features/orders/components/OrderHistoryTimeline'
import { ordersUiText } from '@/features/orders/orders.ui-text'
import { formatDate, formatDateTime } from '@/utils/date'

export type OrderDetailsTab = 'delivery' | 'history' | 'comments'

type OrderDetailsTabsSectionProps = {
  order: OrderDetails
  activeTab: OrderDetailsTab
  onTabChange: (tab: OrderDetailsTab) => void
  commentDraft: string
  onCommentDraftChange: (value: string) => void
  isCommentValid: boolean
  isCommentCreatePending: boolean
  isCommentDeletePending: boolean
  pendingDeleteCommentId: string | null
  orderedComments: OrderComment[]
  onCreateComment: () => void
  onDeleteComment: (commentId: string | undefined) => void
}

function normalizeValue(value: string | number | null | undefined) {
  if (value === null || value === undefined) return '-'
  if (typeof value === 'string' && value.trim().length === 0) return '-'
  return String(value)
}

export function OrderDetailsTabsSection({
  order,
  activeTab,
  onTabChange,
  commentDraft,
  onCommentDraftChange,
  isCommentValid,
  isCommentCreatePending,
  isCommentDeletePending,
  pendingDeleteCommentId,
  orderedComments,
  onCreateComment,
  onDeleteComment,
}: OrderDetailsTabsSectionProps) {
  return (
    <Paper sx={{ p: { xs: 2, md: 3 } }} data-testid="order-details-tabs-placeholder-section">
      <Tabs
        value={activeTab}
        onChange={(_, value: OrderDetailsTab) => onTabChange(value)}
        sx={{ mb: 2 }}
      >
        <Tab
          label={ordersUiText.detailsPage.tabs.delivery}
          value="delivery"
          data-testid="order-details-tabs-placeholder-delivery-tab"
        />
        <Tab
          label={ordersUiText.detailsPage.tabs.history}
          value="history"
          data-testid="order-details-tabs-placeholder-history-tab"
        />
        <Tab
          label={ordersUiText.detailsPage.tabs.comments}
          value="comments"
          data-testid="order-details-tabs-placeholder-comments-tab"
        />
      </Tabs>
      <Box data-testid="order-details-tabs-placeholder-content">
        {activeTab === 'delivery' ? (
          <Stack spacing={2}>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {ordersUiText.detailsPage.labels.deliveryInformation}
            </Typography>
            {order.delivery ? (
              <Box
                sx={{
                  display: 'grid',
                  gap: 1.25,
                  gridTemplateColumns: { xs: '1fr', sm: '180px 1fr' },
                }}
              >
                <Typography fontWeight={700}>{ordersUiText.detailsPage.fields.delivery.condition}</Typography>
                <Typography>{normalizeValue(order.delivery.condition)}</Typography>

                <Typography fontWeight={700}>{ordersUiText.detailsPage.fields.delivery.finalDate}</Typography>
                <Typography>{formatDate(order.delivery.finalDate)}</Typography>

                <Typography fontWeight={700}>{ordersUiText.detailsPage.fields.delivery.country}</Typography>
                <Typography>{normalizeValue(order.delivery.address.country)}</Typography>

                <Typography fontWeight={700}>{ordersUiText.detailsPage.fields.delivery.city}</Typography>
                <Typography>{normalizeValue(order.delivery.address.city)}</Typography>

                <Typography fontWeight={700}>{ordersUiText.detailsPage.fields.delivery.street}</Typography>
                <Typography>{normalizeValue(order.delivery.address.street)}</Typography>

                <Typography fontWeight={700}>{ordersUiText.detailsPage.fields.delivery.house}</Typography>
                <Typography>{normalizeValue(order.delivery.address.house)}</Typography>

                <Typography fontWeight={700}>{ordersUiText.detailsPage.fields.delivery.flat}</Typography>
                <Typography>{normalizeValue(order.delivery.address.flat)}</Typography>
              </Box>
            ) : (
              <Typography color="text.secondary">{ordersUiText.detailsPage.placeholders.noDeliveryScheduled}</Typography>
            )}
          </Stack>
        ) : null}

        {activeTab === 'history' ? (
          <Stack spacing={2}>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {ordersUiText.detailsPage.labels.orderHistory}
            </Typography>
            <OrderHistoryTimeline history={order.history} />
          </Stack>
        ) : null}

        {activeTab === 'comments' ? (
          <Stack spacing={2}>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {ordersUiText.detailsPage.labels.comments}
            </Typography>
            <TextField
              multiline
              rows={3}
              value={commentDraft}
              onChange={(event) => onCommentDraftChange(event.target.value)}
              placeholder={ordersUiText.detailsPage.placeholders.commentInput}
              data-testid="order-details-comments-input"
              inputProps={{ 'data-testid': 'order-details-comments-input-field' }}
              error={commentDraft.length > 0 && !isCommentValid}
              helperText={commentDraft.length > 0 && !isCommentValid ? ordersUiText.validation.commentsInvalid : ' '}
              disabled={isCommentCreatePending}
            />
            <Button
              variant="contained"
              onClick={onCreateComment}
              disabled={!isCommentValid || isCommentCreatePending}
              sx={{ alignSelf: 'flex-start' }}
              data-testid="order-details-comments-create-button"
            >
              {isCommentCreatePending ? (
                <CircularProgress size={18} color="inherit" />
              ) : (
                ordersUiText.detailsPage.actions.createComment
              )}
            </Button>

            <Stack spacing={1.25}>
              {orderedComments.map((comment, index) => (
                <Paper
                  key={comment._id ?? `${comment.createdOn}-${index}`}
                  variant="outlined"
                  sx={{ p: 1.5 }}
                  data-testid={`order-details-comments-item-${index}`}
                >
                  <Stack spacing={1}>
                    <Stack direction="row" spacing={1.5} justifyContent="space-between" alignItems="flex-start">
                      <Typography sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', flex: 1 }}>
                        {comment.text}
                      </Typography>
                      <IconButton
                        color="error"
                        size="small"
                        onClick={() => onDeleteComment(comment._id)}
                        disabled={!comment._id || isCommentDeletePending}
                        data-testid={`order-details-comments-item-${index}-delete-button`}
                      >
                        {isCommentDeletePending && pendingDeleteCommentId === comment._id ? (
                          <CircularProgress size={16} color="inherit" />
                        ) : (
                          <DeleteOutlineRoundedIcon fontSize="small" />
                        )}
                      </IconButton>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2" color="primary.main">
                        {ordersUiText.detailsPage.placeholders.commentAuthorFallback}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {formatDateTime(comment.createdOn)}
                      </Typography>
                    </Stack>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          </Stack>
        ) : null}
      </Box>
    </Paper>
  )
}
