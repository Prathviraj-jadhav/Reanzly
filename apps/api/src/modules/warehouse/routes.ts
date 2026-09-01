import type { FastifyInstance } from "fastify";
import { db } from "@reanzly/database";
import {
  WarehouseSkuCreateSchema,
  WarehouseSkuListResponseSchema,
  WarehouseSkuPatchSchema,
  WarehouseSkuResponseSchema,
  WarehouseInboundCreateSchema,
  WarehouseInboundListResponseSchema,
  WarehouseInboundPatchSchema,
  WarehouseInboundResponseSchema,
  WarehouseOutboundCreateSchema,
  WarehouseOutboundListResponseSchema,
  WarehouseOutboundPatchSchema,
  WarehouseOutboundResponseSchema,
  WarehouseStorageCreateSchema,
  WarehouseStorageListResponseSchema,
  WarehouseStoragePatchSchema,
  WarehouseStorageResponseSchema,
  WarehousePodReceiveCreateSchema,
  WarehousePodReceiveListResponseSchema,
  WarehousePodReceivePatchSchema,
  WarehousePodReceiveResponseSchema,
  WarehousePickListCreateSchema,
  WarehousePickListListResponseSchema,
  WarehousePickListPatchSchema,
  WarehousePickListResponseSchema,
  WarehousePickListDeleteResponseSchema,
  WarehouseCycleCountCreateSchema,
  WarehouseCycleCountListResponseSchema,
  WarehouseCycleCountPatchSchema,
  WarehouseCycleCountResponseSchema,
  WarehouseCrossDockCreateSchema,
  WarehouseCrossDockListResponseSchema,
  WarehouseCrossDockPatchSchema,
  WarehouseCrossDockResponseSchema,
  WarehouseReturnCreateSchema,
  WarehouseReturnPatchSchema,
  WarehouseReturnDeleteResponseSchema,
  WarehouseYardCreateSchema,
  WarehouseYardPatchSchema,
  WarehouseYardDeleteResponseSchema,
  WarehouseDockApptCreateSchema,
  WarehouseDockApptPatchSchema,
  WarehouseDockApptDeleteResponseSchema,
} from "@reanzly/contracts";
import { requireModule } from "../../plugins/module-guard.js";
import { handleDomainRouteError } from "../../lib/domain-error.js";
import * as svc from "./service.js";

const MODULE = "warehouse";

