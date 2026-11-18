import { FastifyInstance } from "fastify";
import { z } from "zod";
import { PERMISSIONS } from "@rms/shared";
import { requirePermission } from "../../middleware/rbac.js";
import { recordPayment } from "../orders/service.js";
import { listPaymentsForOrder, refundPayment } from "./service.js";
import { getCurrentSession } from "../cash-sessions/service.js";

const paymentSchema = z.object({
  method: z.enum(["CASH", "CARD", "DIGITAL"]),
  tipAmount: z.number().min(0).default(0),
  itemIds: z.array(z.string()).optional(),
  // Cobrar solo algunas unidades de una linea: 2 de los 4 morrillos.
  itemPortions: z
    .array(z.object({ orderItemId: z.string(), quantity: z.number().int().min(1) }))
    .optional(),
  splitEvenly: z.object({ groupId: z.string(), partsTotal: z.number().int().min(2) }).optional(),
  splitLabel: z.string().optional(),
});

export default async function paymentRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", fastify.authenticate);

  fastify.post(
    "/api/orders/:id/payments",
    { preHandler: requirePermission(PERMISSIONS.CASH_MANAGE) },
    async (request, reply) => {
      const parsed = paymentSchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
      const { id } = request.params as { id: string };

      const session = await getCurrentSession(fastify.prisma);
      if (!session) {
        return reply.code(400).send({ error: "No hay una caja abierta. Abre la caja antes de cobrar." });
      }

      try {
        const result = await recordPayment(fastify.prisma, fastify.io, {
          orderId: id,
          method: parsed.data.method,
          tipAmount: parsed.data.tipAmount,
          itemIds: parsed.data.itemIds,
          itemPortions: parsed.data.itemPortions,
          splitEvenly: parsed.data.splitEvenly,
          splitLabel: parsed.data.splitLabel,
          createdById: request.user.id,
          cashSessionId: session.id,
        });
        return reply.code(201).send(result);
      } catch (err) {
        return reply.code(400).send({ error: (err as Error).message });
      }
    }
  );

  fastify.get(
    "/api/orders/:id/payments",
    { preHandler: requirePermission(PERMISSIONS.CASH_MANAGE) },
    async (request) => {
      const { id } = request.params as { id: string };
      return listPaymentsForOrder(fastify.prisma, id);
    }
  );

  fastify.post(
    "/api/payments/:id/refund",
    { preHandler: requirePermission(PERMISSIONS.REFUNDS_APPROVE) },
    async (request) => {
      const { id } = request.params as { id: string };
      await refundPayment(fastify.prisma, id, request.user.id);
      return { ok: true };
    }
  );
}
