import { VALIDATION_ERROR_MESSAGES } from "../data/enums";
import { Request, Response } from "express";
import Manager from "../models/manager.model";
import { validationResult } from "express-validator";
import ManagersService from "../services/managers.service";
import orderService from "../services/order.service";
import Token from "../models/token.model";
import { Types } from "mongoose";

class ManagersController {
  async registration(req: Request, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        //TODO: investigate how to fix below code
        //@ts-ignore
        const errorMessages = errors.errors.map((el) => el.msg);
        return res
          .status(400)
          .json({ IsSuccess: false, ErrorMessage: VALIDATION_ERROR_MESSAGES.BODY, reason: errorMessages });
      }
      const { username, password, firstName, lastName } = req.body;

      const candidate = await Manager.findOne({ username });
      if (candidate) {
        return res
          .status(400)
          .json({ IsSuccess: false, ErrorMessage: `Manager with username '${username}' already exists` });
      }

      const manager = await ManagersService.create({ username, password, firstName, lastName });

      return res.status(201).json({
        IsSuccess: true,
        ErrorMessage: null,
        Manager: manager,
      });
    } catch (e) {
      console.log(e);
      res.status(400).json({ IsSuccess: false, ErrorMessage: "Registration error", reason: (e as Error).message });
    }
  }

  async getManagers(req: Request, res: Response) {
    try {
      const managers = await ManagersService.getManagers();
      res.json({ Managers: managers, IsSuccess: true, ErrorMessage: null });
    } catch (e) {
      console.log(e);
      res
        .status(400)
        .json({ IsSuccess: false, ErrorMessage: VALIDATION_ERROR_MESSAGES.GET_MANAGERS, reason: (e as Error).message });
    }
  }

  async getManager(req: Request, res: Response) {
    try {
      const managerId = req.params.managerId;
      if (!managerId) {
        throw new Error("Id was not provided");
      }
      const [manager, orders] = await Promise.all([
        ManagersService.getManager(managerId),
        orderService.getOrdersByManager(managerId),
      ]);
      if (!manager) {
        return res.status(404).json({ IsSuccess: false, ErrorMessage: "Manager was not found" });
      }
      res.json({ Manager: manager, Orders: orders, IsSuccess: true, ErrorMessage: null });
    } catch (e) {
      console.log(e);
      res
        .status(400)
        .json({ IsSuccess: false, ErrorMessage: VALIDATION_ERROR_MESSAGES.GET_MANAGERS, reason: (e as Error).message });
    }
  }

  async getMe(req: Request, res: Response) {
    try {
      const tokenManager = req["manager"] as { id?: string } | undefined;
      const id = tokenManager?.id;

      if (!id) {
        return res.status(401).json({ IsSuccess: false, ErrorMessage: "Not authorized" });
      }

      const manager = await ManagersService.getManager(id);
      if (!manager) {
        return res.status(404).json({ IsSuccess: false, ErrorMessage: "Manager was not found" });
      }

      return res.json({ Manager: manager, IsSuccess: true, ErrorMessage: null });
    } catch (e) {
      console.log(e);
      return res
        .status(400)
        .json({ IsSuccess: false, ErrorMessage: VALIDATION_ERROR_MESSAGES.GET_MANAGERS, reason: (e as Error).message });
    }
  }

  async deleteManager(req: Request, res: Response) {
    try {
      const managerId = req.params.managerId;
      if (!managerId) {
        throw new Error("Id was not provided");
      }
      const deletedManager = await ManagersService.delete(managerId);
      if (!deletedManager) {
        return res.status(404).json({ IsSuccess: false, ErrorMessage: "Manager was not found" });
      }
      await Token.deleteMany({ managerId: new Types.ObjectId(managerId) });
      return res.status(204).send();
    } catch (e) {
      console.log(e);
      return res
        .status(400)
        .json({ IsSuccess: false, ErrorMessage: "Failed to delete manager", reason: (e as Error).message });
    }
  }

  async changePassword(req: Request, res: Response) {
    try {
      const managerId = req.params.managerId;
      const { oldPassword, newPassword } = req.body;

      const updatedManager = await ManagersService.updatePassword(managerId, oldPassword, newPassword);

      return res.status(200).json({ IsSuccess: true, ErrorMessage: null, Manager: updatedManager });
    } catch (error) {
      console.log(error);
      return res.status(400).json({ IsSuccess: false, ErrorMessage: "Failed to update password." });
    }
  }
}

export default new ManagersController();
