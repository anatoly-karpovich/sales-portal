import { Request, Response, NextFunction } from "express";
import ManagersService from "../services/managers.service.js";
import { ROLES } from "../data/enums.js";
import { getManagerFromRequest } from "../utils/utils.js";

export async function deleteManagerMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.managerId;
    if (!id) {
      throw new Error("Id was not provided");
    }

    const performer = getManagerFromRequest(req);
    const managerToDelete = await ManagersService.getManager(req.params.managerId);
    if (!managerToDelete) {
      return res.status(404).json({ IsSuccess: false, ErrorMessage: "Manager was not found" });
    }
    if (managerToDelete && managerToDelete.roles.includes(ROLES.ADMIN)) {
      return res.status(403).json({ IsSuccess: false, ErrorMessage: "Not allowed to delete admin" });
    }
    if (managerToDelete._id.toString() !== performer.id && !performer.roles.includes(ROLES.ADMIN)) {
      return res.status(403).json({ IsSuccess: false, ErrorMessage: "Not allowed to delete manager" });
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
    const manager = await ManagersService.getManager(id);
    if (!manager) {
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
    const manager = await ManagersService.getManager(id);
    // if (!manager.roles.includes(ROLES.USER) || !manager.roles.includes(ROLES.ADMIN))
    if (!manager.roles.some((r) => [ROLES.USER, ROLES.ADMIN].includes(r as ROLES)))
      return res
        .status(403)
        .json({ IsSuccess: false, ErrorMessage: `Assignment failed: the selected account has no manager role.` });

    next();
  } catch (e: any) {
    console.log(e);
    return res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
  }
}
