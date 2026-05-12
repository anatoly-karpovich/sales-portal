import bcrypt from "bcrypt";
import { ROLES } from "../data/enums";
import { DEFAULT_SETTINGS } from "../data/defaultSettings";
import managerModel from "../models/manager.model";
import SettingsModel from "../models/settings.model";
import roleModel from "../models/role.model";
import managersService from "../services/managers.service";
import CategoriesService from "../services/categories.service";
import { getTodaysDate } from "../utils/utils";

async function seedDefaultSettings() {
  const settingsExists = await SettingsModel.findOne().lean().exec();
  if (!settingsExists) {
    await SettingsModel.create(DEFAULT_SETTINGS);
    console.log("Settings defaults created");
  }
}

export async function seed() {
  const adminExists = await managersService.getAdmin();

  if (!adminExists) {
    const passwordHash = await bcrypt.hashSync("admin123", 7);
    await managerModel.create({
      password: passwordHash,
      username: "admin@example.com",
      firstName: "Admin",
      lastName: "Admin",
      roles: [ROLES.ADMIN],
      createdOn: getTodaysDate(true),
    });
    console.log("Admin manager created");
  }

  for (const roleName of Object.values(ROLES)) {
    const roleExists = await roleModel.findOne({ value: roleName });
    if (!roleExists) {
      await roleModel.create({ value: roleName });
      console.log(`Role ${roleName} created`);
    }
  }

  await seedDefaultSettings();
  await CategoriesService.ensureTreeExists();
}
