import { z } from "zod";

export const isoDateNullable = z.union([z.string(), z.null()]).optional();
export const isoDateRequired = z.string().optional();

export const warehouseTimestamps = {
  createdAt: z.string(),
  updatedAt: z.string(),
};

export function strictCreateSchema<T extends z.ZodRawShape>(shape: T) {
  return z.object(shape).strict();
}

export function strictPatchSchema<T extends z.ZodRawShape>(shape: T) {
  const optionalShape: Record<string, z.ZodTypeAny> = {};
  for (const key of Object.keys(shape)) {
    optionalShape[key] = (shape[key] as z.ZodTypeAny).optional();
  }
  return z.object(optionalShape).strict();
}

/** Serialize Prisma row dates for JSON parity with legacy Next.js handlers. */
export function serializeWarehouseRow<T extends Record<string, unknown>>(row: T): T {
  const out = { ...row } as Record<string, unknown>;
  for (const [key, value] of Object.entries(out)) {
    if (value instanceof Date) {
      out[key] = value.toISOString();
    }
  }
  return out as T;
}
