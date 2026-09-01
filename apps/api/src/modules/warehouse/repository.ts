import type { PrismaClient } from "@reanzly/database";
import type { Prisma } from "@prisma/client";
import { warehouseCreateMappers, warehousePatchMappers } from "@reanzly/shared";
import { DomainServiceError } from "../../lib/domain-error.js";

function createInput<T>(data: Record<string, unknown>): T {
  return data as T;
}

async function assertTenantRow<T extends { companyId: string }>(
  row: T | null,
  companyId: string,
): Promise<T> {
  if (!row || row.companyId !== companyId) {
    throw new DomainServiceError("NOT_FOUND", "Not found or access denied.", 404);
  }
  return row;
}

export async function listSkus(db: PrismaClient, companyId: string) {
  return db.warehouseSku.findMany({ where: { companyId }, orderBy: { createdAt: "desc" } });
}

export async function createSku(
  db: PrismaClient,
  companyId: string,
  body: Record<string, unknown>,
) {
  return db.warehouseSku.create({
    data: createInput<Prisma.WarehouseSkuUncheckedCreateInput>(
      warehouseCreateMappers.sku(body, companyId),
    ),
  });
}

export async function patchSku(
  db: PrismaClient,
  companyId: string,
  id: string,
  body: Record<string, unknown>,
) {
  const existing = await db.warehouseSku.findUnique({ where: { id } });
  await assertTenantRow(existing, companyId);
  return db.warehouseSku.update({
    where: { id },
    data: createInput<Prisma.WarehouseSkuUncheckedUpdateInput>(warehousePatchMappers.sku(body)),
  });
}

export async function listInbound(db: PrismaClient, companyId: string) {
  return db.warehouseInbound.findMany({ where: { companyId }, orderBy: { createdAt: "desc" } });
}

export async function createInbound(
  db: PrismaClient,
  companyId: string,
  body: Record<string, unknown>,
) {
  return db.warehouseInbound.create({
    data: createInput<Prisma.WarehouseInboundUncheckedCreateInput>(
      warehouseCreateMappers.inbound(body, companyId),
    ),
  });
}

export async function patchInbound(
  db: PrismaClient,
  companyId: string,
  id: string,
  body: Record<string, unknown>,
) {
  const existing = await db.warehouseInbound.findUnique({ where: { id } });
  await assertTenantRow(existing, companyId);
  return db.warehouseInbound.update({
    where: { id },
    data: createInput<Prisma.WarehouseInboundUncheckedUpdateInput>(
      warehousePatchMappers.inbound(body),
    ),
  });
}

export async function listOutbound(db: PrismaClient, companyId: string) {
  return db.warehouseOutbound.findMany({ where: { companyId }, orderBy: { createdAt: "desc" } });
}

export async function createOutbound(
  db: PrismaClient,
  companyId: string,
  body: Record<string, unknown>,
) {
  return db.warehouseOutbound.create({
    data: createInput<Prisma.WarehouseOutboundUncheckedCreateInput>(
      warehouseCreateMappers.outbound(body, companyId),
    ),
  });
}

export async function patchOutbound(
  db: PrismaClient,
  companyId: string,
  id: string,
  body: Record<string, unknown>,
) {
  const existing = await db.warehouseOutbound.findUnique({ where: { id } });
  await assertTenantRow(existing, companyId);
  return db.warehouseOutbound.update({
    where: { id },
    data: createInput<Prisma.WarehouseOutboundUncheckedUpdateInput>(
      warehousePatchMappers.outbound(body),
    ),
  });
}

export async function listStorage(db: PrismaClient, companyId: string) {
  return db.warehouseStorageLocation.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
  });
}

export async function createStorage(
  db: PrismaClient,
  companyId: string,
  body: Record<string, unknown>,
) {
  return db.warehouseStorageLocation.create({
    data: createInput<Prisma.WarehouseStorageLocationUncheckedCreateInput>(
      warehouseCreateMappers.storage(body, companyId),
    ),
  });
}

export async function patchStorage(
  db: PrismaClient,
  companyId: string,
  id: string,
  body: Record<string, unknown>,
) {
  const existing = await db.warehouseStorageLocation.findUnique({ where: { id } });
  await assertTenantRow(existing, companyId);
  return db.warehouseStorageLocation.update({
    where: { id },
    data: createInput<Prisma.WarehouseStorageLocationUncheckedUpdateInput>(
      warehousePatchMappers.storage(body),
    ),
  });
}

