import Manager from "../models/manager.model";
import Token from "../models/token.model";
import bcrypt from "bcrypt";
import jsonwebtoken from "jsonwebtoken";
import { Request, Response } from "express";
import { Types } from "mongoose";
import _ from "lodash";
import { getTokenFromRequest } from "../utils/utils";

const generateAccessToken = (id: Types.ObjectId, roles: string[]) => {
  const payload = {
    id,
    roles,
  };
  return jsonwebtoken.sign(payload, process.env.SECRET_KEY, { expiresIn: "24h" });
};

class AuthController {
  async login(req: Request, res: Response) {
    try {
      const { username, password } = req.body;
      const manager = await Manager.findOne({ username });
      if (!manager) {
        return res.status(400).json({ IsSuccess: false, ErrorMessage: "Incorrect credentials" });
      }
      const isValidPassword = bcrypt.compareSync(password, manager.password);
      if (!isValidPassword) {
        return res.status(400).json({ IsSuccess: false, ErrorMessage: "Incorrect credentials" });
      }

      await Token.deleteMany({ expiresAt: { $lt: new Date() } });

      const now = new Date();

      const existingToken = await Token.findOne({
        managerId: manager._id,
        expiresAt: { $gt: now }, // Проверяем, что токен еще жив
      });

      if (existingToken) {
        console.log("Returning existing active token");
        const newExpirationDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        existingToken.expiresAt = newExpirationDate;
        await existingToken.save();
        return res
          .header("Authorization", existingToken.token)
          .header("X-Manager-Name", manager.firstName)
          .json({
            IsSuccess: true,
            ErrorMessage: null,
            Manager: _.omit(manager.toObject(), ["password"]),
          });
      }

      const token = generateAccessToken(manager._id, manager.roles);
      const expirationDate = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await new Token({ managerId: manager._id, token, expiresAt: expirationDate }).save();

      return res
        .header("Authorization", token)
        .header("X-Manager-Name", manager.firstName)
        .json({ IsSuccess: true, ErrorMessage: null, Manager: _.omit(manager.toObject(), ["password"]) });
    } catch (e) {
      console.log(e);
      res.status(400).json({ IsSuccess: false, ErrorMessage: "Login error", reason: (e as Error).message });
    }
  }

  async logout(req: Request, res: Response) {
    try {
      const token = getTokenFromRequest(req);

      // Удаляем только этот конкретный токен
      await Token.deleteOne({ token });

      return res.json({ IsSuccess: true, ErrorMessage: null });
    } catch (e) {
      console.log(e);
      res.status(400).json({ IsSuccess: false, ErrorMessage: "Logout error", reason: (e as Error).message });
    }
  }
}

export default new AuthController();
