import InventoryService from "../services/inventory.service";
import { SettingsService } from "../services/settings.service";

let reservationInterval: NodeJS.Timeout | null = null;

export const startReservationExpirationJob = async () => {
  const settingsService = new SettingsService();
  const settings = await settingsService.get();
  const intervalMs = settings?.reservations?.cronIntervalMs ?? 5 * 60 * 1000;

  if (reservationInterval) {
    clearInterval(reservationInterval);
  }

  reservationInterval = setInterval(async () => {
    try {
      const result = await InventoryService.expireReservations();
      if (result.expired > 0) {
        console.log(`Expired reservations processed: ${result.expired}`);
      }
    } catch (error) {
      console.error("Reservation expiration job failed", error);
    }
  }, intervalMs);
};
