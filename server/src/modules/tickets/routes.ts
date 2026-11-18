import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { PERMISSIONS } from "@rms/shared";
import { requirePermission } from "../../middleware/rbac.js";
import {
  FLOOR_ACTIONS,
  KITCHEN_ACTIONS,
  OPEN_TICKET_STATUSES,
  advanceTicket,
  getTicketDTOs,
  markItemSoldOut,
  markTicketsSeen,
} from "./service.js";

const actionSchema = z.object({
  action: z.enum(["confirm", "start", "ready", "pickup", "deliver", "reject"]),
  reason: z.string().max(200).optional(),
});

function has(request: FastifyRequest, ...perms: string[]) {
  const mine = request.user?.permissions ?? [];
  return perms.some((p) => mine.includes(p));
}

async function requireFloorOrKitchen(request: FastifyRequest, reply: FastifyReply) {
  if (!has(request, PERMISSIONS.KDS_MANAGE, PERMISSIONS.ORDERS_CREATE, PERMISSIONS.CASH_MANAGE)) {
    reply.code(403).send({ error: "No tienes permiso para esta acción" });
  }
}

export default async function ticketRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", fastify.authenticate);

  // Tablero de cocina. Abrirlo marca como "Recibido por cocina" lo que estaba solo "Enviado":
  // es lo que el comensal ve como "cocina ya vio tu pedido".
  fastify.get(
    "/api/tickets/kitchen",
    { preHandler: requirePermission(PERMISSIONS.KDS_MANAGE) },
    async () => {
      await markTicketsSeen(fastify.prisma, fastify.io);
      return getTicketDTOs(fastify.prisma, { status: { in: OPEN_TICKET_STATUSES } });
    }
  );

  // Lo que el mesero tiene que llevar a las mesas.
  fastify.get("/api/tickets/floor", { preHandler: requireFloorOrKitchen }, async () =>
    getTicketDTOs(fastify.prisma, { status: { in: ["READY", "ON_THE_WAY"] } })
  );

  fastify.post("/api/tickets/:id/action", async (request, reply) => {
    const parsed = actionSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
    const { id } = request.params as { id: string };
    const { action, reason } = parsed.data;

    const allowed =
      (KITCHEN_ACTIONS.includes(action) && has(request, PERMISSIONS.KDS_MANAGE)) ||
      (FLOOR_ACTIONS.includes(action) &&
        has(request, PERMISSIONS.KDS_MANAGE, PERMISSIONS.ORDERS_CREATE, PERMISSIONS.CASH_MANAGE));
    if (!allowed) return reply.code(403).send({ error: "No tienes permiso para esta acción" });

    try {
      return await advanceTicket(fastify.prisma, fastify.io, {
        ticketId: id,
        action,
        actingUserId: request.user.id,
        reason,
      });
    } catch (err) {
      return reply.code(400).send({ error: (err as Error).message });
    }
  });

  fastify.post(
    "/api/tickets/items/:id/sold-out",
    { preHandler: requirePermission(PERMISSIONS.KDS_MANAGE) },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const parsed = z.object({ reason: z.string().max(200).optional() }).safeParse(request.body ?? {});
      try {
        return await markItemSoldOut(fastify.prisma, fastify.io, {
          orderItemId: id,
          actingUserId: request.user.id,
          reason: parsed.success ? parsed.data.reason : undefined,
        });
      } catch (err) {
        return reply.code(400).send({ error: (err as Error).message });
      }
    }
  );
}
