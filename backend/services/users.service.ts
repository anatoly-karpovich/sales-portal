import { IUser, IUserWithRoles } from "../data/types/users.types";
import User from "../models/user.model";
import { getTodaysDate } from "../utils/utils";
import Role from "../models/role.model";
import { ROLES } from "../data/enums";
import bcrypt from "bcrypt";
import _ from "lodash";
import { Types } from "mongoose";

class UsersService {
  async create(user: IUser): Promise<IUserWithRoles> {
    const hashPassword = bcrypt.hashSync(user.password, 7);
    const userRole = await Role.findOne({ value: ROLES.USER });
    const registeredUser = await User.create({
      ...user,
      password: hashPassword,
      roles: [userRole.value],
      createdOn: getTodaysDate(true),
    });
    return _.omit(registeredUser.toObject(), ["password"]);
  }

  async delete(id: string) {
    return await User.findByIdAndDelete(new Types.ObjectId(id));
  }

  async getUser(id: string) {
    const user = await User.findById(new Types.ObjectId(id));
    return user ? _.omit(user.toObject(), ["password"]) : null;
  }

  async getAdmin() {
    return await User.findOne({ role: ROLES.ADMIN });
  }

  async getUserByUsername(username: string) {
    const user = await User.findOne({ username });
    return user ? _.omit(user.toObject(), ["password"]) : null;
  }

  async getUsers() {
    const users = (await User.find()).map((user) => {
      return _.omit(user.toObject(), ["password"]);
    });

    return users;
  }

  async getUserName(id: string) {
    const manager = await User.findById(new Types.ObjectId(id));
    return `${manager.firstName} ${manager.lastName}`;
  }

  async updatePassword(userId: string, oldPassword: string, newPassword: string) {
    const user = await User.findById(new Types.ObjectId(userId));

    const hashPassword = bcrypt.hashSync(newPassword, 7);

    user.password = hashPassword;
    await user.save();

    return await this.getUser(userId);
  }
}

export default new UsersService();

