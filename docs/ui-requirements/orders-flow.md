# Order Lifecycle Flow – From Draft to Received

This guide explains how an order evolves through each business status in the Sales Portal, what conditions must be satisfied at every step, and which transitions are allowed. Use it to understand the expected UI behaviors, API calls, and test scenarios when automating regression suites.

## Status Glossary

| Status | Description | Key Capabilities |
| --- | --- | --- |
| `Draft` | Newly created order. Customer/products can still be edited and no logistics commitment is confirmed. | Edit customer/products, assign/unassign manager, schedule delivery, cancel order, reopen from Cancelled. |
| `In Process` | Order is locked for fulfillment. Delivery is scheduled and the team is actively working on it. | Receive products, cancel order, assign/unassign manager, add comments. |
| `Partially Received` | Some product lines are marked as received but at least one item is still outstanding. | Continue receiving remaining products, add comments. |
| `Received` | All product lines were confirmed as received. This is the terminal “done” state. | View-only besides adding comments for audit trail. |
| `Canceled` | Fulfillment stopped intentionally. Delivery data is cleared; order can optionally be reopened into `Draft`. | Reopen to Draft (if business allows) or leave canceled for audit history. |

## Transition Matrix

| From | To | Requirements | Trigger |
| --- | --- | --- | --- |
| Draft | In Process | Delivery must be scheduled (non-null) and the operator confirms processing. | “Process Order” button → `PATCH /api/orders/{id}/status` with `status=In Process`. |
| Draft | Canceled | No prerequisites. Used to abandon an order before processing. | “Cancel Order” button → `PATCH /api/orders/{id}/status` with `status=Canceled`. |
| Draft | Draft (reopen) | Applicable only when reopening a canceled order; clears delivery info. | “Reopen Order” button on canceled detail view. |
| Canceled | Draft | Operator confirms reopening; delivery is cleared to force rescheduling. | Same as above. |
| In Process | Canceled | Operator cancels during fulfillment. | “Cancel Order” button → status change. |
| In Process | Partially Received | At least one product checkbox is marked received, but not all. | Receiving flow → `POST /api/orders/{id}/receive` with subset of product IDs. |
| In Process | Received | All product lines are marked received in a single session. | Same endpoint; when all products flagged, status flips to Received. |
| Partially Received | Received | Remaining product lines are marked received. | Receiving flow until all items are completed. |

> ❗️ Once an order reaches `Received`, the status is considered final—you cannot revert to an earlier state through the UI. Any corrections require data fixes outside the standard workflow.

## Flow Narrative

1. **Creation (Draft)**  
   - Call `POST /api/orders` from the “Create Order” modal.  
   - Order starts in `Draft`, no delivery scheduled. Customer/products can be edited, manager can be assigned, and the order can be canceled.  
   - UI exposes “Process Order” button only when delivery exists (created via `#/orders/{id}/schedule-delivery`).  

2. **Preparation (Draft with Delivery)**  
   - Schedule delivery or pickup; successful save shows “Delivery was successfully saved”.  
   - Optional: Assign a manager and notify them.  

3. **Processing (In Process)**  
   - Clicking “Process Order” triggers `PATCH /api/orders/{id}/status { status: "In Process" }`.  
   - History records “Order processing started” and notifications inform the assigned manager.  
   - UI hides customer/product edit pencils; receiving button becomes available.  

4. **Receiving**  
   - Users switch to receiving mode, select delivered products, and save.  
   - If some but not all products are selected, backend marks order `Partially Received`, adds “Received” entry to history, and keeps receiving mode available.  
   - When the last outstanding product is checked, status becomes `Received`, history logs “All products received”, and the order is considered complete.  

5. **Cancellation or Reopen Paths**  
   - Draft/In Process orders can be canceled. API sets status to `Canceled`, history logs “Order canceled”, and assigned managers are notified.  
   - Canceled orders display “Reopen Order”. Reopening sets status back to `Draft`, removes existing delivery (forcing reschedule), and history logs “Order reopened”.  

## Testing & Automation Tips

- **Preconditions:**  
  - Transition to `In Process` should be rejected if delivery is absent. Automated tests should verify that the “Process Order” CTA stays disabled until users schedule delivery.  
  - Receiving cannot start unless order status is `In Process` or `Partially Received`.  

- **Notifications:**  
  - Assign/unassign, status changes, deliveries, and receiving actions emit manager-specific notifications; verify badge counts for the assigned manager only.  

- **History Entries:**  
  - Each transition appends an entry. Tests should confirm the correct `ORDER_HISTORY_ACTIONS` label appears (e.g., “Order processing started”, “Order canceled”, “Order reopened”, “Received”, “All products received”).  

- **Idempotency:**  
  - Repeated attempts to receive already-received products should be ignored.  
  - Reopening should reset delivery fields so scheduling is required again before processing.  

Use this lifecycle map to design end-to-end scenarios, ensuring every permissible path—from creation, through delivery scheduling, processing, partial receipts, and final completion—is covered by your automated regression suite.
