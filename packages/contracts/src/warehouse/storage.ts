import { z } from "zod";
import { isoDateNullable, strictCreateSchema, strictPatchSchema, warehouseTimestamps } from "./common";

const storageShape = {
  code: z.string(),
  name: z.string(),
  type: z.string(),
  godown: z.string(),
  capacityPallets: z.number(),
  occupiedPallets: z.number(),
  manager: z.string(),
  area: z.number(),
  lastStocktake: isoDateNullable,
};

export const WarehouseStorageDtoSchema = z.object({
  id: z.string(),
  companyId: z.string(),
  ...storageShape,
  ...warehouseTimestamps,
});

export const WarehouseStorageListResponseSchema = z.object({
  locations: z.array(WarehouseStorageDtoSchema),
});

export const WarehouseStorageResponseSchema = z.object({
  location: WarehouseStorageDtoSchema,
});

export const WarehouseStorageCreateSchema = strictCreateSchema({
  code: z.string().min(1),
  name: z.string().optional(),
  type: z.string().optional(),
  godown: z.string().optional(),
  capacityPallets: z.number().optional(),
  occupiedPallets: z.number().optional(),
  manager: z.string().optional(),
  area: z.number().optional(),
  lastStocktake: isoDateNullable,
});

export const WarehouseStoragePatchSchema = strictPatchSchema(storageShape);

export type WarehouseStorageDto = z.infer<typeof WarehouseStorageDtoSchema>;
