import { TokenExpiredError } from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import Token from "../models/token.model";
import { getDataDataFromToken, getTokenFromRequest } from "../utils/utils";

export async function authmiddleware(req: Request, res: Response, next: NextFunction) {
  if (req.method === "OPTIONS") {
    return next();
  }

  try {
    if (!req.headers.authorization) {
      return res.status(401).json({ IsSuccess: false, ErrorMessage: "Not authorized" });
    }

    const token = getTokenFromRequest(req);
    if (!token) {
      return res.status(401).json({ IsSuccess: false, ErrorMessage: "Not authorized" });
    }

    const foundToken = await Token.findOne({ token });
    if (!foundToken) {
      return res.status(401).json({ IsSuccess: false, ErrorMessage: "Invalid access token" });
    }

    let decodedData: ReturnType<typeof getDataDataFromToken>;
    try {
      decodedData = getDataDataFromToken(token);
      req["manager"] = decodedData;
    } catch (e) {
      await Token.deleteOne({ token });
      return res.status(401).json({ IsSuccess: false, ErrorMessage: "Access token expired" });
    }

    const now = new Date();
    const newExpirationDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    foundToken.expiresAt = newExpirationDate;
    await foundToken.save();

    next();
  } catch (e: any) {
    console.log(e);
    if (e instanceof TokenExpiredError) {
      return res.status(401).json({
        IsSuccess: false,
        ErrorMessage: "Access token expired",
      });
    }
    return res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
  }
}
