import { tenantCreateData, tenantPatchData } from "@reanzly/shared";
import {
  WAREHOUSE_INBOUND_FIELDS,
  WAREHOUSE_OUTBOUND_FIELDS,
  WAREHOUSE_SKU_FIELDS,
  WAREHOUSE_STORAGE_FIELDS,
  WAREHOUSE_POD_RECEIVE_FIELDS,
  WAREHOUSE_PICK_LIST_FIELDS,
  WAREHOUSE_CYCLE_COUNT_FIELDS,
  WAREHOUSE_CROSS_DOCK_FIELDS,
  WAREHOUSE_YARD_FIELDS,
  WAREHOUSE_DOCK_APPT_FIELDS,
  WAREHOUSE_RETURN_FIELDS,
} from "@reanzly/shared";
import type { Prisma } from "@prisma/client";

export { warehousePatchMappers } from "@reanzly/shared";

export const warehouseCreateMappers = {
  inbound: (body: Record<string, unknown>, companyId: string) =>
    tenantCreateData<Prisma.WarehouseInboundUncheckedCreateInput>(
      body,
      companyId,
      WAREHOUSE_INBOUND_FIELDS,
    ),
  outbound: (body: Record<string, unknown>, companyId: string) =>
    tenantCreateData<Prisma.WarehouseOutboundUncheckedCreateInput>(
      body,
      companyId,
      WAREHOUSE_OUTBOUND_FIELDS,
    ),
  sku: (body: Record<string, unknown>, companyId: string) =>
    tenantCreateData<Prisma.WarehouseSkuUncheckedCreateInput>(body, companyId, WAREHOUSE_SKU_FIELDS),
  storage: (body: Record<string, unknown>, companyId: string) =>
    tenantCreateData<Prisma.WarehouseStorageLocationUncheckedCreateInput>(
      body,
      companyId,
      WAREHOUSE_STORAGE_FIELDS,
    ),
  podReceive: (body: Record<string, unknown>, companyId: string) =>
    tenantCreateData<Prisma.WarehousePodReceiveUncheckedCreateInput>(
      body,
      companyId,
      WAREHOUSE_POD_RECEIVE_FIELDS,
    ),
  pickList: (body: Record<string, unknown>, companyId: string) =>
    tenantCreateData<Prisma.WarehousePickListUncheckedCreateInput>(
      body,
      companyId,
      WAREHOUSE_PICK_LIST_FIELDS,
    ),
  cycleCount: (body: Record<string, unknown>, companyId: string) =>
    tenantCreateData<Prisma.WarehouseCycleCountUncheckedCreateInput>(
      body,
      companyId,
      WAREHOUSE_CYCLE_COUNT_FIELDS,
    ),
  crossDock: (body: Record<string, unknown>, companyId: string) =>
    tenantCreateData<Prisma.WarehouseCrossDockUncheckedCreateInput>(
      body,
      companyId,
      WAREHOUSE_CROSS_DOCK_FIELDS,
    ),
  yard: (body: Record<string, unknown>, companyId: string) =>
    tenantCreateData<Prisma.WarehouseYardUncheckedCreateInput>(body, companyId, WAREHOUSE_YARD_FIELDS),
  dockAppt: (body: Record<string, unknown>, companyId: string) =>
    tenantCreateData<Prisma.WarehouseDockApptUncheckedCreateInput>(
      body,
      companyId,
      WAREHOUSE_DOCK_APPT_FIELDS,
    ),
  returns: (body: Record<string, unknown>, companyId: string) =>
    tenantCreateData<Prisma.WarehouseReturnUncheckedCreateInput>(
      body,
      companyId,
      WAREHOUSE_RETURN_FIELDS,
    ),
};

export { tenantPatchData };
