import { z } from "zod";
import { isoDateNullable, strictCreateSchema, strictPatchSchema, warehouseTimestamps } from "./common";

const outboundShape = {
  odo: z.string(),
  refNo: z.string(),
  consignee: z.string(),
  destination: z.string(),
  vehicle: z.string(),
  lrNumber: z.string(),
  orderDate: isoDateNullable,
  dispatchDate: isoDateNullable,
  deliveryDate: isoDateNullable,
  skus: z.unknown(),
  status: z.string(),
  godown: z.string(),
  totalValue: z.number(),
  picker: z.string().nullable().optional(),
  remarks: z.string().nullable().optional(),
};

export const WarehouseOutboundDtoSchema = z.object({
  id: z.string(),
  companyId: z.string(),
  ...outboundShape,
  ...warehouseTimestamps,
});

export const WarehouseOutboundListResponseSchema = z.object({
  shipments: z.array(WarehouseOutboundDtoSchema),
});

export const WarehouseOutboundResponseSchema = z.object({
  shipment: WarehouseOutboundDtoSchema,
});

export const WarehouseOutboundCreateSchema = strictCreateSchema({
  odo: z.string().min(1),
  refNo: z.string().optional(),
  consignee: z.string().optional(),
  destination: z.string().optional(),
  vehicle: z.string().optional(),
  lrNumber: z.string().optional(),
  orderDate: isoDateNullable,
  dispatchDate: isoDateNullable,
  deliveryDate: isoDateNullable,
  skus: z.unknown().optional(),
  status: z.string().optional(),
  godown: z.string().optional(),
  totalValue: z.number().optional(),
  picker: z.string().nullable().optional(),
  remarks: z.string().nullable().optional(),
});

export const WarehouseOutboundPatchSchema = strictPatchSchema(outboundShape);

export type WarehouseOutboundDto = z.infer<typeof WarehouseOutboundDtoSchema>;
