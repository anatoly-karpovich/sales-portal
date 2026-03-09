import { NextFunction, Request, Response } from "express";
import { getUserFromRequest } from "../utils/utils";
import User from "../models/user.model";
import bcrypt from "bcrypt";
import { ROLES } from "../data/enums";
import userModel from "../models/user.model";

export async function changePasswordMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const dataFromToken = getUserFromRequest(req);
    const user = await userModel.findById(req.params.userId);
    const userId = req.params.userId;
    if (userId !== dataFromToken.id && !dataFromToken.roles.includes(ROLES.ADMIN)) {
      return res.status(403).json({ IsSuccess: false, ErrorMessage: "Not allowed to change password" });
    }

    if (user.roles.includes(ROLES.ADMIN)) {
      return res.status(403).json({ IsSuccess: false, ErrorMessage: "Not allowed to change password" });
    }

    const { oldPassword, newPassword } = req.body;
    // Проверяем старый пароль
    const isPasswordValid = bcrypt.compareSync(oldPassword, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ IsSuccess: false, ErrorMessage: "Old password is incorrect." });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ IsSuccess: false, ErrorMessage: "Password can't be less then 8 characters" });
    }
    next();
  } catch (e) {
    console.log(e);
    return res.status(500).json({ IsSuccess: false, ErrorMessage: (e as Error).message });
  }
}
