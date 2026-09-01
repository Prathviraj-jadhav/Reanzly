import type { FastifyInstance } from "fastify";
import { db } from "@reanzly/database";
import {
  HelpdeskCreateSchema,
  HelpdeskListResponseSchema,
  HelpdeskPatchSchema,
  HelpdeskResponseSchema,
} from "@reanzly/contracts";
import { requireModule } from "../../plugins/module-guard.js";
import { handleDomainRouteError } from "../../lib/domain-error.js";
import {
  createTicketForCompany,
  getTicketDetail,
  getTickets,
  updateTicketForCompany,
} from "./service.js";

export async function helpdeskRoutes(app: FastifyInstance) {
  app.get("/v1/helpdesk", async (request, reply) => {
    try {
      const auth = requireModule(request, "helpdesk");
      const tickets = await getTickets(db, auth.companyId);
      return reply.send(HelpdeskListResponseSchema.parse({ tickets }));
    } catch (error) {
      return handleDomainRouteError(reply, error, "helpdesk list failed");
    }
  });

  app.post("/v1/helpdesk", async (request, reply) => {
    try {
      const auth = requireModule(request, "helpdesk");
      const body = HelpdeskCreateSchema.parse(request.body);
      const ticket = await createTicketForCompany(db, auth, body);
      return reply.status(201).send(HelpdeskResponseSchema.parse({ ticket }));
    } catch (error) {
      return handleDomainRouteError(reply, error, "helpdesk create failed");
    }
  });

  app.get("/v1/helpdesk/:id", async (request, reply) => {
    try {
      const auth = requireModule(request, "helpdesk");
      const { id } = request.params as { id: string };
      const ticket = await getTicketDetail(db, auth.companyId, id);
      return reply.send(HelpdeskResponseSchema.parse({ ticket }));
    } catch (error) {
      return handleDomainRouteError(reply, error, "helpdesk get failed");
    }
  });

  app.patch("/v1/helpdesk/:id", async (request, reply) => {
    try {
      const auth = requireModule(request, "helpdesk");
      const { id } = request.params as { id: string };
      const body = HelpdeskPatchSchema.parse(request.body);
      const ticket = await updateTicketForCompany(db, auth, id, body);
      return reply.send(HelpdeskResponseSchema.parse({ ticket }));
    } catch (error) {
      return handleDomainRouteError(reply, error, "helpdesk patch failed");
    }
  });
}
