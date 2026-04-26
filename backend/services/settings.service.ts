import { ISettings } from "../data/types/settings.type";
import { RecursivePartial } from "../data/types/utils.types";
import SettingsModel from "../models/settings.model";

export class SettingsService {
  private model = SettingsModel;

  async create(data: ISettings) {
    const existingSettings = await this.model.findOne().lean().exec();
    if (existingSettings) {
      throw new Error("Settings already exists");
    }
    return await this.model.create(data);
  }

  async update(data: RecursivePartial<ISettings>) {
    return await this.model.findOneAndUpdate({}, data, { new: true, upsert: true, setDefaultsOnInsert: true });
  }

  async get() {
    return await this.model.findOne().lean().exec();
  }
}
