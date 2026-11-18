import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { PERMISSIONS, rooms } from "@rms/shared";
import { requirePermission } from "../../middleware/rbac.js";
import { closeSession, getCurrentSession, getSessionDetail, listSessions, openSession } from "./service.js";
import { listPaymentsForSession } from "../payments/service.js";

const openSchema = z.object({ openingAmount: z.number().min(0) });
const closeSchema = z.object({ countedAmount: z.number().min(0) });

async function requireCashOrReports(request: FastifyRequest, reply: FastifyReply) {
  const perms = request.user?.permissions ?? [];
  if (!perms.includes(PERMISSIONS.CASH_MANAGE) && !perms.includes(PERMISSIONS.REPORTS_VIEW)) {
    reply.code(403).send({ error: "No tienes permiso para esta acción" });
  }
}

export default async function cashSessionRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", fastify.authenticate);

  fastify.get("/api/cash-sessions/current", { preHandler: requirePermission(PERMISSIONS.CASH_MANAGE) }, async () => {
    return getCurrentSession(fastify.prisma);
  });

  fastify.get("/api/cash-sessions", { preHandler: requireCashOrReports }, async () => {
    return listSessions(fastify.prisma);
  });

  fastify.get(
    "/api/cash-sessions/:id",
    { preHandler: requireCashOrReports },
    async (request) => {
      const { id } = request.params as { id: string };
      return getSessionDetail(fastify.prisma, id);
    }
  );

  fastify.get(
    "/api/cash-sessions/:id/payments",
    { preHandler: requireCashOrReports },
    async (request) => {
      const { id } = request.params as { id: string };
      return listPaymentsForSession(fastify.prisma, id);
    }
  );

  fastify.post(
    "/api/cash-sessions/open",
    { preHandler: requirePermission(PERMISSIONS.CASH_MANAGE) },
    async (request, reply) => {
      const parsed = openSchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });

      try {
        const session = await openSession(fastify.prisma, request.user.id, parsed.data.openingAmount);
        const payload = session;
        broadcastCashEvent(fastify, "cash:session_opened", payload);
        return reply.code(201).send(session);
      } catch (err) {
        return reply.code(400).send({ error: (err as Error).message });
      }
    }
  );

  fastify.post(
    "/api/cash-sessions/:id/close",
    { preHandler: requirePermission(PERMISSIONS.CASH_MANAGE) },
    async (request, reply) => {
      const parsed = closeSchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
      const { id } = request.params as { id: string };

      try {
        const session = await closeSession(fastify.prisma, id, request.user.id, parsed.data.countedAmount);
        broadcastCashEvent(fastify, "cash:session_closed", session);
        return session;
      } catch (err) {
        return reply.code(400).send({ error: (err as Error).message });
      }
    }
  );
}

function broadcastCashEvent(fastify: FastifyInstance, event: "cash:session_opened" | "cash:session_closed", payload: unknown) {
  for (const roleName of ["CASHIER", "MANAGER", "ADMIN"]) {
    fastify.io.to(rooms.role(roleName)).emit(event, payload as never);
  }
}
