import * as dotenv from "dotenv";
import mongoose from "mongoose";
import { CORE_US_DEFAULT_CITIES, DEFAULT_SETTINGS } from "../../data/defaultSettings";
import SettingsModel from "../../models/settings.model";
import { getDbUrl } from "../url";

dotenv.config();

async function runMigration() {
  const dbUrl = getDbUrl();
  await mongoose.connect(dbUrl, {});

  const initResult = await SettingsModel.updateOne({}, { $setOnInsert: DEFAULT_SETTINGS }, { upsert: true });
  const addCitiesResult = await SettingsModel.updateOne(
    {},
    {
      $addToSet: {
        "delivery.defaultCities": { $each: CORE_US_DEFAULT_CITIES },
      },
    },
  );

  if (initResult.upsertedCount > 0) {
    console.log("Settings were created with default cities");
    return;
  }

  if (addCitiesResult.modifiedCount > 0) {
    console.log("Settings updated: core US cities were added");
    return;
  }

  console.log("Settings migration skipped: all core US cities already exist");
}

runMigration()
  .catch((error) => {
    console.error("Add core US cities migration failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
