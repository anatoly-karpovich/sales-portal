import { Response } from "express";
import { BaseResponseDTO } from "../data/types/dto/common.dto";
import { OrderPricingRequestDTO } from "../data/types/dto/orders.dto";
import { PricingService } from "../services/pricing.service";

type PricingResponseDTO = BaseResponseDTO & {
  Pricing: unknown;
};

export class PricingController {
  private service = new PricingService();
  async getPrices(req: OrderPricingRequestDTO, res: Response<PricingResponseDTO | BaseResponseDTO>) {
    try {
      const pricing = await this.service.calculate(req.body);
      res.status(200).json({ Pricing: pricing, IsSuccess: true, ErrorMessage: null });
    } catch (e: any) {
      const statusCode = typeof e?.statusCode === "number" ? e.statusCode : 500;
      res.status(statusCode).json({ IsSuccess: false, ErrorMessage: e.message });
    }
  }
}
