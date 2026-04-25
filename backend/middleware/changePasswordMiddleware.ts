import { NextFunction, Request, Response } from "express";
import { getManagerFromRequest } from "../utils/utils";
import bcrypt from "bcrypt";
import { ROLES } from "../data/enums";
import managerModel from "../models/manager.model";

export async function changePasswordMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const dataFromToken = getManagerFromRequest(req);
    const manager = await managerModel.findById(req.params.managerId);
    const managerId = req.params.managerId;
    if (!manager) {
      return res.status(404).json({ IsSuccess: false, ErrorMessage: "Manager was not found" });
    }
    if (managerId !== dataFromToken.id && !dataFromToken.roles.includes(ROLES.ADMIN)) {
      return res.status(403).json({ IsSuccess: false, ErrorMessage: "Not allowed to change password" });
    }

    if (manager.roles.includes(ROLES.ADMIN)) {
      return res.status(403).json({ IsSuccess: false, ErrorMessage: "Not allowed to change password" });
    }

    const { oldPassword, newPassword } = req.body;
    // Проверяем старый пароль
    const isPasswordValid = bcrypt.compareSync(oldPassword, manager.password);
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
