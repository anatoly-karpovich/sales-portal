import { NextFunction, Response } from "express";
import { BaseResponseDTO } from "../data/types/dto/common.dto.js";
import { CreateSettingsRequestDTO, UpdateSettingsRequestDTO } from "../data/types/dto/settings.dto.js";
import SettingsModel from "../models/settings.model.js";

type DeliveryPayload = {
  defaultCities?: unknown;
  pickupAddresses?: unknown;
};

function normalizePickupAddresses(value: unknown): Record<string, unknown> {
  if (value instanceof Map) {
    return Object.fromEntries(value.entries());
  }
  if (value && typeof value === "object") {
    return value as Record<string, unknown>;
  }
  return {};
}

function buildMismatchError(defaultCities: string[], pickupAddressCities: string[]): string | null {
  const citySet = new Set(defaultCities);
  const pickupSet = new Set(pickupAddressCities);

  const missingPickupAddresses = defaultCities.filter((city) => !pickupSet.has(city));
  const extraPickupAddresses = pickupAddressCities.filter((city) => !citySet.has(city));

  if (!missingPickupAddresses.length && !extraPickupAddresses.length) {
    return null;
  }

  const details: string[] = [];
  if (missingPickupAddresses.length) {
    details.push(`missing pickup addresses for cities: ${missingPickupAddresses.join(", ")}`);
  }
  if (extraPickupAddresses.length) {
    details.push(`pickup addresses have unknown cities: ${extraPickupAddresses.join(", ")}`);
  }

  return `Incorrect delivery settings: ${details.join("; ")}`;
}

function validateDeliveryConsistency(delivery: DeliveryPayload): string | null {
  if (!Array.isArray(delivery.defaultCities) || !delivery.defaultCities.every((city) => typeof city === "string")) {
    return "Incorrect delivery settings: delivery.defaultCities must be an array of strings";
  }

  const pickupAddresses = normalizePickupAddresses(delivery.pickupAddresses);
  const pickupAddressCities = Object.keys(pickupAddresses);

  return buildMismatchError(delivery.defaultCities as string[], pickupAddressCities);
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
      defaultCities: payloadDelivery.defaultCities ?? existingDelivery.defaultCities,
      pickupAddresses: payloadDelivery.pickupAddresses ?? existingDelivery.pickupAddresses,
    };

    if (nextDelivery.defaultCities === undefined || nextDelivery.pickupAddresses === undefined) {
      return res.status(400).json({
        IsSuccess: false,
        ErrorMessage: "Incorrect delivery settings: delivery.defaultCities and delivery.pickupAddresses must be defined",
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
