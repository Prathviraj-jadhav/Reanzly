import { z } from "zod";
import { isoDateNullable, strictCreateSchema, strictPatchSchema, warehouseTimestamps } from "./common";

const pickListShape = {
  pickId: z.string(),
  order: z.string(),
  consignee: z.string(),
  skuCount: z.number(),
  totalQty: z.number(),
  pickedQty: z.number(),
  status: z.string(),
  picker: z.string().nullable().optional(),
  packingStation: z.string().nullable().optional(),
  assignedDate: isoDateNullable,
  pickedDate: isoDateNullable,
  godown: z.string(),
  pickTimeMin: z.number().nullable().optional(),
};

export const WarehousePickListDtoSchema = z.object({
  id: z.string(),
  companyId: z.string(),
  ...pickListShape,
  ...warehouseTimestamps,
});

export const WarehousePickListListResponseSchema = z.object({
  pickLists: z.array(WarehousePickListDtoSchema),
});

export const WarehousePickListResponseSchema = z.object({
  pickList: WarehousePickListDtoSchema,
});

export const WarehousePickListArrayResponseSchema = z.array(WarehousePickListDtoSchema);

export const WarehousePickListCreateSchema = strictCreateSchema({
  pickId: z.string().min(1),
  order: z.string().optional(),
  consignee: z.string().optional(),
  skuCount: z.number().optional(),
  totalQty: z.number().optional(),
  pickedQty: z.number().optional(),
  status: z.string().optional(),
  picker: z.string().nullable().optional(),
  packingStation: z.string().nullable().optional(),
  assignedDate: isoDateNullable,
  pickedDate: isoDateNullable,
  godown: z.string().optional(),
  pickTimeMin: z.number().nullable().optional(),
});

export const WarehousePickListPatchSchema = strictPatchSchema(pickListShape);

export const WarehousePickListDeleteResponseSchema = z.object({
  success: z.literal(true),
});

export type WarehousePickListDto = z.infer<typeof WarehousePickListDtoSchema>;
