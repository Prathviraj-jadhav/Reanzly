import { z } from "zod";
import { isoDateNullable, strictCreateSchema, strictPatchSchema, warehouseTimestamps } from "./common";

const skuShape = {
  skuCode: z.string(),
  name: z.string(),
  category: z.string(),
  hsn: z.string(),
  unit: z.string(),
  stock: z.number(),
  reserved: z.number(),
  minLevel: z.number(),
  reorderQty: z.number(),
  unitCost: z.number(),
  location: z.string(),
  godown: z.string(),
  supplier: z.string(),
  gstRate: z.number(),
  lastMovement: isoDateNullable,
};

export const WarehouseSkuDtoSchema = z.object({
  id: z.string(),
  companyId: z.string(),
  ...skuShape,
  ...warehouseTimestamps,
});

export const WarehouseSkuListResponseSchema = z.object({
  skus: z.array(WarehouseSkuDtoSchema),
});

export const WarehouseSkuResponseSchema = z.object({
  sku: WarehouseSkuDtoSchema,
});

export const WarehouseSkuCreateSchema = strictCreateSchema({
  skuCode: z.string().min(1),
  name: z.string().min(1),
  category: z.string().optional(),
  hsn: z.string().optional(),
  unit: z.string().optional(),
  stock: z.number().optional(),
  reserved: z.number().optional(),
  minLevel: z.number().optional(),
  reorderQty: z.number().optional(),
  unitCost: z.number().optional(),
  location: z.string().optional(),
  godown: z.string().optional(),
  supplier: z.string().optional(),
  gstRate: z.number().optional(),
  lastMovement: isoDateNullable,
});

export const WarehouseSkuPatchSchema = strictPatchSchema({
  skuCode: z.string(),
  name: z.string(),
  category: z.string(),
  hsn: z.string(),
  unit: z.string(),
  stock: z.number(),
  reserved: z.number(),
  minLevel: z.number(),
  reorderQty: z.number(),
  unitCost: z.number(),
  location: z.string(),
  godown: z.string(),
  supplier: z.string(),
  gstRate: z.number(),
  lastMovement: isoDateNullable,
});

export type WarehouseSkuDto = z.infer<typeof WarehouseSkuDtoSchema>;
