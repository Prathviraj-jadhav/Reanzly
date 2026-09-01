import { api } from "@/lib/api-client";
import type { ApiRequestOptions } from "@reanzly/shared";
import {
  WarehouseSkuListResponseSchema,
  WarehouseSkuResponseSchema,
  WarehouseInboundListResponseSchema,
  WarehouseInboundResponseSchema,
  WarehouseOutboundListResponseSchema,
  WarehouseOutboundResponseSchema,
  WarehouseStorageListResponseSchema,
  WarehouseStorageResponseSchema,
  WarehousePodReceiveListResponseSchema,
  WarehousePodReceiveResponseSchema,
  WarehousePickListListResponseSchema,
  WarehousePickListResponseSchema,
  WarehouseCycleCountListResponseSchema,
  WarehouseCycleCountResponseSchema,
  WarehouseCrossDockListResponseSchema,
  WarehouseCrossDockResponseSchema,
  WarehouseReturnArrayResponseSchema,
  WarehouseYardArrayResponseSchema,
  WarehouseDockApptArrayResponseSchema,
} from "@reanzly/contracts";

const WAREHOUSE_DOMAIN = "warehouse" as const;

function jsonOptions(
  method: string,
  payload?: unknown,
  options?: ApiRequestOptions,
): ApiRequestOptions {
  return {
    domain: WAREHOUSE_DOMAIN,
    method,
    headers: { "Content-Type": "application/json" },
    ...(payload !== undefined ? { body: JSON.stringify(payload) } : {}),
    ...options,
  };
}

export async function fetchWarehouseSkus(options?: ApiRequestOptions) {
  const body = await api<unknown>("warehouse/skus", { domain: WAREHOUSE_DOMAIN, ...options });
  return WarehouseSkuListResponseSchema.parse(body).skus;
}

export async function createWarehouseSku(payload: Record<string, unknown>, options?: ApiRequestOptions) {
  const body = await api<unknown>("warehouse/skus", jsonOptions("POST", payload, options));
  return WarehouseSkuResponseSchema.parse(body).sku;
}

export async function patchWarehouseSku(
  id: string,
  payload: Record<string, unknown>,
  options?: ApiRequestOptions,
) {
  const body = await api<unknown>(`warehouse/skus/${id}`, jsonOptions("PATCH", payload, options));
  return WarehouseSkuResponseSchema.parse(body).sku;
}

export async function fetchWarehouseInbounds(options?: ApiRequestOptions) {
  const body = await api<unknown>("warehouse/inbound", { domain: WAREHOUSE_DOMAIN, ...options });
  return WarehouseInboundListResponseSchema.parse(body).shipments;
}

export async function createWarehouseInbound(
  payload: Record<string, unknown>,
  options?: ApiRequestOptions,
) {
  const body = await api<unknown>("warehouse/inbound", jsonOptions("POST", payload, options));
  return WarehouseInboundResponseSchema.parse(body).shipment;
}

export async function patchWarehouseInbound(
  id: string,
  payload: Record<string, unknown>,
  options?: ApiRequestOptions,
) {
  const body = await api<unknown>(`warehouse/inbound/${id}`, jsonOptions("PATCH", payload, options));
  return WarehouseInboundResponseSchema.parse(body).shipment;
}

export async function fetchWarehouseOutbounds(options?: ApiRequestOptions) {
  const body = await api<unknown>("warehouse/outbound", { domain: WAREHOUSE_DOMAIN, ...options });
  return WarehouseOutboundListResponseSchema.parse(body).shipments;
}

export async function createWarehouseOutbound(
  payload: Record<string, unknown>,
  options?: ApiRequestOptions,
) {
  const body = await api<unknown>("warehouse/outbound", jsonOptions("POST", payload, options));
  return WarehouseOutboundResponseSchema.parse(body).shipment;
}

export async function patchWarehouseOutbound(
  id: string,
  payload: Record<string, unknown>,
  options?: ApiRequestOptions,
) {
  const body = await api<unknown>(`warehouse/outbound/${id}`, jsonOptions("PATCH", payload, options));
  return WarehouseOutboundResponseSchema.parse(body).shipment;
}

export async function fetchWarehouseLocations(options?: ApiRequestOptions) {
  const body = await api<unknown>("warehouse/storage", { domain: WAREHOUSE_DOMAIN, ...options });
  return WarehouseStorageListResponseSchema.parse(body).locations;
}

export async function createWarehouseLocation(
  payload: Record<string, unknown>,
  options?: ApiRequestOptions,
) {
  const body = await api<unknown>("warehouse/storage", jsonOptions("POST", payload, options));
  return WarehouseStorageResponseSchema.parse(body).location;
}

export async function patchWarehouseLocation(
  id: string,
  payload: Record<string, unknown>,
  options?: ApiRequestOptions,
) {
  const body = await api<unknown>(`warehouse/storage/${id}`, jsonOptions("PATCH", payload, options));
  return WarehouseStorageResponseSchema.parse(body).location;
}

export async function fetchWarehousePodReceives(options?: ApiRequestOptions) {
  const body = await api<unknown>("warehouse/pod-receive", { domain: WAREHOUSE_DOMAIN, ...options });
  return WarehousePodReceiveListResponseSchema.parse(body).receives;
}

