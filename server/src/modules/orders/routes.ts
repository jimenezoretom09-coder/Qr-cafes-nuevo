import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { PERMISSIONS } from "@rms/shared";
import { requirePermission } from "../../middleware/rbac.js";
import {
  createOrGrowOrder,
  getOpenOrdersForCheckout,
  getOrder,
  getStationQueue,
  getWaiterOpenOrders,
  updateOrderItemStatus,
} from "./service.js";
import { requestApproval } from "../approvals/service.js";

const newOrderSchema = z.object({
  tableId: z.string(),
  items: z.array(
    z.object({
      menuItemId: z.string(),
      quantity: z.number().int().positive().default(1),
      notes: z.string().optional(),
      modifierIds: z.array(z.string()).default([]),
    })
  ).min(1),
});

const statusSchema = z.object({
  status: z.enum(["IN_PREPARATION", "READY", "SERVED", "CANCELLED"]),
});

async function requireKitchenOrWaiter(request: FastifyRequest, reply: FastifyReply) {
  const perms = request.user?.permissions ?? [];
  if (!perms.includes(PERMISSIONS.KDS_MANAGE) && !perms.includes(PERMISSIONS.ORDERS_CREATE)) {
    reply.code(403).send({ error: "No tienes permiso para esta acción" });
  }
}

export default async function orderRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", fastify.authenticate);

  fastify.post(
    "/api/orders",
    { preHandler: requirePermission(PERMISSIONS.ORDERS_CREATE) },
    async (request, reply) => {
      const parsed = newOrderSchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });

      try {
        const order = await createOrGrowOrder(fastify.prisma, fastify.io, {
          tableId: parsed.data.tableId,
          waiterId: request.user.id,
          items: parsed.data.items,
        });
        return reply.code(201).send(order);
      } catch (err) {
        return reply.code(400).send({ error: (err as Error).message });
      }
    }
  );

  fastify.get(
    "/api/orders/mine",
    { preHandler: requirePermission(PERMISSIONS.ORDERS_VIEW_OWN) },
    async (request) => getWaiterOpenOrders(fastify.prisma, request.user.id)
  );

  fastify.patch(
    "/api/orders/items/:id/status",
    { preHandler: requireKitchenOrWaiter },
    async (request, reply) => {
      const parsed = statusSchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
      const { id } = request.params as { id: string };

      // Cancelling ("anular") is a sensitive action — route it through the approval
      // workflow instead of applying it directly (auto-applies if the actor already
      // holds VOID_APPROVE, e.g. a manager/admin cancelling their own way).
      if (parsed.data.status === "CANCELLED") {
        try {
          const result = await requestApproval(fastify.prisma, fastify.io, {
            type: "VOID_ITEM",
            entityType: "OrderItem",
            entityId: id,
            requestedById: request.user.id,
            requesterPermissions: request.user.permissions,
          });
          return reply.code(result.status === "PENDING" ? 202 : 200).send(result);
        } catch (err) {
          return reply.code(400).send({ error: (err as Error).message });
        }
      }

      try {
        const result = await updateOrderItemStatus(fastify.prisma, fastify.io, {
          orderItemId: id,
          nextStatus: parsed.data.status,
          actingUserId: request.user.id,
        });
        return result;
      } catch (err) {
        return reply.code(400).send({ error: (err as Error).message });
      }
    }
  );

  fastify.get(
    "/api/kds/:stationId/queue",
    { preHandler: requirePermission(PERMISSIONS.KDS_MANAGE) },
    async (request) => {
      const { stationId } = request.params as { stationId: string };
      return getStationQueue(fastify.prisma, stationId);
    }
  );

  fastify.get(
    "/api/orders/open",
    { preHandler: requirePermission(PERMISSIONS.CASH_MANAGE) },
    async () => getOpenOrdersForCheckout(fastify.prisma)
  );

  fastify.get(
    "/api/orders/:id",
    { preHandler: requirePermission(PERMISSIONS.CASH_MANAGE) },
    async (request) => {
      const { id } = request.params as { id: string };
      return getOrder(fastify.prisma, id);
    }
  );
}
