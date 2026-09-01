import { tenantCreateData, tenantPatchData } from "../tenant-data";

export const WAREHOUSE_INBOUND_FIELDS = [
  "grn", "refNo", "consignor", "origin", "vehicle", "lrNumber",
  "expectedDate", "receivedDate", "skus", "status", "godown", "totalValue", "receiver", "remarks",
] as const;

export const WAREHOUSE_OUTBOUND_FIELDS = [
  "odo", "refNo", "consignee", "destination", "vehicle", "lrNumber",
  "orderDate", "dispatchDate", "deliveryDate", "skus", "status", "godown", "totalValue", "picker", "remarks",
] as const;

export const WAREHOUSE_SKU_FIELDS = [
  "skuCode", "name", "category", "hsn", "unit", "stock", "reserved", "minLevel",
  "reorderQty", "unitCost", "location", "godown", "supplier", "gstRate", "lastMovement",
] as const;

export const WAREHOUSE_STORAGE_FIELDS = [
  "code", "name", "type", "godown", "capacityPallets", "occupiedPallets", "manager", "area", "lastStocktake",
] as const;

export const WAREHOUSE_POD_RECEIVE_FIELDS = [
  "podNo", "lrNumber", "consignor", "consignee", "destination", "vehicle",
  "deliveryDate", "receivedDate", "status", "damageCount", "shortageQty", "receiver", "remarks",
] as const;

export const WAREHOUSE_PICK_LIST_FIELDS = [
  "pickId", "order", "consignee", "skuCount", "totalQty", "pickedQty", "status",
  "picker", "packingStation", "assignedDate", "pickedDate", "godown", "pickTimeMin",
] as const;

export const WAREHOUSE_CYCLE_COUNT_FIELDS = [
  "countId", "location", "skuCode", "skuName", "systemQty", "countedQty", "variance",
  "status", "counter", "scheduledDate", "countedDate", "unit", "godown",
] as const;

export const WAREHOUSE_CROSS_DOCK_FIELDS = [
  "xdkId", "inboundRef", "outboundRef", "skuCode", "skuName", "qty", "unit",
  "dockDoor", "status", "dwellTimeMin", "arrivedDate", "carrier",
] as const;

export const WAREHOUSE_YARD_FIELDS = [
  "movementId", "equipment", "type", "gateIn", "gateOut", "dock", "status", "driver", "carrier", "dwellMin",
] as const;

export const WAREHOUSE_DOCK_APPT_FIELDS = [
  "apptId", "carrier", "dockDoor", "date", "timeWindow", "type", "status",
  "checkInTime", "driver", "refNo", "durationMin",
] as const;

export const WAREHOUSE_RETURN_FIELDS = [
  "rmaId", "customer", "originalOrder", "skuCode", "skuName", "qty", "unit", "reason",
  "status", "disposition", "unitValue", "requestedDate", "inspectedDate", "inspectedBy", "remarks",
] as const;

function createMapper(fields: readonly string[]) {
  return (body: Record<string, unknown>, companyId: string) =>
    tenantCreateData(body, companyId, fields);
}

function patchMapper(fields: readonly string[]) {
  return (body: Record<string, unknown>) => tenantPatchData(body, fields);
}

export const warehouseCreateMappers = {
  inbound: createMapper(WAREHOUSE_INBOUND_FIELDS),
  outbound: createMapper(WAREHOUSE_OUTBOUND_FIELDS),
  sku: createMapper(WAREHOUSE_SKU_FIELDS),
  storage: createMapper(WAREHOUSE_STORAGE_FIELDS),
  podReceive: createMapper(WAREHOUSE_POD_RECEIVE_FIELDS),
  pickList: createMapper(WAREHOUSE_PICK_LIST_FIELDS),
  cycleCount: createMapper(WAREHOUSE_CYCLE_COUNT_FIELDS),
  crossDock: createMapper(WAREHOUSE_CROSS_DOCK_FIELDS),
  yard: createMapper(WAREHOUSE_YARD_FIELDS),
  dockAppt: createMapper(WAREHOUSE_DOCK_APPT_FIELDS),
  returns: createMapper(WAREHOUSE_RETURN_FIELDS),
};

export const warehousePatchMappers = {
  inbound: patchMapper(WAREHOUSE_INBOUND_FIELDS),
  outbound: patchMapper(WAREHOUSE_OUTBOUND_FIELDS),
  sku: patchMapper(WAREHOUSE_SKU_FIELDS),
  storage: patchMapper(WAREHOUSE_STORAGE_FIELDS),
  podReceive: patchMapper(WAREHOUSE_POD_RECEIVE_FIELDS),
  pickList: patchMapper(WAREHOUSE_PICK_LIST_FIELDS),
  cycleCount: patchMapper(WAREHOUSE_CYCLE_COUNT_FIELDS),
  crossDock: patchMapper(WAREHOUSE_CROSS_DOCK_FIELDS),
  yard: patchMapper(WAREHOUSE_YARD_FIELDS),
  dockAppt: patchMapper(WAREHOUSE_DOCK_APPT_FIELDS),
  returns: patchMapper(WAREHOUSE_RETURN_FIELDS),
};
