import * as dotenv from "dotenv";
import mongoose from "mongoose";
import SettingsModel from "../../models/settings.model";
import { getDbUrl } from "../url";

dotenv.config();

async function runMigration() {
  const dbUrl = getDbUrl();
  await mongoose.connect(dbUrl, {});

  const result = await SettingsModel.updateMany(
    {
      $or: [
        { "inventory.allowSellingOutOfStockByDefault": { $exists: false } },
        { reservations: { $exists: false } },
      ],
    },
    {
      $set: {
        "inventory.allowSellingOutOfStockByDefault": false,
        reservations: {
          adminDraftReservationTtlMs: 24 * 60 * 60 * 1000,
          customerPaymentReservationTtlMs: 15 * 60 * 1000,
          cronIntervalMs: 5 * 60 * 1000,
        },
      },
    },
  );

  if (result.modifiedCount > 0) {
    console.log(`Settings updated: inventory/reservation defaults added for ${result.modifiedCount} document(s)`);
    return;
  }

  console.log("Settings migration skipped: inventory/reservation fields already exist");
}

runMigration()
  .catch((error) => {
    console.error("Add inventory/reservations settings migration failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
