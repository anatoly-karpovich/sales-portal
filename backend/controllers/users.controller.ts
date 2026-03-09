import { VALIDATION_ERROR_MESSAGES } from "../data/enums";
import { Request, Response } from "express";
import User from "../models/user.model";
import { validationResult } from "express-validator";
import _ from "lodash";
import UsersService from "../services/users.service";
import orderService from "../services/order.service";
import { getUserFromRequest } from "../utils/utils";
import Token from "../models/token.model";
import { Types } from "mongoose";

class UsersController {
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

      const candidate = await User.findOne({ username });
      if (candidate) {
        return res
          .status(400)
          .json({ IsSuccess: false, ErrorMessage: `User with username '${username}' already exists` });
      }

      const user = await UsersService.create({ username, password, firstName, lastName });

      return res.status(201).json({
        IsSuccess: true,
        ErrorMessage: null,
        User: user,
      });
    } catch (e) {
      console.log(e);
      res.status(400).json({ IsSuccess: false, ErrorMessage: "Registration error", reason: (e as Error).message });
    }
  }

  async getUsers(req: Request, res: Response) {
    try {
      const users = await UsersService.getUsers();
      res.json({ Users: users, IsSuccess: true, ErrorMessage: null });
    } catch (e) {
      console.log(e);
      res
        .status(400)
        .json({ IsSuccess: false, ErrorMessage: VALIDATION_ERROR_MESSAGES.GET_USERS, reason: (e as Error).message });
    }
  }

  async getUser(req: Request, res: Response) {
    try {
      const id = req.params.userId;
      if (!id) {
        throw new Error("Id was not provided");
      }
      const [user, orders] = await Promise.all([UsersService.getUser(id), orderService.getOrdersByManager(id)]);
      res.json({ User: user, Orders: orders, IsSuccess: true, ErrorMessage: null });
    } catch (e) {
      console.log(e);
      res
        .status(400)
        .json({ IsSuccess: false, ErrorMessage: VALIDATION_ERROR_MESSAGES.GET_USERS, reason: (e as Error).message });
    }
  }

  async getMe(req: Request, res: Response) {
    try {
      const tokenUser = req["user"] as { id?: string } | undefined;
      const id = tokenUser?.id;

      if (!id) {
        return res.status(401).json({ IsSuccess: false, ErrorMessage: "Not authorized" });
      }

      const user = await UsersService.getUser(id);
      if (!user) {
        return res.status(404).json({ IsSuccess: false, ErrorMessage: "User was not found" });
      }

      return res.json({ User: user, IsSuccess: true, ErrorMessage: null });
    } catch (e) {
      console.log(e);
      return res
        .status(400)
        .json({ IsSuccess: false, ErrorMessage: VALIDATION_ERROR_MESSAGES.GET_USERS, reason: (e as Error).message });
    }
  }

  async deleteUser(req: Request, res: Response) {
    try {
      const id = req.params.userId;
      if (!id) {
        throw new Error("Id was not provided");
      }
      const performer = getUserFromRequest(req);
      const deletedUser = await UsersService.delete(id);
      if (performer.id === deletedUser._id.toString()) {
        await Token.deleteMany({ "token._id": new Types.ObjectId(performer.id) });
      }
      res.status(204).json({ IsSuccess: true, ErrorMessage: null, User: deletedUser });
    } catch (e) {
      console.log(e);
      res.status(400).json({ IsSuccess: false, ErrorMessage: "Failed to delete user", reason: (e as Error).message });
    }
  }

  async changePassword(req: Request, res: Response) {
    try {
      const userId = req.params.userId;
      const { oldPassword, newPassword } = req.body;

      const updatedUser = await UsersService.updatePassword(userId, oldPassword, newPassword);

      return res.status(200).json({ IsSuccess: true, ErrorMessage: null, User: updatedUser });
    } catch (error) {
      console.log(error);
      return res.status(400).json({ IsSuccess: false, ErrorMessage: "Failed to update password." });
    }
  }
}

export default new UsersController();

