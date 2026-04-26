import * as dotenv from "dotenv";
import mongoose from "mongoose";
import { CORE_US_DEFAULT_CITIES, DEFAULT_SETTINGS } from "../../data/defaultSettings";
import SettingsModel from "../../models/settings.model";
import { getDbUrl } from "../url";

dotenv.config();

async function runMigration() {
  const dbUrl = getDbUrl();
  await mongoose.connect(dbUrl, {});

  const existingSettings = await SettingsModel.findOne().lean().exec();

  if (!existingSettings) {
    await SettingsModel.create(DEFAULT_SETTINGS);
    console.log("Settings were created with default cities and pickup addresses");
    return;
  }

  const addCitiesResult = await SettingsModel.updateOne(
    {},
    {
      $addToSet: {
        "delivery.defaultCities": { $each: CORE_US_DEFAULT_CITIES },
      },
    },
  );

  const existingPickupAddresses = (existingSettings.delivery?.pickupAddresses ?? {}) as Record<
    string,
    { street: string; house: number; flat: number }
  >;

  const pickupAddressUpdates: Record<string, unknown> = {};
  for (const city of CORE_US_DEFAULT_CITIES) {
    if (!existingPickupAddresses[city]) {
      pickupAddressUpdates[`delivery.pickupAddresses.${city}`] = DEFAULT_SETTINGS.delivery.pickupAddresses[city];
    }
  }

  let addPickupAddressesResult = { modifiedCount: 0 };
  if (Object.keys(pickupAddressUpdates).length > 0) {
    addPickupAddressesResult = await SettingsModel.updateOne({}, { $set: pickupAddressUpdates });
  }

  if (addCitiesResult.modifiedCount > 0 || addPickupAddressesResult.modifiedCount > 0) {
    console.log("Settings updated: core US cities and pickup addresses were synchronized");
    return;
  }

  console.log("Settings migration skipped: core US cities and pickup addresses are already up to date");
}

runMigration()
  .catch((error) => {
    console.error("Add core US cities migration failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
