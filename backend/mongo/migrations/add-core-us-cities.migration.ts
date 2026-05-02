import * as dotenv from "dotenv";
import mongoose from "mongoose";
import { DEFAULT_SETTINGS } from "../../data/defaultSettings";
import SettingsModel from "../../models/settings.model";
import { getDbUrl } from "../url";

dotenv.config();

async function runMigration() {
  const dbUrl = getDbUrl();
  await mongoose.connect(dbUrl, {});

  const existingSettings = await SettingsModel.findOne().lean().exec();

  if (!existingSettings) {
    await SettingsModel.create(DEFAULT_SETTINGS);
    console.log("Settings were created with default pickup locations");
    return;
  }

  const existingPickupLocations = (existingSettings.shipping?.pickup?.locations ?? {}) as Record<
    string,
    Array<{ id: string }>
  >;

  const locationUpdates: Record<string, unknown> = {};

  for (const [state, defaultLocations] of Object.entries(DEFAULT_SETTINGS.shipping.pickup.locations)) {
    const existingLocations = existingPickupLocations[state] ?? [];
    if (!existingLocations.length) {
      locationUpdates[`shipping.pickup.locations.${state}`] = defaultLocations;
      continue;
    }

    const existingIds = new Set(existingLocations.map((location) => location.id));
    const missingLocations = defaultLocations.filter((location) => !existingIds.has(location.id));

    if (missingLocations.length > 0) {
      locationUpdates[`shipping.pickup.locations.${state}`] = [...existingLocations, ...missingLocations];
    }
  }

  let updateResult = { modifiedCount: 0 };
  if (Object.keys(locationUpdates).length > 0) {
    updateResult = await SettingsModel.updateOne({}, { $set: locationUpdates });
  }

  if (updateResult.modifiedCount > 0) {
    console.log("Settings updated: default pickup locations were synchronized");
    return;
  }

  console.log("Settings migration skipped: pickup locations are already up to date");
}

runMigration()
  .catch((error) => {
    console.error("Add core pickup locations migration failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
