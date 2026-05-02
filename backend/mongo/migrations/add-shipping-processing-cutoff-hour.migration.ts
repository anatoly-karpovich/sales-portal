import * as dotenv from "dotenv";
import mongoose from "mongoose";
import SettingsModel from "../../models/settings.model";
import { getDbUrl } from "../url";

dotenv.config();

async function runMigration() {
  const dbUrl = getDbUrl();
  await mongoose.connect(dbUrl, {});

  const result = await SettingsModel.updateMany(
    { "shipping.processing.cutoffHour": { $exists: false } },
    { $set: { "shipping.processing.cutoffHour": 18 } },
  );

  if (result.modifiedCount > 0) {
    console.log(`Settings updated: cutoffHour set to 18 for ${result.modifiedCount} document(s)`);
    return;
  }

  console.log("Settings migration skipped: shipping.processing.cutoffHour already exists");
}

runMigration()
  .catch((error) => {
    console.error("Add shipping processing cutoff hour migration failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
