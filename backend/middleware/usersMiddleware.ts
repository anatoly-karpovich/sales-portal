import { Request, Response, NextFunction } from "express";
import UsersService from "../services/users.service.js";
import { ROLES } from "../data/enums.js";
import { getUserFromRequest } from "../utils/utils.js";
import mongoose from "mongoose";

export async function deleteUserMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.userId;
    if (!id) {
      throw new Error("Id was not provided");
    }

    const performer = getUserFromRequest(req);
    const userToDelete = await UsersService.getUser(req.params.userId);
    if (userToDelete && userToDelete.roles.includes(ROLES.ADMIN)) {
      return res.status(403).json({ IsSuccess: false, ErrorMessage: "Not allowed to delete admin" });
    }
    if (userToDelete._id.toString() !== performer.id && !performer.roles.includes(ROLES.ADMIN)) {
      return res.status(403).json({ IsSuccess: false, ErrorMessage: "Not allowed to delete user" });
    }

    next();
  } catch (e) {
    console.log(e);
    return res.status(500).json({ IsSuccess: false, ErrorMessage: (e as Error).message });
  }
}

export async function managerById(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.managerId;
    const user = await UsersService.getUser(id);
    if (!user) {
      return res.status(404).json({ IsSuccess: false, ErrorMessage: `Manager with id '${id}' wasn't found` });
    }
    next();
  } catch (e: any) {
    console.log(e);
    return res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
  }
}

export async function isManager(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.managerId;
    const user = await UsersService.getUser(id);
    // if (!user.roles.includes(ROLES.USER) || !user.roles.includes(ROLES.ADMIN))
    if (!user.roles.some((r) => [ROLES.USER, ROLES.ADMIN].includes(r as ROLES)))
      return res
        .status(403)
        .json({ IsSuccess: false, ErrorMessage: `Assignment failed: the chosen user is not a manager.` });

    next();
  } catch (e: any) {
    console.log(e);
    return res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
  }
}
