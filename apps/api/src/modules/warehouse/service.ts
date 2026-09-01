import type { PrismaClient } from "@reanzly/database";
import { toWarehouseDto, toWarehouseDtoList } from "./dto.js";
import * as repo from "./repository.js";

export async function getSkus(db: PrismaClient, companyId: string) {
  return toWarehouseDtoList(await repo.listSkus(db, companyId));
}

export async function postSku(db: PrismaClient, companyId: string, body: Record<string, unknown>) {
  return toWarehouseDto(await repo.createSku(db, companyId, body));
}

export async function updateSku(
  db: PrismaClient,
  companyId: string,
  id: string,
  body: Record<string, unknown>,
) {
  return toWarehouseDto(await repo.patchSku(db, companyId, id, body));
}

export async function getInbound(db: PrismaClient, companyId: string) {
  return toWarehouseDtoList(await repo.listInbound(db, companyId));
}

export async function postInbound(db: PrismaClient, companyId: string, body: Record<string, unknown>) {
  return toWarehouseDto(await repo.createInbound(db, companyId, body));
}

export async function updateInbound(
  db: PrismaClient,
  companyId: string,
  id: string,
  body: Record<string, unknown>,
) {
  return toWarehouseDto(await repo.patchInbound(db, companyId, id, body));
}

export async function getOutbound(db: PrismaClient, companyId: string) {
  return toWarehouseDtoList(await repo.listOutbound(db, companyId));
}

export async function postOutbound(db: PrismaClient, companyId: string, body: Record<string, unknown>) {
  return toWarehouseDto(await repo.createOutbound(db, companyId, body));
}

export async function updateOutbound(
  db: PrismaClient,
  companyId: string,
  id: string,
  body: Record<string, unknown>,
) {
  return toWarehouseDto(await repo.patchOutbound(db, companyId, id, body));
}

export async function getStorage(db: PrismaClient, companyId: string) {
  return toWarehouseDtoList(await repo.listStorage(db, companyId));
}

export async function postStorage(db: PrismaClient, companyId: string, body: Record<string, unknown>) {
  return toWarehouseDto(await repo.createStorage(db, companyId, body));
}

export async function updateStorage(
  db: PrismaClient,
  companyId: string,
  id: string,
  body: Record<string, unknown>,
) {
  return toWarehouseDto(await repo.patchStorage(db, companyId, id, body));
}

export async function getPodReceives(db: PrismaClient, companyId: string) {
  return toWarehouseDtoList(await repo.listPodReceives(db, companyId));
}

export async function postPodReceive(
  db: PrismaClient,
  companyId: string,
  body: Record<string, unknown>,
) {
  return toWarehouseDto(await repo.createPodReceive(db, companyId, body));
}

export async function updatePodReceive(
  db: PrismaClient,
  companyId: string,
  id: string,
  body: Record<string, unknown>,
) {
  return toWarehouseDto(await repo.patchPodReceive(db, companyId, id, body));
}

export async function getPickLists(db: PrismaClient, companyId: string) {
  return toWarehouseDtoList(await repo.listPickLists(db, companyId));
}

export async function postPickList(db: PrismaClient, companyId: string, body: Record<string, unknown>) {
  return toWarehouseDto(await repo.createPickList(db, companyId, body));
}

export async function updatePickList(
  db: PrismaClient,
  companyId: string,
  id: string,
  body: Record<string, unknown>,
  compoundWhere = false,
) {
  return toWarehouseDto(await repo.patchPickList(db, companyId, id, body, compoundWhere));
}

export async function removePickList(db: PrismaClient, companyId: string, id: string) {
  await repo.deletePickList(db, companyId, id);
  return { success: true as const };
}

export async function getCycleCounts(db: PrismaClient, companyId: string) {
  return toWarehouseDtoList(await repo.listCycleCounts(db, companyId));
}

export async function postCycleCount(
  db: PrismaClient,
  companyId: string,
  body: Record<string, unknown>,
) {
  return toWarehouseDto(await repo.createCycleCount(db, companyId, body));
}

export async function updateCycleCount(
  db: PrismaClient,
  companyId: string,
  id: string,
  body: Record<string, unknown>,
) {
  return toWarehouseDto(await repo.patchCycleCount(db, companyId, id, body));
}

export async function getCrossDocks(db: PrismaClient, companyId: string) {
  return toWarehouseDtoList(await repo.listCrossDocks(db, companyId));
}

export async function postCrossDock(
  db: PrismaClient,
  companyId: string,
  body: Record<string, unknown>,
) {
  return toWarehouseDto(await repo.createCrossDock(db, companyId, body));
}

export async function updateCrossDock(
  db: PrismaClient,
  companyId: string,
  id: string,
  body: Record<string, unknown>,
) {
  return toWarehouseDto(await repo.patchCrossDock(db, companyId, id, body));
}

export async function getReturns(db: PrismaClient, companyId: string) {
  return toWarehouseDtoList(await repo.listReturns(db, companyId));
}

export async function postReturn(db: PrismaClient, companyId: string, body: Record<string, unknown>) {
  return toWarehouseDto(await repo.createReturn(db, companyId, body));
}

export async function updateReturn(
  db: PrismaClient,
  companyId: string,
  id: string,
  body: Record<string, unknown>,
) {
  return toWarehouseDto(await repo.patchReturn(db, companyId, id, body));
}

export async function removeReturn(db: PrismaClient, companyId: string, id: string) {
  await repo.deleteReturn(db, companyId, id);
  return { success: true as const };
}

export async function getYards(db: PrismaClient, companyId: string) {
  return toWarehouseDtoList(await repo.listYards(db, companyId));
}

export async function postYard(db: PrismaClient, companyId: string, body: Record<string, unknown>) {
  return toWarehouseDto(await repo.createYard(db, companyId, body));
}

export async function updateYard(
  db: PrismaClient,
  companyId: string,
  id: string,
  body: Record<string, unknown>,
) {
  return toWarehouseDto(await repo.patchYard(db, companyId, id, body));
}

export async function removeYard(db: PrismaClient, companyId: string, id: string) {
  await repo.deleteYard(db, companyId, id);
  return { success: true as const };
}

export async function getDockAppts(db: PrismaClient, companyId: string) {
  return toWarehouseDtoList(await repo.listDockAppts(db, companyId));
}

export async function postDockAppt(
  db: PrismaClient,
  companyId: string,
  body: Record<string, unknown>,
) {
  return toWarehouseDto(await repo.createDockAppt(db, companyId, body));
}

export async function updateDockAppt(
  db: PrismaClient,
  companyId: string,
  id: string,
  body: Record<string, unknown>,
) {
  return toWarehouseDto(await repo.patchDockAppt(db, companyId, id, body));
}

export async function removeDockAppt(db: PrismaClient, companyId: string, id: string) {
  await repo.deleteDockAppt(db, companyId, id);
  return { success: true as const };
}
