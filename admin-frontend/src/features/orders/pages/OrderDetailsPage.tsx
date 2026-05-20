import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material'
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded'
import { OrderDetailsCustomerSection } from '@/features/orders/components/OrderDetailsCustomerSection'
import { OrderDetailsManagerSection } from '@/features/orders/components/OrderDetailsManagerSection'
import { OrderDetailsProductsSection } from '@/features/orders/components/OrderDetailsProductsSection'
import { OrderDetailsSummarySection } from '@/features/orders/components/OrderDetailsSummarySection'
import { OrderDetailsTabsSection } from '@/features/orders/components/OrderDetailsTabsSection'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useOrderDetailsPageState } from '@/features/orders/hooks/useOrderDetailsPageState'
import { ordersUiText } from '@/features/orders/orders.ui-text'

function OrderDetailsSkeleton() {
  return (
    <Stack spacing={2.5} data-testid="order-details-page-skeleton">
      <Paper sx={{ p: { xs: 2, md: 3 } }}>
        <Stack spacing={2}>
          <Skeleton variant="text" width={140} height={34} />
          <Skeleton variant="text" width={260} height={58} />
          <Skeleton variant="rounded" height={160} />
        </Stack>
      </Paper>
      <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' } }}>
        <Skeleton variant="rounded" height={320} />
        <Skeleton variant="rounded" height={320} />
      </Box>
      <Skeleton variant="rounded" height={260} />
    </Stack>
  )
}

