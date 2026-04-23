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
import type { OrderComment, OrderDelivery, OrderDetails } from '@/api/modules/orders.api'
import { OrderDetailsDeliveryTab } from '@/features/orders/components/OrderDetailsDeliveryTab'
import { OrderHistoryTimeline } from '@/features/orders/components/OrderHistoryTimeline'
import { ordersUiText } from '@/features/orders/orders.ui-text'
import { formatDateTime } from '@/utils/date'

export type OrderDetailsTab = 'delivery' | 'history' | 'comments'

type OrderDetailsTabsSectionProps = {
  order: OrderDetails
  activeTab: OrderDetailsTab
  onTabChange: (tab: OrderDetailsTab) => void
  isDeliveryEditable: boolean
  isDeliverySubmitting: boolean
  onSaveDelivery: (delivery: OrderDelivery) => Promise<boolean>
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

export function OrderDetailsTabsSection({
  order,
  activeTab,
  onTabChange,
  isDeliveryEditable,
  isDeliverySubmitting,
  onSaveDelivery,
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
          <OrderDetailsDeliveryTab
            key={[
              order.status,
              order.customer._id,
              order.customer.country,
              order.customer.city,
              order.customer.street,
              order.customer.house,
              order.customer.flat,
              order.delivery?.condition ?? 'none',
              order.delivery?.finalDate ?? 'none',
              order.delivery?.address.country ?? 'none',
              order.delivery?.address.city ?? 'none',
              order.delivery?.address.street ?? 'none',
              order.delivery?.address.house ?? 'none',
              order.delivery?.address.flat ?? 'none',
            ].join('|')}
            order={order}
            isDeliveryEditable={isDeliveryEditable}
            isDeliverySubmitting={isDeliverySubmitting}
            onSaveDelivery={onSaveDelivery}
          />
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
