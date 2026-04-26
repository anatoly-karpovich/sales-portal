import { Request, Response } from "express";

import {
  CreateSettingsRequestDTO,
  SettingsResponseDTO,
  UpdateSettingsRequestDTO,
} from "../data/types/dto/settings.dto";
import { SettingsService } from "../services/settings.service";
import { BaseResponseDTO } from "../data/types/dto/common.dto";

export class SettingsController {
  private service = new SettingsService();

  async createSettings(req: CreateSettingsRequestDTO, res: Response<SettingsResponseDTO | BaseResponseDTO>) {
    try {
      const settingsData = req.body;
      const settings = await this.service.create(settingsData);
      return res.status(201).json({ Settings: settings, IsSuccess: true, ErrorMessage: null });
    } catch (e) {
      if ((e as Error).message === "Settings already exists") {
        return res.status(409).json({ IsSuccess: false, ErrorMessage: (e as Error).message });
      }
      return res.status(500).json({ IsSuccess: false, ErrorMessage: (e as Error).message });
    }
  }

  async updateSettings(req: UpdateSettingsRequestDTO, res: Response<SettingsResponseDTO | BaseResponseDTO>) {
    try {
      const settingsData = req.body;
      const settings = await this.service.update(settingsData);
      return res.status(200).json({ Settings: settings, IsSuccess: true, ErrorMessage: null });
    } catch (e) {
      return res.status(500).json({ IsSuccess: false, ErrorMessage: (e as Error).message });
    }
  }

  async getSettings(req: Request, res: Response<SettingsResponseDTO | BaseResponseDTO>) {
    try {
      const settings = await this.service.get();
      if (!settings) {
        return res.status(404).json({ IsSuccess: false, ErrorMessage: "Settings were not found" });
      }
      return res.status(200).json({ Settings: settings, IsSuccess: true, ErrorMessage: null });
    } catch (e) {
      return res.status(500).json({ IsSuccess: false, ErrorMessage: (e as Error).message });
    }
  }
}
