import { NextFunction, Response } from "express";
import { BaseResponseDTO } from "../data/types/dto/common.dto.js";
import { CreateSettingsRequestDTO, UpdateSettingsRequestDTO } from "../data/types/dto/settings.dto.js";
import SettingsModel from "../models/settings.model.js";
import { US_STATE_CODES } from "../data/usStates.js";

type ShippingPayload = {
  delivery?: {
    pricing?: unknown;
  };
  pickup?: {
    locations?: unknown;
    policy?: unknown;
  };
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

function validateShippingConsistency(shipping: ShippingPayload): string | null {
  const pickupLocations = normalizePickupLocations(shipping.pickup?.locations);
  const unknownStateKeys = Object.keys(pickupLocations).filter(
    (state) => !US_STATE_CODES.includes(state as (typeof US_STATE_CODES)[number]),
  );

  if (unknownStateKeys.length > 0) {
    return `Incorrect shipping settings: unknown states in shipping.pickup.locations: ${unknownStateKeys.join(", ")}`;
  }

  return validatePickupLocationIdsUniqueness(pickupLocations);
}

export async function settingsCreateDeliveryConsistency(
  req: CreateSettingsRequestDTO,
  res: Response<BaseResponseDTO>,
  next: NextFunction,
) {
  try {
    const error = validateShippingConsistency(req.body.shipping ?? {});
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
    if (!req.body?.shipping) {
      return next();
    }

    const existingSettings = await SettingsModel.findOne().lean().exec();
    const existingShipping = (existingSettings?.shipping ?? {}) as ShippingPayload;
    const payloadShipping = req.body.shipping as ShippingPayload;

    const nextShipping: ShippingPayload = {
      delivery: {
        pricing: payloadShipping.delivery?.pricing ?? existingShipping.delivery?.pricing,
      },
      pickup: {
        locations: payloadShipping.pickup?.locations ?? existingShipping.pickup?.locations,
        policy: payloadShipping.pickup?.policy ?? existingShipping.pickup?.policy,
      },
    };

    if (nextShipping.delivery?.pricing === undefined) {
      return res.status(400).json({
        IsSuccess: false,
        ErrorMessage: "Incorrect shipping settings: shipping.delivery.pricing must be defined",
      });
    }
    if (nextShipping.pickup?.locations === undefined) {
      return res.status(400).json({
        IsSuccess: false,
        ErrorMessage: "Incorrect shipping settings: shipping.pickup.locations must be defined",
      });
    }
    if (nextShipping.pickup?.policy === undefined) {
      return res.status(400).json({
        IsSuccess: false,
        ErrorMessage: "Incorrect shipping settings: shipping.pickup.policy must be defined",
      });
    }

    const error = validateShippingConsistency(nextShipping);
    if (error) {
      return res.status(400).json({ IsSuccess: false, ErrorMessage: error });
    }

    next();
  } catch (e: any) {
    return res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
  }
}
