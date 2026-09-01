import { z } from "zod";
import { isoDateNullable, strictCreateSchema, strictPatchSchema, warehouseTimestamps } from "./common";

const podReceiveShape = {
  podNo: z.string(),
  lrNumber: z.string(),
  consignor: z.string(),
  consignee: z.string(),
  destination: z.string(),
  vehicle: z.string(),
  deliveryDate: isoDateNullable,
  receivedDate: isoDateNullable,
  status: z.string(),
  damageCount: z.number(),
  shortageQty: z.number(),
  receiver: z.string().nullable().optional(),
  remarks: z.string().nullable().optional(),
};

export const WarehousePodReceiveDtoSchema = z.object({
  id: z.string(),
  companyId: z.string(),
  ...podReceiveShape,
  ...warehouseTimestamps,
});

export const WarehousePodReceiveListResponseSchema = z.object({
  receives: z.array(WarehousePodReceiveDtoSchema),
});

export const WarehousePodReceiveResponseSchema = z.object({
  receive: WarehousePodReceiveDtoSchema,
});

export const WarehousePodReceiveCreateSchema = strictCreateSchema({
  podNo: z.string().min(1),
  lrNumber: z.string().optional(),
  consignor: z.string().optional(),
  consignee: z.string().optional(),
  destination: z.string().optional(),
  vehicle: z.string().optional(),
  deliveryDate: isoDateNullable,
  receivedDate: isoDateNullable,
  status: z.string().optional(),
  damageCount: z.number().optional(),
  shortageQty: z.number().optional(),
  receiver: z.string().nullable().optional(),
  remarks: z.string().nullable().optional(),
});

export const WarehousePodReceivePatchSchema = strictPatchSchema(podReceiveShape);

export type WarehousePodReceiveDto = z.infer<typeof WarehousePodReceiveDtoSchema>;
