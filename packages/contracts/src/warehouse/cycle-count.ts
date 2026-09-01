import { z } from "zod";
import { isoDateNullable, strictCreateSchema, strictPatchSchema, warehouseTimestamps } from "./common";

const cycleCountShape = {
  countId: z.string(),
  location: z.string(),
  skuCode: z.string(),
  skuName: z.string(),
  systemQty: z.number(),
  countedQty: z.number().nullable().optional(),
  variance: z.number().nullable().optional(),
  status: z.string(),
  counter: z.string().nullable().optional(),
  scheduledDate: isoDateNullable,
  countedDate: isoDateNullable,
  unit: z.string(),
  godown: z.string(),
};

export const WarehouseCycleCountDtoSchema = z.object({
  id: z.string(),
  companyId: z.string(),
  ...cycleCountShape,
  ...warehouseTimestamps,
});

export const WarehouseCycleCountListResponseSchema = z.object({
  counts: z.array(WarehouseCycleCountDtoSchema),
});

export const WarehouseCycleCountResponseSchema = z.object({
  count: WarehouseCycleCountDtoSchema,
});

export const WarehouseCycleCountCreateSchema = strictCreateSchema({
  countId: z.string().min(1),
  location: z.string().optional(),
  skuCode: z.string().optional(),
  skuName: z.string().optional(),
  systemQty: z.number().optional(),
  countedQty: z.number().nullable().optional(),
  variance: z.number().nullable().optional(),
  status: z.string().optional(),
  counter: z.string().nullable().optional(),
  scheduledDate: isoDateNullable,
  countedDate: isoDateNullable,
  unit: z.string().optional(),
  godown: z.string().optional(),
});

export const WarehouseCycleCountPatchSchema = strictPatchSchema(cycleCountShape);

export type WarehouseCycleCountDto = z.infer<typeof WarehouseCycleCountDtoSchema>;
