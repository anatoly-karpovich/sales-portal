import Order from "../models/order.model";
import OrderService from "./order.service";
import type { IComment } from "../data/types";
import { getTodaysDate } from "../utils/utils";
import { Types } from "mongoose";
import { NOTIFICATIONS } from "../data/enums";
import { NotificationService } from "./notification.service";
import { OrderDetailsDTO } from "../data/types/dto/orders.dto";

class OrderCommentsService {
  private notificationService = new NotificationService();

  async createComment({
    orderId,
    commentText,
    performerId,
    currentOrder,
  }: {
    orderId: Types.ObjectId;
    commentText: string;
    performerId: string;
    currentOrder: OrderDetailsDTO;
  }): Promise<OrderDetailsDTO> {
    if (!orderId) {
      throw new Error("Id was not provided");
    }
    const comment: IComment = {
      text: commentText,
      createdOn: getTodaysDate(true),
      createdBy: new Types.ObjectId(performerId),
    };
    const newOrder: OrderDetailsDTO = {
      ...currentOrder,
      comments: [...currentOrder.comments, comment],
    };

    const updatedOrder = await Order.findByIdAndUpdate(newOrder._id, newOrder, { new: true });
    if (!updatedOrder) {
      throw new Error("Order not found");
    }

    if (updatedOrder.assignedManager) {
      await this.notificationService.create({
        managerId: updatedOrder.assignedManager._id.toString(),
        orderId: updatedOrder._id.toString(),
        type: "commentAdded",
        message: NOTIFICATIONS.commentAdded,
      });
    }
    return OrderService.getOrder(updatedOrder._id);
  }

  async deleteComment(orderId: Types.ObjectId, commentId: Types.ObjectId) {
    await Order.updateOne({ _id: orderId }, { $pull: { comments: { _id: commentId } } });
    const updatedOrder = await OrderService.getOrder(orderId);
    if (updatedOrder.assignedManager) {
      await this.notificationService.create({
        managerId: updatedOrder.assignedManager._id.toString(),
        orderId: updatedOrder._id.toString(),
        type: "commentDeleted",
        message: NOTIFICATIONS.commentDeleted,
      });
    }
    return updatedOrder;
  }
}

export default new OrderCommentsService();