export async function createWarehousePodReceive(
  payload: Record<string, unknown>,
  options?: ApiRequestOptions,
) {
  const body = await api<unknown>("warehouse/pod-receive", jsonOptions("POST", payload, options));
  return WarehousePodReceiveResponseSchema.parse(body).receive;
}

export async function patchWarehousePodReceive(
  id: string,
  payload: Record<string, unknown>,
  options?: ApiRequestOptions,
) {
  const body = await api<unknown>(`warehouse/pod-receive/${id}`, jsonOptions("PATCH", payload, options));
  return WarehousePodReceiveResponseSchema.parse(body).receive;
}

export async function fetchWarehousePickLists(options?: ApiRequestOptions) {
  const body = await api<unknown>("warehouse/pick-pack", { domain: WAREHOUSE_DOMAIN, ...options });
  return WarehousePickListListResponseSchema.parse(body).pickLists;
}

export async function createWarehousePickList(
  payload: Record<string, unknown>,
  options?: ApiRequestOptions,
) {
  const body = await api<unknown>("warehouse/pick-pack", jsonOptions("POST", payload, options));
  return WarehousePickListResponseSchema.parse(body).pickList;
}

export async function patchWarehousePickList(
  id: string,
  payload: Record<string, unknown>,
  options?: ApiRequestOptions,
) {
  const body = await api<unknown>(`warehouse/pick-pack/${id}`, jsonOptions("PATCH", payload, options));
  return WarehousePickListResponseSchema.parse(body).pickList;
}

export async function fetchWarehouseCycleCounts(options?: ApiRequestOptions) {
  const body = await api<unknown>("warehouse/cycle-count", { domain: WAREHOUSE_DOMAIN, ...options });
  return WarehouseCycleCountListResponseSchema.parse(body).counts;
}

export async function createWarehouseCycleCount(
  payload: Record<string, unknown>,
  options?: ApiRequestOptions,
) {
  const body = await api<unknown>("warehouse/cycle-count", jsonOptions("POST", payload, options));
  return WarehouseCycleCountResponseSchema.parse(body).count;
}

export async function patchWarehouseCycleCount(
  id: string,
  payload: Record<string, unknown>,
  options?: ApiRequestOptions,
) {
  const body = await api<unknown>(`warehouse/cycle-count/${id}`, jsonOptions("PATCH", payload, options));
  return WarehouseCycleCountResponseSchema.parse(body).count;
}

export async function fetchWarehouseCrossDocks(options?: ApiRequestOptions) {
  const body = await api<unknown>("warehouse/cross-dock", { domain: WAREHOUSE_DOMAIN, ...options });
  return WarehouseCrossDockListResponseSchema.parse(body).crossDocks;
}

export async function createWarehouseCrossDock(
  payload: Record<string, unknown>,
  options?: ApiRequestOptions,
) {
  const body = await api<unknown>("warehouse/cross-dock", jsonOptions("POST", payload, options));
  return WarehouseCrossDockResponseSchema.parse(body).crossDock;
}

export async function patchWarehouseCrossDock(
  id: string,
  payload: Record<string, unknown>,
  options?: ApiRequestOptions,
) {
  const body = await api<unknown>(`warehouse/cross-dock/${id}`, jsonOptions("PATCH", payload, options));
  return WarehouseCrossDockResponseSchema.parse(body).crossDock;
}

export async function fetchWarehouseReturns(options?: ApiRequestOptions) {
  const body = await api<unknown>("warehouse/returns", { domain: WAREHOUSE_DOMAIN, ...options });
  return WarehouseReturnArrayResponseSchema.parse(body);
}

export async function createWarehouseReturn(
  payload: Record<string, unknown>,
  options?: ApiRequestOptions,
) {
  return api<unknown>("warehouse/returns", jsonOptions("POST", payload, options));
}

export async function patchWarehouseReturn(
  id: string,
  payload: Record<string, unknown>,
  options?: ApiRequestOptions,
) {
  return api<unknown>(`warehouse/returns/${id}`, jsonOptions("PATCH", payload, options));
}

export async function fetchWarehouseYards(options?: ApiRequestOptions) {
  const body = await api<unknown>("warehouse/yard", { domain: WAREHOUSE_DOMAIN, ...options });
  return WarehouseYardArrayResponseSchema.parse(body);
}

export async function createWarehouseYard(
  payload: Record<string, unknown>,
  options?: ApiRequestOptions,
) {
  return api<unknown>("warehouse/yard", jsonOptions("POST", payload, options));
}

export async function patchWarehouseYard(
  id: string,
  payload: Record<string, unknown>,
  options?: ApiRequestOptions,
) {
  return api<unknown>(`warehouse/yard/${id}`, jsonOptions("PATCH", payload, options));
}

export async function fetchWarehouseDockAppts(options?: ApiRequestOptions) {
  const body = await api<unknown>("warehouse/dock-appt", { domain: WAREHOUSE_DOMAIN, ...options });
  return WarehouseDockApptArrayResponseSchema.parse(body);
}

export async function createWarehouseDockAppt(
  payload: Record<string, unknown>,
  options?: ApiRequestOptions,
) {
  return api<unknown>("warehouse/dock-appt", jsonOptions("POST", payload, options));
}

export async function patchWarehouseDockAppt(
  id: string,
  payload: Record<string, unknown>,
  options?: ApiRequestOptions,
) {
  return api<unknown>(`warehouse/dock-appt/${id}`, jsonOptions("PATCH", payload, options));
}
