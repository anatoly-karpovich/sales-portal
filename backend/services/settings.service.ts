import { ISettings } from "../data/types/settings.type";
import { RecursivePartial } from "../data/types/utils.types";
import SettingsModel from "../models/settings.model";
import {
  DEFAULT_RESERVATION_CRON_INTERVAL_MS,
  startReservationExpirationJob,
} from "../cron/reservationExpiration.job";

export class SettingsService {
  private model = SettingsModel;

  private resolveReservationIntervalMs(settings: Partial<ISettings> | null | undefined): number {
    const intervalMs = settings?.reservations?.cronIntervalMs;
    if (typeof intervalMs === "number" && intervalMs >= 1000) {
      return intervalMs;
    }
    return DEFAULT_RESERVATION_CRON_INTERVAL_MS;
  }

  private async runPostUpdateHooks(prev: ISettings | null, next: ISettings | null) {
    const previousIntervalMs = this.resolveReservationIntervalMs(prev);
    const nextIntervalMs = this.resolveReservationIntervalMs(next);

    if (previousIntervalMs !== nextIntervalMs) {
      await startReservationExpirationJob(nextIntervalMs);
      console.log(
        `Reservation expiration interval updated from ${previousIntervalMs}ms to ${nextIntervalMs}ms`,
      );
    }
  }

  async create(data: ISettings) {
    const existingSettings = await this.model.findOne().lean().exec();
    if (existingSettings) {
      throw new Error("Settings already exists");
    }
    return await this.model.create(data);
  }

  async update(data: RecursivePartial<ISettings>) {
    const previousSettings = await this.model.findOne().lean().exec();
    const updatedSettings = await this.model.findOneAndUpdate(
      {},
      data,
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    await this.runPostUpdateHooks(previousSettings, updatedSettings?.toObject?.() ?? (updatedSettings as unknown as ISettings));
    return updatedSettings;
  }

  async get() {
    return await this.model.findOne().lean().exec();
  }
}
