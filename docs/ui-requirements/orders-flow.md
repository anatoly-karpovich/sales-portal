# Order Lifecycle Flow - From Draft to Received

This guide explains how an order evolves through each business status in the Sales Portal, what conditions must be satisfied at every step, and which transitions are allowed. Use it to understand the expected UI behavior, API calls, and test scenarios when automating regression suites.

## Status Glossary

| Status | Description | Key Capabilities |
| --- | --- | --- |
| Draft | Newly created order. Customer/products are still editable and no logistics commitment is confirmed. | Edit customer/products, assign or unassign manager, schedule delivery, cancel order, reopen after cancellation. |
| In Process | Order is locked for fulfillment with delivery scheduled. | Receive products, cancel order, assign/unassign manager, add comments. |
| Partially Received | Some product lines are received while others are outstanding. | Continue receiving remaining products, add comments. |
| Received | All product lines are received. Terminal "done" state. | View-only other than comments for audit trail. |
| Canceled | Fulfillment stopped intentionally. Delivery info is cleared; order can be reopened back to Draft. | Reopen (if allowed) or keep for audit history. |

## Transition Matrix

| From | To | Requirements | Trigger |
| --- | --- | --- | --- |
| Draft | In Process | Delivery scheduled and operator confirms processing. | "Process Order" button -> `PATCH /api/orders/{id}/status` with `status=In Process`. |
| Draft | Canceled | No prerequisites. Used to abandon before processing. | "Cancel Order" button -> `PATCH /api/orders/{id}/status` with `status=Canceled`. |
| Draft | Draft (reopen) | Applies when reopening a canceled order; clears delivery. | "Reopen Order" button on canceled detail view. |
| Canceled | Draft | Operator confirms reopening; delivery cleared to force reschedule. | Same as above. |
| In Process | Canceled | Operator cancels during fulfillment. | "Cancel Order" -> status change. |
| In Process | Partially Received | At least one product checkbox selected but not all. | Receiving flow -> `POST /api/orders/{id}/receive` with subset of product IDs. |
| In Process | Received | All product lines selected during a single save. | Same endpoint; when all products flagged, status becomes Received. |
| Partially Received | Received | Remaining product lines selected. | Receiving flow until all items are complete. |

> Once an order reaches `Received`, the status is final. It cannot revert through the UI; corrections require data fixes outside the standard workflow.

## Flow Narrative

1. **Creation (Draft)**  
   - `POST /api/orders` via the Create Order modal.  
   - Order starts in Draft with editable customer/products, optional manager assignment, and ability to cancel.  
   - "Process Order" CTA remains disabled until a delivery schedule exists (`#/orders/{id}/schedule-delivery`).  

2. **Preparation (Draft with Delivery)**  
   - Schedule delivery or pickup; success toast reads "Delivery was successfully saved".  
   - Optional manager assignment triggers notification to the assignee.  

3. **Processing (In Process)**  
   - Click "Process Order" -> `PATCH /api/orders/{id}/status { status: "In Process" }`.  
   - History logs "Order processing started"; notifications alert the assigned manager.  
   - UI removes customer/product edit pencils and shows the Receive button.  

4. **Receiving**  
   - Switch to receiving mode, check delivered products, click Save.  
   - If some items remain, status becomes Partially Received and history logs "Received".  
   - When all items are checked, status becomes Received and history logs "All products received".  

5. **Cancellation or Reopen Paths**  
   - Draft or In Process orders can be canceled. Status becomes Canceled, history logs "Order canceled", and notifications fire.  
   - Canceled orders show "Reopen Order". Reopening sets status to Draft, clears delivery, and logs "Order reopened".  

## Testing and Automation Tips

- **Preconditions:**  
  - Processing must be blocked until delivery exists. Ensure the Process CTA remains disabled otherwise.  
  - Receiving is only available in In Process or Partially Received states.  

- **Notifications:**  
  - Assign/unassign, status updates, delivery saves, and receiving events emit manager-specific notifications; validate badge counts only for the assigned manager.  

- **History Entries:**  
  - Every transition appends a history record. Validate `ORDER_HISTORY_ACTIONS` values such as "Order processing started", "Order canceled", "Order reopened", "Received", "All products received".  

- **Idempotency:**  
  - Attempting to re-receive already received products should be ignored.  
  - Reopening must clear delivery data so users must schedule again before processing.  

Use this lifecycle map to design end-to-end tests that cover every allowed path from creation through delivery scheduling, processing, partial receipts, and final completion.
