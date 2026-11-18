import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { PERMISSIONS } from "@rms/shared";
import { decideApproval, listApprovals, requestApproval } from "./service.js";

const createSchema = z.object({
  type: z.enum(["DISCOUNT", "VOID_ITEM", "VOID_ORDER", "REFUND"]),
  entityType: z.string(),
  entityId: z.string(),
  reason: z.string().optional(),
  payload: z.record(z.unknown()).optional(),
});

const decideSchema = z.object({ decision: z.enum(["APPROVED", "DENIED"]) });

async function requireApprover(request: FastifyRequest, reply: FastifyReply) {
  const perms = request.user?.permissions ?? [];
  const canApproveAny = [
    PERMISSIONS.DISCOUNTS_APPROVE,
    PERMISSIONS.VOID_APPROVE,
    PERMISSIONS.REFUNDS_APPROVE,
  ].some((p) => perms.includes(p));
  if (!canApproveAny) {
    reply.code(403).send({ error: "No tienes permiso para ver aprobaciones" });
  }
}

export default async function approvalRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", fastify.authenticate);

  fastify.post("/api/approvals", async (request, reply) => {
    const parsed = createSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });

    try {
      const result = await requestApproval(fastify.prisma, fastify.io, {
        ...parsed.data,
        requestedById: request.user.id,
        requesterPermissions: request.user.permissions,
      });
      return reply.code(201).send(result);
    } catch (err) {
      return reply.code(400).send({ error: (err as Error).message });
    }
  });

  fastify.get("/api/approvals", { preHandler: requireApprover }, async (request) => {
    const { status } = request.query as { status?: string };
    return listApprovals(fastify.prisma, status);
  });

  fastify.patch("/api/approvals/:id", { preHandler: requireApprover }, async (request, reply) => {
    const parsed = decideSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
    const { id } = request.params as { id: string };

    try {
      const result = await decideApproval(
        fastify.prisma,
        fastify.io,
        id,
        parsed.data.decision,
        request.user.id,
        request.user.permissions
      );
      return result;
    } catch (err) {
      return reply.code(400).send({ error: (err as Error).message });
    }
  });
}
