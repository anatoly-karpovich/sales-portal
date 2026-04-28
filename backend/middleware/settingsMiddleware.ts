import { NextFunction, Response } from "express";
import { BaseResponseDTO } from "../data/types/dto/common.dto.js";
import { CreateSettingsRequestDTO, UpdateSettingsRequestDTO } from "../data/types/dto/settings.dto.js";
import SettingsModel from "../models/settings.model.js";
import { US_STATE_CODES } from "../data/usStates.js";

type DeliveryPayload = {
  pickupLocations?: unknown;
};

function normalizePickupLocations(value: unknown): Record<string, unknown> {
  if (value instanceof Map) {
    return Object.fromEntries(value.entries());
  }
  if (value && typeof value === "object") {
    return value as Record<string, unknown>;
  }
  return {};
}

function validatePickupLocationIdsUniqueness(pickupLocations: Record<string, unknown>): string | null {
  const ids = new Set<string>();
  for (const [state, locations] of Object.entries(pickupLocations)) {
    if (!Array.isArray(locations)) {
      continue;
    }
    for (const location of locations) {
      const id = (location as { id?: unknown })?.id;
      if (typeof id !== "string") {
        continue;
      }
      if (ids.has(id)) {
        return `Incorrect delivery settings: duplicate pickup location id '${id}' in state '${state}'`;
      }
      ids.add(id);
    }
  }
  return null;
}

function validateDeliveryConsistency(delivery: DeliveryPayload): string | null {
  const pickupLocations = normalizePickupLocations(delivery.pickupLocations);
  const unknownStateKeys = Object.keys(pickupLocations).filter(
    (state) => !US_STATE_CODES.includes(state as (typeof US_STATE_CODES)[number]),
  );

  if (unknownStateKeys.length > 0) {
    return `Incorrect delivery settings: unknown states in pickupLocations: ${unknownStateKeys.join(", ")}`;
  }

  return validatePickupLocationIdsUniqueness(pickupLocations);
}

export async function settingsCreateDeliveryConsistency(
  req: CreateSettingsRequestDTO,
  res: Response<BaseResponseDTO>,
  next: NextFunction,
) {
  try {
    const error = validateDeliveryConsistency(req.body.delivery ?? {});
    if (error) {
      return res.status(400).json({ IsSuccess: false, ErrorMessage: error });
    }
    next();
  } catch (e: any) {
    return res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
  }
}

export async function settingsUpdateDeliveryConsistency(
  req: UpdateSettingsRequestDTO,
  res: Response<BaseResponseDTO>,
  next: NextFunction,
) {
  try {
    if (!req.body?.delivery) {
      return next();
    }

    const existingSettings = await SettingsModel.findOne().lean().exec();
    const existingDelivery = (existingSettings?.delivery ?? {}) as DeliveryPayload;
    const payloadDelivery = req.body.delivery as DeliveryPayload;

    const nextDelivery: DeliveryPayload = {
      pickupLocations: payloadDelivery.pickupLocations ?? existingDelivery.pickupLocations,
    };

    if (nextDelivery.pickupLocations === undefined) {
      return res.status(400).json({
        IsSuccess: false,
        ErrorMessage: "Incorrect delivery settings: delivery.pickupLocations must be defined",
      });
    }

    const error = validateDeliveryConsistency(nextDelivery);
    if (error) {
      return res.status(400).json({ IsSuccess: false, ErrorMessage: error });
    }

    next();
  } catch (e: any) {
    return res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
  }
}
