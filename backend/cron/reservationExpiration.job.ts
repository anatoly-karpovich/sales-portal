import InventoryService from "../services/inventory.service";

export const DEFAULT_RESERVATION_CRON_INTERVAL_MS = 5 * 60 * 1000;

let reservationInterval: NodeJS.Timeout | null = null;

export const startReservationExpirationJob = async (intervalMs: number = DEFAULT_RESERVATION_CRON_INTERVAL_MS) => {
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
