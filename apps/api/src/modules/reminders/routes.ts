import type { FastifyInstance } from "fastify";
import { db } from "@reanzly/database";
import {
  ReminderCreateSchema,
  ReminderListResponseSchema,
  ReminderPatchSchema,
  ReminderResponseSchema,
} from "@reanzly/contracts";
import { requireModule } from "../../plugins/module-guard.js";
import { handleDomainRouteError } from "../../lib/domain-error.js";
import {
  createReminderForCompany,
  getReminders,
  removeReminderForCompany,
  updateReminderForCompany,
} from "./service.js";

export async function remindersRoutes(app: FastifyInstance) {
  app.get("/v1/reminders", async (request, reply) => {
    try {
      const auth = requireModule(request, "reminders");
      const reminders = await getReminders(db, auth.companyId);
      return reply.send(ReminderListResponseSchema.parse({ reminders }));
    } catch (error) {
      return handleDomainRouteError(reply, error, "reminders list failed");
    }
  });

  app.post("/v1/reminders", async (request, reply) => {
    try {
      const auth = requireModule(request, "reminders");
      const body = ReminderCreateSchema.parse(request.body);
      const reminder = await createReminderForCompany(db, auth.companyId, body);
      return reply.status(201).send(ReminderResponseSchema.parse({ reminder }));
    } catch (error) {
      return handleDomainRouteError(reply, error, "reminders create failed");
    }
  });

  app.patch("/v1/reminders/:id", async (request, reply) => {
    try {
      const auth = requireModule(request, "reminders");
      const { id } = request.params as { id: string };
      const body = ReminderPatchSchema.parse(request.body);
      const reminder = await updateReminderForCompany(db, auth.companyId, id, body);
      return reply.send(ReminderResponseSchema.parse({ reminder }));
    } catch (error) {
      return handleDomainRouteError(reply, error, "reminders patch failed");
    }
  });

  app.delete("/v1/reminders/:id", async (request, reply) => {
    try {
      const auth = requireModule(request, "reminders");
      const { id } = request.params as { id: string };
      const result = await removeReminderForCompany(db, auth.companyId, id);
      return reply.send(result);
    } catch (error) {
      return handleDomainRouteError(reply, error, "reminders delete failed");
    }
  });
}