export async function listPodReceives(db: PrismaClient, companyId: string) {
  return db.warehousePodReceive.findMany({ where: { companyId }, orderBy: { createdAt: "desc" } });
}

export async function createPodReceive(
  db: PrismaClient,
  companyId: string,
  body: Record<string, unknown>,
) {
  return db.warehousePodReceive.create({
    data: createInput<Prisma.WarehousePodReceiveUncheckedCreateInput>(
      warehouseCreateMappers.podReceive(body, companyId),
    ),
  });
}

export async function patchPodReceive(
  db: PrismaClient,
  companyId: string,
  id: string,
  body: Record<string, unknown>,
) {
  const existing = await db.warehousePodReceive.findUnique({ where: { id } });
  await assertTenantRow(existing, companyId);
  return db.warehousePodReceive.update({
    where: { id },
    data: createInput<Prisma.WarehousePodReceiveUncheckedUpdateInput>(
      warehousePatchMappers.podReceive(body),
    ),
  });
}

export async function listPickLists(db: PrismaClient, companyId: string) {
  return db.warehousePickList.findMany({ where: { companyId }, orderBy: { createdAt: "desc" } });
}

export async function createPickList(
  db: PrismaClient,
  companyId: string,
  body: Record<string, unknown>,
) {
  return db.warehousePickList.create({
    data: createInput<Prisma.WarehousePickListUncheckedCreateInput>(
      warehouseCreateMappers.pickList(body, companyId),
    ),
  });
}

export async function patchPickList(
  db: PrismaClient,
  companyId: string,
  id: string,
  body: Record<string, unknown>,
  compoundWhere = false,
) {
  if (compoundWhere) {
    try {
      return await db.warehousePickList.update({
        where: { id, companyId },
        data: createInput<Prisma.WarehousePickListUncheckedUpdateInput>(
          warehousePatchMappers.pickList(body),
        ),
      });
    } catch {
      throw new DomainServiceError("NOT_FOUND", "Not found or access denied.", 404);
    }
  }
  const existing = await db.warehousePickList.findUnique({ where: { id } });
  await assertTenantRow(existing, companyId);
  return db.warehousePickList.update({
    where: { id },
    data: createInput<Prisma.WarehousePickListUncheckedUpdateInput>(
      warehousePatchMappers.pickList(body),
    ),
  });
}

export async function deletePickList(db: PrismaClient, companyId: string, id: string) {
  try {
    await db.warehousePickList.delete({ where: { id, companyId } });
    return true;
  } catch {
    throw new DomainServiceError("NOT_FOUND", "Not found or access denied.", 404);
  }
}

export async function listCycleCounts(db: PrismaClient, companyId: string) {
  return db.warehouseCycleCount.findMany({ where: { companyId }, orderBy: { createdAt: "desc" } });
}

export async function createCycleCount(
  db: PrismaClient,
  companyId: string,
  body: Record<string, unknown>,
) {
  return db.warehouseCycleCount.create({
    data: createInput<Prisma.WarehouseCycleCountUncheckedCreateInput>(
      warehouseCreateMappers.cycleCount(body, companyId),
    ),
  });
}

export async function patchCycleCount(
  db: PrismaClient,
  companyId: string,
  id: string,
  body: Record<string, unknown>,
) {
  const existing = await db.warehouseCycleCount.findUnique({ where: { id } });
  await assertTenantRow(existing, companyId);
  return db.warehouseCycleCount.update({
    where: { id },
    data: createInput<Prisma.WarehouseCycleCountUncheckedUpdateInput>(
      warehousePatchMappers.cycleCount(body),
    ),
  });
}

export async function listCrossDocks(db: PrismaClient, companyId: string) {
  return db.warehouseCrossDock.findMany({ where: { companyId }, orderBy: { createdAt: "desc" } });
}

export async function createCrossDock(
  db: PrismaClient,
  companyId: string,
  body: Record<string, unknown>,
) {
  return db.warehouseCrossDock.create({
    data: createInput<Prisma.WarehouseCrossDockUncheckedCreateInput>(
      warehouseCreateMappers.crossDock(body, companyId),
    ),
  });
}

