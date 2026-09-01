import { z } from "zod";
import { isoDateNullable, strictCreateSchema, strictPatchSchema, warehouseTimestamps } from "./common";

const dockApptShape = {
  apptId: z.string(),
  carrier: z.string(),
  dockDoor: z.string(),
  date: isoDateNullable,
  timeWindow: z.string(),
  type: z.string(),
  status: z.string(),
  checkInTime: isoDateNullable,
  driver: z.string().nullable().optional(),
  refNo: z.string(),
  durationMin: z.number(),
};

export const WarehouseDockApptDtoSchema = z.object({
  id: z.string(),
  companyId: z.string(),
  ...dockApptShape,
  ...warehouseTimestamps,
});

export const WarehouseDockApptArrayResponseSchema = z.array(WarehouseDockApptDtoSchema);

export const WarehouseDockApptCreateSchema = strictCreateSchema({
  apptId: z.string().min(1),
  carrier: z.string().optional(),
  dockDoor: z.string().optional(),
  date: isoDateNullable,
  timeWindow: z.string().optional(),
  type: z.string().optional(),
  status: z.string().optional(),
  checkInTime: isoDateNullable,
  driver: z.string().nullable().optional(),
  refNo: z.string().optional(),
  durationMin: z.number().optional(),
});

export const WarehouseDockApptPatchSchema = strictPatchSchema(dockApptShape);

export const WarehouseDockApptDeleteResponseSchema = z.object({
  success: z.literal(true),
});

export type WarehouseDockApptDto = z.infer<typeof WarehouseDockApptDtoSchema>;
