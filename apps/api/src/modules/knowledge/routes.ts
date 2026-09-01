import type { FastifyInstance } from "fastify";
import { db } from "@reanzly/database";
import {
  KnowledgeCreateSchema,
  KnowledgeListResponseSchema,
  KnowledgePatchSchema,
  KnowledgeResponseSchema,
} from "@reanzly/contracts";
import { requireModule } from "../../plugins/module-guard.js";
import { handleDomainRouteError } from "../../lib/domain-error.js";
import {
  createArticleForCompany,
  getArticleDetail,
  getArticles,
  updateArticleForCompany,
} from "./service.js";

export async function knowledgeRoutes(app: FastifyInstance) {
  app.get("/v1/knowledge", async (request, reply) => {
    try {
      const auth = requireModule(request, "knowledge");
      const articles = await getArticles(db, auth.companyId);
      return reply.send(KnowledgeListResponseSchema.parse({ articles }));
    } catch (error) {
      return handleDomainRouteError(reply, error, "knowledge list failed");
    }
  });

  app.post("/v1/knowledge", async (request, reply) => {
    try {
      const auth = requireModule(request, "knowledge");
      const body = KnowledgeCreateSchema.parse(request.body);
      const article = await createArticleForCompany(db, auth, body);
      return reply.status(201).send(KnowledgeResponseSchema.parse({ article }));
    } catch (error) {
      return handleDomainRouteError(reply, error, "knowledge create failed");
    }
  });

  app.get("/v1/knowledge/:id", async (request, reply) => {
    try {
      const auth = requireModule(request, "knowledge");
      const { id } = request.params as { id: string };
      const article = await getArticleDetail(db, auth.companyId, id);
      return reply.send(KnowledgeResponseSchema.parse({ article }));
    } catch (error) {
      return handleDomainRouteError(reply, error, "knowledge get failed");
    }
  });

  app.patch("/v1/knowledge/:id", async (request, reply) => {
    try {
      const auth = requireModule(request, "knowledge");
      const { id } = request.params as { id: string };
      const body = KnowledgePatchSchema.parse(request.body);
      const article = await updateArticleForCompany(db, auth, id, body);
      return reply.send(KnowledgeResponseSchema.parse({ article }));
    } catch (error) {
      return handleDomainRouteError(reply, error, "knowledge patch failed");
    }
  });
}
