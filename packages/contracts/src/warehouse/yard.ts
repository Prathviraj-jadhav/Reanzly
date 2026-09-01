import { z } from "zod";
import { isoDateNullable, strictCreateSchema, strictPatchSchema, warehouseTimestamps } from "./common";

const yardShape = {
  movementId: z.string(),
  equipment: z.string(),
  type: z.string(),
  gateIn: isoDateNullable,
  gateOut: isoDateNullable,
  dock: z.string().nullable().optional(),
  status: z.string(),
  driver: z.string().nullable().optional(),
  carrier: z.string(),
  dwellMin: z.number(),
};

export const WarehouseYardDtoSchema = z.object({
  id: z.string(),
  companyId: z.string(),
  ...yardShape,
  ...warehouseTimestamps,
});

export const WarehouseYardArrayResponseSchema = z.array(WarehouseYardDtoSchema);

export const WarehouseYardCreateSchema = strictCreateSchema({
  movementId: z.string().min(1),
  equipment: z.string().optional(),
  type: z.string().optional(),
  gateIn: isoDateNullable,
  gateOut: isoDateNullable,
  dock: z.string().nullable().optional(),
  status: z.string().optional(),
  driver: z.string().nullable().optional(),
  carrier: z.string().optional(),
  dwellMin: z.number().optional(),
});

export const WarehouseYardPatchSchema = strictPatchSchema(yardShape);

export const WarehouseYardDeleteResponseSchema = z.object({
  success: z.literal(true),
});

export type WarehouseYardDto = z.infer<typeof WarehouseYardDtoSchema>;
