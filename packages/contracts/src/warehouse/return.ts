import { z } from "zod";
import { isoDateNullable, strictCreateSchema, strictPatchSchema, warehouseTimestamps } from "./common";

const returnShape = {
  rmaId: z.string(),
  customer: z.string(),
  originalOrder: z.string(),
  skuCode: z.string(),
  skuName: z.string(),
  qty: z.number(),
  unit: z.string(),
  reason: z.string(),
  status: z.string(),
  disposition: z.string().nullable().optional(),
  unitValue: z.number(),
  requestedDate: isoDateNullable,
  inspectedDate: isoDateNullable,
  inspectedBy: z.string().nullable().optional(),
  remarks: z.string().nullable().optional(),
};

export const WarehouseReturnDtoSchema = z.object({
  id: z.string(),
  companyId: z.string(),
  ...returnShape,
  ...warehouseTimestamps,
});

export const WarehouseReturnArrayResponseSchema = z.array(WarehouseReturnDtoSchema);

export const WarehouseReturnCreateSchema = strictCreateSchema({
  rmaId: z.string().min(1),
  customer: z.string().optional(),
  originalOrder: z.string().optional(),
  skuCode: z.string().optional(),
  skuName: z.string().optional(),
  qty: z.number().optional(),
  unit: z.string().optional(),
  reason: z.string().optional(),
  status: z.string().optional(),
  disposition: z.string().nullable().optional(),
  unitValue: z.number().optional(),
  requestedDate: isoDateNullable,
  inspectedDate: isoDateNullable,
  inspectedBy: z.string().nullable().optional(),
  remarks: z.string().nullable().optional(),
});

export const WarehouseReturnPatchSchema = strictPatchSchema(returnShape);

export const WarehouseReturnDeleteResponseSchema = z.object({
  success: z.literal(true),
});

export type WarehouseReturnDto = z.infer<typeof WarehouseReturnDtoSchema>;
