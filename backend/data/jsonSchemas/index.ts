import { customerSchema } from "./customer.schema";
import {
  productCreateSchema,
  productPatchSchema,
  productReplaceSchema,
  productVariantCreateSchema,
  productVariantPatchSchema,
} from "./product.schema";
import {
  orderCreateSchema,
  orderUpdateSchema,
  orderDeliveryUpdateSchema,
  orderPickupUpdateSchema,
  orderStatusSchema,
  orderReceiveSchema,
  orderCommentsCreateSchema,
  orderPricingSchema,
} from "./order.schema";
import { managerSchema } from "./manager.schema";
import { settingsCreateSchema, settingsUpdateSchema } from "./settings.schema";

export {
  customerSchema,
  productCreateSchema,
  productReplaceSchema,
  productPatchSchema,
  productVariantCreateSchema,
  productVariantPatchSchema,
  orderCreateSchema,
  orderUpdateSchema,
  orderDeliveryUpdateSchema,
  orderPickupUpdateSchema,
  orderStatusSchema,
  orderReceiveSchema,
  orderCommentsCreateSchema,
  orderPricingSchema,
  managerSchema,
  settingsCreateSchema,
  settingsUpdateSchema,
};
