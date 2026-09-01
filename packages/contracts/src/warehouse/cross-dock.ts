import { z } from "zod";
import { isoDateNullable, strictCreateSchema, strictPatchSchema, warehouseTimestamps } from "./common";

const crossDockShape = {
  xdkId: z.string(),
  inboundRef: z.string(),
  outboundRef: z.string(),
  skuCode: z.string(),
  skuName: z.string(),
  qty: z.number(),
  unit: z.string(),
  dockDoor: z.string(),
  status: z.string(),
  dwellTimeMin: z.number(),
  arrivedDate: isoDateNullable,
  carrier: z.string(),
};

export const WarehouseCrossDockDtoSchema = z.object({
  id: z.string(),
  companyId: z.string(),
  ...crossDockShape,
  ...warehouseTimestamps,
});

export const WarehouseCrossDockListResponseSchema = z.object({
  crossDocks: z.array(WarehouseCrossDockDtoSchema),
});

export const WarehouseCrossDockResponseSchema = z.object({
  crossDock: WarehouseCrossDockDtoSchema,
});

export const WarehouseCrossDockCreateSchema = strictCreateSchema({
  xdkId: z.string().min(1),
  inboundRef: z.string().optional(),
  outboundRef: z.string().optional(),
  skuCode: z.string().optional(),
  skuName: z.string().optional(),
  qty: z.number().optional(),
  unit: z.string().optional(),
  dockDoor: z.string().optional(),
  status: z.string().optional(),
  dwellTimeMin: z.number().optional(),
  arrivedDate: isoDateNullable,
  carrier: z.string().optional(),
});

export const WarehouseCrossDockPatchSchema = strictPatchSchema(crossDockShape);

export type WarehouseCrossDockDto = z.infer<typeof WarehouseCrossDockDtoSchema>;
