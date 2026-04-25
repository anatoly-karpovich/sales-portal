import { IManager, IManagerWithRoles } from "../data/types/manager.types";
import Manager from "../models/manager.model";
import { getTodaysDate } from "../utils/utils";
import Role from "../models/role.model";
import { ROLES } from "../data/enums";
import bcrypt from "bcrypt";
import _ from "lodash";
import { Types } from "mongoose";

class ManagersService {
  async create(manager: IManager): Promise<IManagerWithRoles> {
    const hashPassword = bcrypt.hashSync(manager.password, 7);
    const managerRole = await Role.findOne({ value: ROLES.USER });
    const registeredManager = await Manager.create({
      ...manager,
      password: hashPassword,
      roles: [managerRole.value],
      createdOn: getTodaysDate(true),
    });
    return _.omit(registeredManager.toObject(), ["password"]);
  }

  async delete(id: string) {
    return await Manager.findByIdAndDelete(new Types.ObjectId(id));
  }

  async getManager(id: string) {
    const manager = await Manager.findById(new Types.ObjectId(id));
    return manager ? _.omit(manager.toObject(), ["password"]) : null;
  }

  async getAdmin() {
    return await Manager.findOne({ role: ROLES.ADMIN });
  }

  async getManagerByUsername(username: string) {
    const manager = await Manager.findOne({ username });
    return manager ? _.omit(manager.toObject(), ["password"]) : null;
  }

  async getManagers() {
    const managers = (await Manager.find()).map((manager) => {
      return _.omit(manager.toObject(), ["password"]);
    });

    return managers;
  }

  async getManagersByIds(ids: string[]) {
    if (!ids.length) {
      return [];
    }

    const objectIds = ids.map((id) => new Types.ObjectId(id));
    return Manager.find({ _id: { $in: objectIds } }, { _id: 1, username: 1, firstName: 1, lastName: 1 })
      .lean()
      .exec();
  }

  async getManagerName(id: string) {
    const manager = await Manager.findById(new Types.ObjectId(id));
    return `${manager.firstName} ${manager.lastName}`;
  }

  async updatePassword(managerId: string, oldPassword: string, newPassword: string) {
    const manager = await Manager.findById(new Types.ObjectId(managerId));

    const hashPassword = bcrypt.hashSync(newPassword, 7);

    manager.password = hashPassword;
    await manager.save();

    return await this.getManager(managerId);
  }
}

export default new ManagersService();
