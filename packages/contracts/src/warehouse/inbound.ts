import { z } from "zod";
import { isoDateNullable, strictCreateSchema, strictPatchSchema, warehouseTimestamps } from "./common";

const inboundShape = {
  grn: z.string(),
  refNo: z.string(),
  consignor: z.string(),
  origin: z.string(),
  vehicle: z.string(),
  lrNumber: z.string(),
  expectedDate: isoDateNullable,
  receivedDate: isoDateNullable,
  skus: z.unknown(),
  status: z.string(),
  godown: z.string(),
  totalValue: z.number(),
  receiver: z.string().nullable().optional(),
  remarks: z.string().nullable().optional(),
};

export const WarehouseInboundDtoSchema = z.object({
  id: z.string(),
  companyId: z.string(),
  ...inboundShape,
  ...warehouseTimestamps,
});

export const WarehouseInboundListResponseSchema = z.object({
  shipments: z.array(WarehouseInboundDtoSchema),
});

export const WarehouseInboundResponseSchema = z.object({
  shipment: WarehouseInboundDtoSchema,
});

export const WarehouseInboundCreateSchema = strictCreateSchema({
  grn: z.string().min(1),
  refNo: z.string().optional(),
  consignor: z.string().optional(),
  origin: z.string().optional(),
  vehicle: z.string().optional(),
  lrNumber: z.string().optional(),
  expectedDate: isoDateNullable,
  receivedDate: isoDateNullable,
  skus: z.unknown().optional(),
  status: z.string().optional(),
  godown: z.string().optional(),
  totalValue: z.number().optional(),
  receiver: z.string().nullable().optional(),
  remarks: z.string().nullable().optional(),
});

export const WarehouseInboundPatchSchema = strictPatchSchema(inboundShape);

export type WarehouseInboundDto = z.infer<typeof WarehouseInboundDtoSchema>;
