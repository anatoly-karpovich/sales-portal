import { ROLES } from "../data/enums";
import bcrypt from "bcrypt";
import managersService from "../services/managers.service";
import managerModel from "../models/manager.model";
import { getTodaysDate } from "../utils/utils";
import roleModel from "../models/role.model";

export async function seed() {
  const adminExists = await managersService.getAdmin();

  if (!adminExists) {
    const passwordHash = await bcrypt.hashSync("admin123", 7); // временный пароль
    await managerModel.create({
      password: passwordHash,
      username: "admin@example.com",
      firstName: "Admin",
      lastName: "Admin",
      roles: [ROLES.ADMIN],
      createdOn: getTodaysDate(true),
    });
    console.log("✅ Admin manager created");
  }

  for (const roleName of Object.values(ROLES)) {
    const roleExists = await roleModel.findOne({ value: roleName });
    if (!roleExists) {
      await roleModel.create({ value: roleName });
      console.log(`✅ Role ${roleName} created`);
    }
  }
}
