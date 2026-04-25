import jsonwebtoken from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { ROLES } from "../data/enums.js";
import { getDataDataFromToken, getTokenFromRequest } from "../utils/utils.js";

export const roleMiddleware = (roles: ROLES) => {
  return function (req: Request, res: Response, next: NextFunction) {
    if (req.method === "options") {
      next();
    }

    try {
      const token = getTokenFromRequest(req);
      if (!token) {
        return res.status(401).json({ IsSuccess: false, ErrorMessage: "Not authorized" });
      }
      const { roles: managerRoles } = getDataDataFromToken(token) as jsonwebtoken.JwtPayload;
      let hasRole = false;
      managerRoles.forEach((role) => {
        if (roles.includes(role)) {
          hasRole = true;
        }
      });
      if (!hasRole) {
        return res.status(403).json({ IsSuccess: false, ErrorMessage: "Access denied" });
      }
      next();
    } catch (e: any) {
      console.log(e);
      return res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
    }
  };
};