export async function patchCrossDock(
  db: PrismaClient,
  companyId: string,
  id: string,
  body: Record<string, unknown>,
) {
  const existing = await db.warehouseCrossDock.findUnique({ where: { id } });
  await assertTenantRow(existing, companyId);
  return db.warehouseCrossDock.update({
    where: { id },
    data: createInput<Prisma.WarehouseCrossDockUncheckedUpdateInput>(
      warehousePatchMappers.crossDock(body),
    ),
  });
}

export async function listReturns(db: PrismaClient, companyId: string) {
  return db.warehouseReturn.findMany({ where: { companyId }, orderBy: { createdAt: "desc" } });
}

export async function createReturn(
  db: PrismaClient,
  companyId: string,
  body: Record<string, unknown>,
) {
  return db.warehouseReturn.create({
    data: createInput<Prisma.WarehouseReturnUncheckedCreateInput>(
      warehouseCreateMappers.returns(body, companyId),
    ),
  });
}

export async function patchReturn(
  db: PrismaClient,
  companyId: string,
  id: string,
  body: Record<string, unknown>,
) {
  try {
    return await db.warehouseReturn.update({
      where: { id, companyId },
      data: createInput<Prisma.WarehouseReturnUncheckedUpdateInput>(
        warehousePatchMappers.returns(body),
      ),
    });
  } catch {
    throw new DomainServiceError("NOT_FOUND", "Not found or access denied.", 404);
  }
}

export async function deleteReturn(db: PrismaClient, companyId: string, id: string) {
  try {
    await db.warehouseReturn.delete({ where: { id, companyId } });
    return true;
  } catch {
    throw new DomainServiceError("NOT_FOUND", "Not found or access denied.", 404);
  }
}

export async function listYards(db: PrismaClient, companyId: string) {
  return db.warehouseYard.findMany({ where: { companyId }, orderBy: { createdAt: "desc" } });
}

export async function createYard(
  db: PrismaClient,
  companyId: string,
  body: Record<string, unknown>,
) {
  return db.warehouseYard.create({
    data: createInput<Prisma.WarehouseYardUncheckedCreateInput>(
      warehouseCreateMappers.yard(body, companyId),
    ),
  });
}

export async function patchYard(
  db: PrismaClient,
  companyId: string,
  id: string,
  body: Record<string, unknown>,
) {
  try {
    return await db.warehouseYard.update({
      where: { id, companyId },
      data: createInput<Prisma.WarehouseYardUncheckedUpdateInput>(warehousePatchMappers.yard(body)),
    });
  } catch {
    throw new DomainServiceError("NOT_FOUND", "Not found or access denied.", 404);
  }
}

export async function deleteYard(db: PrismaClient, companyId: string, id: string) {
  try {
    await db.warehouseYard.delete({ where: { id, companyId } });
    return true;
  } catch {
    throw new DomainServiceError("NOT_FOUND", "Not found or access denied.", 404);
  }
}

export async function listDockAppts(db: PrismaClient, companyId: string) {
  return db.warehouseDockAppt.findMany({ where: { companyId }, orderBy: { createdAt: "desc" } });
}

export async function createDockAppt(
  db: PrismaClient,
  companyId: string,
  body: Record<string, unknown>,
) {
  return db.warehouseDockAppt.create({
    data: createInput<Prisma.WarehouseDockApptUncheckedCreateInput>(
      warehouseCreateMappers.dockAppt(body, companyId),
    ),
  });
}

export async function patchDockAppt(
  db: PrismaClient,
  companyId: string,
  id: string,
  body: Record<string, unknown>,
) {
  try {
    return await db.warehouseDockAppt.update({
      where: { id, companyId },
      data: createInput<Prisma.WarehouseDockApptUncheckedUpdateInput>(
        warehousePatchMappers.dockAppt(body),
      ),
    });
  } catch {
    throw new DomainServiceError("NOT_FOUND", "Not found or access denied.", 404);
  }
}

export async function deleteDockAppt(db: PrismaClient, companyId: string, id: string) {
  try {
    await db.warehouseDockAppt.delete({ where: { id, companyId } });
    return true;
  } catch {
    throw new DomainServiceError("NOT_FOUND", "Not found or access denied.", 404);
  }
}
