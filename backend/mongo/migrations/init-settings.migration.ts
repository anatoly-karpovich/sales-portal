import * as dotenv from "dotenv";
import mongoose from "mongoose";
import { DEFAULT_SETTINGS } from "../../data/defaultSettings";
import SettingsModel from "../../models/settings.model";
import { getDbUrl } from "../url";

dotenv.config();

async function runMigration() {
  const dbUrl = getDbUrl();
  await mongoose.connect(dbUrl, {});

  const result = await SettingsModel.updateOne({}, { $setOnInsert: DEFAULT_SETTINGS }, { upsert: true });

  if (result.upsertedCount > 0) {
    console.log("Settings migration completed: default settings created");
    return;
  }

  console.log("Settings migration skipped: settings already exist");
}

runMigration()
  .catch((error) => {
    console.error("Settings migration failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
