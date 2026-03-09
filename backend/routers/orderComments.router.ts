import OrderCommentsController from "../controllers/orderComments.controller.js";
import { orderById, orderCommentsCreate, orderCommentsDelete } from "../middleware/orderMiddleware.js";
import Router from "express";
import { schemaMiddleware } from "../middleware/schemaMiddleware.js";
import { authmiddleware } from "../middleware/authmiddleware.js";

const orderCommentsRouter = Router();

orderCommentsRouter.post(
  "/orders/:id/comments",
  authmiddleware,
  schemaMiddleware("orderCommentsCreateSchema"),
  orderCommentsCreate,
  orderById,
  OrderCommentsController.create.bind(OrderCommentsController),
);

orderCommentsRouter.delete(
  "/orders/:id/comments/:commentId",
  authmiddleware,
  orderById,
  orderCommentsDelete,
  OrderCommentsController.delete.bind(OrderCommentsController),
);

/**
 * @swagger
 * /api/orders/{id}/comments:
 *   post:
 *     summary: Add a comment to an order
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the order
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/OrderCommentPayload'
 *     responses:
 *       200:
 *         description: Comment successfully added to the order
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OrderResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       401:
 *         description: Unauthorized, missing or invalid token
 *       404:
 *         description: Order not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/orders/{id}/comments/{commentId}:
 *   delete:
 *     summary: Delete a comment from an order
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the order
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the comment to delete
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       204:
 *         description: Comment successfully deleted, no content
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized, missing or invalid token
 *       404:
 *         description: Order or comment not found
 *       500:
 *         description: Server error
 */

export default orderCommentsRouter;