export async function warehouseRoutes(app: FastifyInstance) {
  app.get("/v1/warehouse/skus", async (request, reply) => {
    try {
      const auth = requireModule(request, MODULE);
      const skus = await svc.getSkus(db, auth.companyId);
      return reply.send(WarehouseSkuListResponseSchema.parse({ skus }));
    } catch (error) {
      return handleDomainRouteError(reply, error, "warehouse skus list failed");
    }
  });

  app.post("/v1/warehouse/skus", async (request, reply) => {
    try {
      const auth = requireModule(request, MODULE);
      const body = WarehouseSkuCreateSchema.parse(request.body);
      const sku = await svc.postSku(db, auth.companyId, body);
      return reply.status(201).send(WarehouseSkuResponseSchema.parse({ sku }));
    } catch (error) {
      return handleDomainRouteError(reply, error, "warehouse sku create failed");
    }
  });

  app.patch("/v1/warehouse/skus/:id", async (request, reply) => {
    try {
      const auth = requireModule(request, MODULE);
      const { id } = request.params as { id: string };
      const body = WarehouseSkuPatchSchema.parse(request.body);
      const sku = await svc.updateSku(db, auth.companyId, id, body);
      return reply.send(WarehouseSkuResponseSchema.parse({ sku }));
    } catch (error) {
      return handleDomainRouteError(reply, error, "warehouse sku patch failed");
    }
  });

  app.get("/v1/warehouse/inbound", async (request, reply) => {
    try {
      const auth = requireModule(request, MODULE);
      const shipments = await svc.getInbound(db, auth.companyId);
      return reply.send(WarehouseInboundListResponseSchema.parse({ shipments }));
    } catch (error) {
      return handleDomainRouteError(reply, error, "warehouse inbound list failed");
    }
  });

  app.post("/v1/warehouse/inbound", async (request, reply) => {
    try {
      const auth = requireModule(request, MODULE);
      const body = WarehouseInboundCreateSchema.parse(request.body);
      const shipment = await svc.postInbound(db, auth.companyId, body);
      return reply.status(201).send(WarehouseInboundResponseSchema.parse({ shipment }));
    } catch (error) {
      return handleDomainRouteError(reply, error, "warehouse inbound create failed");
    }
  });

  app.patch("/v1/warehouse/inbound/:id", async (request, reply) => {
    try {
      const auth = requireModule(request, MODULE);
      const { id } = request.params as { id: string };
      const body = WarehouseInboundPatchSchema.parse(request.body);
      const shipment = await svc.updateInbound(db, auth.companyId, id, body);
      return reply.send(WarehouseInboundResponseSchema.parse({ shipment }));
    } catch (error) {
      return handleDomainRouteError(reply, error, "warehouse inbound patch failed");
    }
  });

  app.get("/v1/warehouse/outbound", async (request, reply) => {
    try {
      const auth = requireModule(request, MODULE);
      const shipments = await svc.getOutbound(db, auth.companyId);
      return reply.send(WarehouseOutboundListResponseSchema.parse({ shipments }));
    } catch (error) {
      return handleDomainRouteError(reply, error, "warehouse outbound list failed");
    }
  });

  app.post("/v1/warehouse/outbound", async (request, reply) => {
    try {
      const auth = requireModule(request, MODULE);
      const body = WarehouseOutboundCreateSchema.parse(request.body);
      const shipment = await svc.postOutbound(db, auth.companyId, body);
      return reply.status(201).send(WarehouseOutboundResponseSchema.parse({ shipment }));
    } catch (error) {
      return handleDomainRouteError(reply, error, "warehouse outbound create failed");
    }
  });

  app.patch("/v1/warehouse/outbound/:id", async (request, reply) => {
    try {
      const auth = requireModule(request, MODULE);
      const { id } = request.params as { id: string };
      const body = WarehouseOutboundPatchSchema.parse(request.body);
      const shipment = await svc.updateOutbound(db, auth.companyId, id, body);
      return reply.send(WarehouseOutboundResponseSchema.parse({ shipment }));
    } catch (error) {
      return handleDomainRouteError(reply, error, "warehouse outbound patch failed");
    }
  });

  app.get("/v1/warehouse/storage", async (request, reply) => {
    try {
      const auth = requireModule(request, MODULE);
      const locations = await svc.getStorage(db, auth.companyId);
      return reply.send(WarehouseStorageListResponseSchema.parse({ locations }));
    } catch (error) {
      return handleDomainRouteError(reply, error, "warehouse storage list failed");
    }
  });

  app.post("/v1/warehouse/storage", async (request, reply) => {
    try {
      const auth = requireModule(request, MODULE);
      const body = WarehouseStorageCreateSchema.parse(request.body);
      const location = await svc.postStorage(db, auth.companyId, body);
      return reply.status(201).send(WarehouseStorageResponseSchema.parse({ location }));
    } catch (error) {
      return handleDomainRouteError(reply, error, "warehouse storage create failed");
    }
  });

  app.patch("/v1/warehouse/storage/:id", async (request, reply) => {
    try {
      const auth = requireModule(request, MODULE);
      const { id } = request.params as { id: string };
      const body = WarehouseStoragePatchSchema.parse(request.body);
      const location = await svc.updateStorage(db, auth.companyId, id, body);
      return reply.send(WarehouseStorageResponseSchema.parse({ location }));
    } catch (error) {
      return handleDomainRouteError(reply, error, "warehouse storage patch failed");
    }
  });

  app.get("/v1/warehouse/pod-receive", async (request, reply) => {
    try {
      const auth = requireModule(request, MODULE);
      const receives = await svc.getPodReceives(db, auth.companyId);
      return reply.send(WarehousePodReceiveListResponseSchema.parse({ receives }));
    } catch (error) {
      return handleDomainRouteError(reply, error, "warehouse pod-receive list failed");
    }
  });

  app.post("/v1/warehouse/pod-receive", async (request, reply) => {
    try {
      const auth = requireModule(request, MODULE);
      const body = WarehousePodReceiveCreateSchema.parse(request.body);
      const receive = await svc.postPodReceive(db, auth.companyId, body);
      return reply.status(201).send(WarehousePodReceiveResponseSchema.parse({ receive }));
    } catch (error) {
      return handleDomainRouteError(reply, error, "warehouse pod-receive create failed");
    }
  });

  app.patch("/v1/warehouse/pod-receive/:id", async (request, reply) => {
    try {
      const auth = requireModule(request, MODULE);
      const { id } = request.params as { id: string };
      const body = WarehousePodReceivePatchSchema.parse(request.body);
      const receive = await svc.updatePodReceive(db, auth.companyId, id, body);
      return reply.send(WarehousePodReceiveResponseSchema.parse({ receive }));
    } catch (error) {
      return handleDomainRouteError(reply, error, "warehouse pod-receive patch failed");
    }
  });

  app.get("/v1/warehouse/pick-pack", async (request, reply) => {
    try {
      const auth = requireModule(request, MODULE);
      const pickLists = await svc.getPickLists(db, auth.companyId);
      return reply.send(WarehousePickListListResponseSchema.parse({ pickLists }));
    } catch (error) {
      return handleDomainRouteError(reply, error, "warehouse pick-pack list failed");
    }
  });

  app.post("/v1/warehouse/pick-pack", async (request, reply) => {
    try {
      const auth = requireModule(request, MODULE);
      const body = WarehousePickListCreateSchema.parse(request.body);
      const pickList = await svc.postPickList(db, auth.companyId, body);
      return reply.status(201).send(WarehousePickListResponseSchema.parse({ pickList }));
    } catch (error) {
      return handleDomainRouteError(reply, error, "warehouse pick-pack create failed");
    }
  });

  app.patch("/v1/warehouse/pick-pack/:id", async (request, reply) => {
    try {
      const auth = requireModule(request, MODULE);
      const { id } = request.params as { id: string };
      const body = WarehousePickListPatchSchema.parse(request.body);
      const pickList = await svc.updatePickList(db, auth.companyId, id, body);
      return reply.send(WarehousePickListResponseSchema.parse({ pickList }));
    } catch (error) {
      return handleDomainRouteError(reply, error, "warehouse pick-pack patch failed");
    }
  });

  app.get("/v1/warehouse/pick-list", async (request, reply) => {
    try {
      const auth = requireModule(request, MODULE);
      const rows = await svc.getPickLists(db, auth.companyId);
      return reply.send(rows);
    } catch (error) {
      return handleDomainRouteError(reply, error, "warehouse pick-list list failed");
    }
  });

  app.post("/v1/warehouse/pick-list", async (request, reply) => {
    try {
      const auth = requireModule(request, MODULE);
      const body = WarehousePickListCreateSchema.parse(request.body);
      const row = await svc.postPickList(db, auth.companyId, body);
      return reply.send(row);
    } catch (error) {
      return handleDomainRouteError(reply, error, "warehouse pick-list create failed");
    }
  });

  app.patch("/v1/warehouse/pick-list/:id", async (request, reply) => {
    try {
      const auth = requireModule(request, MODULE);
      const { id } = request.params as { id: string };
      const body = WarehousePickListPatchSchema.parse(request.body);
      const row = await svc.updatePickList(db, auth.companyId, id, body, true);
      return reply.send(row);
    } catch (error) {
      return handleDomainRouteError(reply, error, "warehouse pick-list patch failed");
    }
  });

  app.delete("/v1/warehouse/pick-list/:id", async (request, reply) => {
    try {
      const auth = requireModule(request, MODULE);
      const { id } = request.params as { id: string };
      const result = await svc.removePickList(db, auth.companyId, id);
      return reply.send(WarehousePickListDeleteResponseSchema.parse(result));
    } catch (error) {
      return handleDomainRouteError(reply, error, "warehouse pick-list delete failed");
    }
  });

  app.get("/v1/warehouse/cycle-count", async (request, reply) => {
    try {
      const auth = requireModule(request, MODULE);
      const counts = await svc.getCycleCounts(db, auth.companyId);
      return reply.send(WarehouseCycleCountListResponseSchema.parse({ counts }));
    } catch (error) {
      return handleDomainRouteError(reply, error, "warehouse cycle-count list failed");
    }
  });

  app.post("/v1/warehouse/cycle-count", async (request, reply) => {
    try {
      const auth = requireModule(request, MODULE);
      const body = WarehouseCycleCountCreateSchema.parse(request.body);
      const count = await svc.postCycleCount(db, auth.companyId, body);
      return reply.status(201).send(WarehouseCycleCountResponseSchema.parse({ count }));
    } catch (error) {
      return handleDomainRouteError(reply, error, "warehouse cycle-count create failed");
    }
  });

  app.patch("/v1/warehouse/cycle-count/:id", async (request, reply) => {
    try {
      const auth = requireModule(request, MODULE);
      const { id } = request.params as { id: string };
      const body = WarehouseCycleCountPatchSchema.parse(request.body);
      const count = await svc.updateCycleCount(db, auth.companyId, id, body);
      return reply.send(WarehouseCycleCountResponseSchema.parse({ count }));
    } catch (error) {
      return handleDomainRouteError(reply, error, "warehouse cycle-count patch failed");
    }
  });

  app.get("/v1/warehouse/cross-dock", async (request, reply) => {
    try {
      const auth = requireModule(request, MODULE);
      const crossDocks = await svc.getCrossDocks(db, auth.companyId);
      return reply.send(WarehouseCrossDockListResponseSchema.parse({ crossDocks }));
    } catch (error) {
      return handleDomainRouteError(reply, error, "warehouse cross-dock list failed");
    }
  });

  app.post("/v1/warehouse/cross-dock", async (request, reply) => {
    try {
      const auth = requireModule(request, MODULE);
      const body = WarehouseCrossDockCreateSchema.parse(request.body);
      const crossDock = await svc.postCrossDock(db, auth.companyId, body);
      return reply.status(201).send(WarehouseCrossDockResponseSchema.parse({ crossDock }));
    } catch (error) {
      return handleDomainRouteError(reply, error, "warehouse cross-dock create failed");
    }
  });

  app.patch("/v1/warehouse/cross-dock/:id", async (request, reply) => {
    try {
      const auth = requireModule(request, MODULE);
      const { id } = request.params as { id: string };
      const body = WarehouseCrossDockPatchSchema.parse(request.body);
      const crossDock = await svc.updateCrossDock(db, auth.companyId, id, body);
      return reply.send(WarehouseCrossDockResponseSchema.parse({ crossDock }));
    } catch (error) {
      return handleDomainRouteError(reply, error, "warehouse cross-dock patch failed");
    }
  });

  app.get("/v1/warehouse/returns", async (request, reply) => {
    try {
      const auth = requireModule(request, MODULE);
      const rows = await svc.getReturns(db, auth.companyId);
      return reply.send(rows);
    } catch (error) {
      return handleDomainRouteError(reply, error, "warehouse returns list failed");
    }
  });

  app.post("/v1/warehouse/returns", async (request, reply) => {
    try {
      const auth = requireModule(request, MODULE);
      const body = WarehouseReturnCreateSchema.parse(request.body);
      const row = await svc.postReturn(db, auth.companyId, body);
      return reply.send(row);
    } catch (error) {
      return handleDomainRouteError(reply, error, "warehouse returns create failed");
    }
  });

  app.patch("/v1/warehouse/returns/:id", async (request, reply) => {
    try {
      const auth = requireModule(request, MODULE);
      const { id } = request.params as { id: string };
      const body = WarehouseReturnPatchSchema.parse(request.body);
      const row = await svc.updateReturn(db, auth.companyId, id, body);
      return reply.send(row);
    } catch (error) {
      return handleDomainRouteError(reply, error, "warehouse returns patch failed");
    }
  });

  app.delete("/v1/warehouse/returns/:id", async (request, reply) => {
    try {
      const auth = requireModule(request, MODULE);
      const { id } = request.params as { id: string };
      const result = await svc.removeReturn(db, auth.companyId, id);
      return reply.send(WarehouseReturnDeleteResponseSchema.parse(result));
    } catch (error) {
      return handleDomainRouteError(reply, error, "warehouse returns delete failed");
    }
  });

  app.get("/v1/warehouse/yard", async (request, reply) => {
    try {
      const auth = requireModule(request, MODULE);
      const rows = await svc.getYards(db, auth.companyId);
      return reply.send(rows);
    } catch (error) {
      return handleDomainRouteError(reply, error, "warehouse yard list failed");
    }
  });

  app.post("/v1/warehouse/yard", async (request, reply) => {
    try {
      const auth = requireModule(request, MODULE);
      const body = WarehouseYardCreateSchema.parse(request.body);
      const row = await svc.postYard(db, auth.companyId, body);
      return reply.send(row);
    } catch (error) {
      return handleDomainRouteError(reply, error, "warehouse yard create failed");
    }
  });

  app.patch("/v1/warehouse/yard/:id", async (request, reply) => {
    try {
      const auth = requireModule(request, MODULE);
      const { id } = request.params as { id: string };
      const body = WarehouseYardPatchSchema.parse(request.body);
      const row = await svc.updateYard(db, auth.companyId, id, body);
      return reply.send(row);
    } catch (error) {
      return handleDomainRouteError(reply, error, "warehouse yard patch failed");
    }
  });

  app.delete("/v1/warehouse/yard/:id", async (request, reply) => {
    try {
      const auth = requireModule(request, MODULE);
      const { id } = request.params as { id: string };
      const result = await svc.removeYard(db, auth.companyId, id);
      return reply.send(WarehouseYardDeleteResponseSchema.parse(result));
    } catch (error) {
      return handleDomainRouteError(reply, error, "warehouse yard delete failed");
    }
  });

  app.get("/v1/warehouse/dock-appt", async (request, reply) => {
    try {
      const auth = requireModule(request, MODULE);
      const rows = await svc.getDockAppts(db, auth.companyId);
      return reply.send(rows);
    } catch (error) {
      return handleDomainRouteError(reply, error, "warehouse dock-appt list failed");
    }
  });

  app.post("/v1/warehouse/dock-appt", async (request, reply) => {
    try {
      const auth = requireModule(request, MODULE);
      const body = WarehouseDockApptCreateSchema.parse(request.body);
      const row = await svc.postDockAppt(db, auth.companyId, body);
      return reply.send(row);
    } catch (error) {
      return handleDomainRouteError(reply, error, "warehouse dock-appt create failed");
    }
  });

  app.patch("/v1/warehouse/dock-appt/:id", async (request, reply) => {
    try {
      const auth = requireModule(request, MODULE);
      const { id } = request.params as { id: string };
      const body = WarehouseDockApptPatchSchema.parse(request.body);
      const row = await svc.updateDockAppt(db, auth.companyId, id, body);
      return reply.send(row);
    } catch (error) {
      return handleDomainRouteError(reply, error, "warehouse dock-appt patch failed");
    }
  });

  app.delete("/v1/warehouse/dock-appt/:id", async (request, reply) => {
    try {
      const auth = requireModule(request, MODULE);
      const { id } = request.params as { id: string };
      const result = await svc.removeDockAppt(db, auth.companyId, id);
      return reply.send(WarehouseDockApptDeleteResponseSchema.parse(result));
    } catch (error) {
      return handleDomainRouteError(reply, error, "warehouse dock-appt delete failed");
    }
  });
}
