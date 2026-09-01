import { serializeWarehouseRow } from "@reanzly/contracts";

/** JSON-safe DTO matching legacy Next.js warehouse handlers. */
export function toWarehouseDto<T extends Record<string, unknown>>(row: T) {
  return serializeWarehouseRow(row);
}

export function toWarehouseDtoList<T extends Record<string, unknown>>(rows: T[]) {
  return rows.map(toWarehouseDto);
}
