import { Request } from "express";
import { ISettings } from "../settings.type";
import { RecursivePartial } from "../utils.types";
import { BaseResponseDTO } from "./common.dto";

export type CreateSettingsRequestBodyDTO = ISettings;

export type UpdateSettingsRequestBodyDTO = RecursivePartial<ISettings>;

export type CreateSettingsRequestDTO = Request<unknown, unknown, CreateSettingsRequestBodyDTO>;

export type UpdateSettingsRequestDTO = Request<unknown, unknown, UpdateSettingsRequestBodyDTO>;

export type SettingsResponseDTO = BaseResponseDTO & {
  Settings: ISettings;
};