export function OrderDetailsPage() {
  const {
    orderId,
    order,
    orderDetailsQuery,
    isOrderIdInvalid,
    isDetailsReloading,
    isNotFoundError,
    activeTab,
    setActiveTab,
    isRefreshPending,
    isCustomerEditMode,
    isProductsEditMode,
    isManagerEditMode,
    pendingStatusAction,
    setPendingStatusAction,
    detailsDialogCopy,
    commentDraft,
    setCommentDraft,
    isCommentValid,
    isCommentCreatePending,
    isCommentDeletePending,
    pendingDeleteCommentId,
    orderedComments,
    assignedManagerDisplayValue,
    isManagerAssigned,
    isManagerEditable,
    isManagerActionPending,
    isCustomerEditable,
    isProductsEditable,
    isReceiveStartVisible,
    isReceiveModeVisible,
    isReceiveSavePending,
    isReceiveSaveEnabled,
    hasPendingProductsToReceive,
    isSelectAllChecked,
    isSelectAllIndeterminate,
    selectedReceivePendingRowIndices,
    isCancelVisible,
    isProcessVisible,
    isProcessDisabled,
    isReopenVisible,
    productsSubtotal,
    isDeliverySubmitting,
    isStatusSubmitting,
    isCustomerEditSavePending,
    isProductsEditSavePending,
    orderProductDisplayRows,
    handleBackToOrders,
    handleRefresh,
    handleStartCustomerEdit,
    handleCancelCustomerEdit,
    handleSaveEditedCustomer,
    handleStartProductsEdit,
    handleCancelProductsEdit,
    handleSaveEditedProducts,
    handleStartManagerEdit,
    handleCancelManagerEdit,
    handleSaveAssignedManager,
    handleStartReceiveMode,
    handleCancelReceiveMode,
    handleToggleReceiveProduct,
    handleToggleSelectAllReceive,
    handleSaveReceivedProducts,
    handleSaveDelivery,
    handleConfirmStatusAction,
    handleCreateComment,
    handleDeleteComment,
  } = useOrderDetailsPageState()

  if (!orderId) {
    return (
      <Paper sx={{ p: 3 }} data-testid="order-details-page-missing-id">
        <Typography color="error">{ordersUiText.errors.missingOrderId}</Typography>
      </Paper>
    )
  }

  if (isOrderIdInvalid) {
    return (
      <Paper sx={{ p: 3 }} data-testid="order-details-page-invalid-id">
        <Stack spacing={1.5} alignItems="flex-start">
          <Typography color="error">{ordersUiText.errors.invalidOrderId}</Typography>
          <Button
            variant="outlined"
            onClick={handleBackToOrders}
            data-testid="order-details-page-invalid-id-back-button"
          >
            {ordersUiText.detailsPage.backToOrders}
          </Button>
        </Stack>
      </Paper>
    )
  }

  if (orderDetailsQuery.isLoading || isDetailsReloading) {
    return <OrderDetailsSkeleton />
  }

  if (isNotFoundError) {
    return (
      <Paper sx={{ p: 3 }} data-testid="order-details-page-not-found">
        <Stack direction="row" spacing={1} alignItems="center">
          <CircularProgress size={16} />
          <Typography color="error">{ordersUiText.errors.orderNotFound}</Typography>
        </Stack>
      </Paper>
    )
  }

  if (orderDetailsQuery.isError || !order) {
    return (
      <Paper sx={{ p: 3 }} data-testid="order-details-page-load-error">
        <Stack spacing={2}>
          <Alert severity="error">{ordersUiText.errors.detailsUnavailable}</Alert>
          <Button
            variant="outlined"
            startIcon={<RefreshRoundedIcon fontSize="small" />}
            onClick={() => void handleRefresh()}
            sx={{ alignSelf: 'flex-start' }}
            data-testid="order-details-page-load-error-refresh-button"
          >
            {ordersUiText.detailsPage.actions.refresh}
          </Button>
        </Stack>
      </Paper>
    )
  }

  return (
    <Stack spacing={2.5} data-testid="order-details-page">
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={1.5}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', md: 'center' }}
        data-testid="order-details-page-header"
      >
        <Typography variant="h4" sx={{ fontWeight: 700 }} data-testid="order-details-page-title">
          {ordersUiText.detailsPage.title}
        </Typography>
      </Stack>

      <Paper
        variant="outlined"
        sx={{ p: { xs: 1.5, md: 2 }, borderColor: 'divider' }}
        data-testid="order-details-page-main-content"
      >
        <Stack spacing={2}>
          <Paper variant="outlined" sx={{ overflow: 'hidden', borderColor: 'divider' }}>
            <OrderDetailsSummarySection
              order={order}
              productsSubtotal={productsSubtotal}
              isEmbedded
              isCancelVisible={isCancelVisible}
              isCancelDisabled={false}
              isReopenVisible={isReopenVisible}
              isProcessVisible={isProcessVisible}
              isProcessDisabled={isProcessDisabled}
              isRefreshPending={isRefreshPending}
              isOrderFetching={orderDetailsQuery.isFetching}
              onCancel={() => setPendingStatusAction('cancel')}
              onReopen={() => setPendingStatusAction('reopen')}
              onProcess={() => setPendingStatusAction('process')}
              onRefresh={() => void handleRefresh()}
            />
          </Paper>

          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: {
                xs: '1fr',
                lg: 'minmax(380px, 500px) minmax(460px, 1fr)',
                xl: 'minmax(440px, 560px) minmax(520px, 1fr)',
              },
              alignItems: 'stretch',
            }}
          >
            <Paper variant="outlined" sx={{ p: { xs: 1.5, md: 2 }, borderColor: 'divider' }}>
              <Stack spacing={1.25}>
                <Paper variant="outlined" sx={{ borderColor: 'divider' }}>
                  <OrderDetailsManagerSection
                    order={order}
                    assignedManagerDisplayValue={assignedManagerDisplayValue}
                    isManagerAssigned={isManagerAssigned}
                    isManagerEditable={isManagerEditable}
                    isManagerActionPending={isManagerActionPending}
                    isManagerEditMode={isManagerEditMode}
                    isEmbedded
                    onStartManagerEdit={handleStartManagerEdit}
                    onCancelManagerEdit={handleCancelManagerEdit}
                    onSaveManagerEdit={handleSaveAssignedManager}
                  />
                </Paper>

                <Paper variant="outlined" sx={{ borderColor: 'divider' }}>
                  <OrderDetailsCustomerSection
                    order={order}
                    isCustomerEditable={isCustomerEditable}
                    isCustomerEditMode={isCustomerEditMode}
                    isCustomerEditSavePending={isCustomerEditSavePending}
                    isEmbedded
                    onStartCustomerEdit={handleStartCustomerEdit}
                    onCancelCustomerEdit={handleCancelCustomerEdit}
                    onSaveCustomerEdit={handleSaveEditedCustomer}
                  />
                </Paper>
              </Stack>
            </Paper>

            <Paper variant="outlined" sx={{ overflow: 'hidden', borderColor: 'divider' }}>
              <OrderDetailsProductsSection
                order={order}
                displayRows={orderProductDisplayRows}
                currentDelivery={order.delivery}
                isProductsEditable={isProductsEditable}
                isProductsEditMode={isProductsEditMode}
                isProductsEditSavePending={isProductsEditSavePending}
                isReceiveStartVisible={isReceiveStartVisible}
                isReceiveModeVisible={isReceiveModeVisible}
                isReceiveSavePending={isReceiveSavePending}
                isReceiveSaveEnabled={isReceiveSaveEnabled}
                hasPendingProductsToReceive={hasPendingProductsToReceive}
                isSelectAllChecked={isSelectAllChecked}
                isSelectAllIndeterminate={isSelectAllIndeterminate}
                selectedReceivePendingRowIndices={selectedReceivePendingRowIndices}
                isEmbedded
                onStartProductsEdit={handleStartProductsEdit}
                onCancelProductsEdit={handleCancelProductsEdit}
                onSaveProductsEdit={handleSaveEditedProducts}
                onStartReceiveMode={handleStartReceiveMode}
                onCancelReceiveMode={handleCancelReceiveMode}
                onSaveReceivedProducts={() => void handleSaveReceivedProducts()}
                onToggleSelectAllReceive={handleToggleSelectAllReceive}
                onToggleReceiveProduct={handleToggleReceiveProduct}
              />
            </Paper>
          </Box>

          <Paper variant="outlined" sx={{ borderColor: 'divider' }}>
            <OrderDetailsTabsSection
              order={order}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              isEmbedded
              isDeliveryEditable={order.status === 'Draft'}
              isDeliverySubmitting={isDeliverySubmitting}
              onSaveDelivery={handleSaveDelivery}
              commentDraft={commentDraft}
              onCommentDraftChange={setCommentDraft}
              isCommentValid={isCommentValid}
              isCommentCreatePending={isCommentCreatePending}
              isCommentDeletePending={isCommentDeletePending}
              pendingDeleteCommentId={pendingDeleteCommentId}
              orderedComments={orderedComments}
              onCreateComment={() => void handleCreateComment()}
              onDeleteComment={(commentId) => void handleDeleteComment(commentId)}
            />
          </Paper>
        </Stack>
      </Paper>

      <ConfirmDialog
        open={Boolean(pendingStatusAction) && Boolean(detailsDialogCopy)}
        title={detailsDialogCopy?.title ?? ''}
        message={detailsDialogCopy?.message ?? ''}
        confirmLabel={detailsDialogCopy?.confirm}
        confirmColor={detailsDialogCopy?.confirmColor}
        cancelLabel={ordersUiText.dialogs.cancel}
        isSubmitting={isStatusSubmitting}
        onCancel={() => {
          if (isStatusSubmitting) return
          setPendingStatusAction(null)
        }}
        onConfirm={handleConfirmStatusAction}
      />
    </Stack>
  )
}
