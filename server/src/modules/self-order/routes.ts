import { FastifyInstance } from "fastify";
import { z } from "zod";
import { findTableByToken, getPublicMenuForTable, getPublicTableStatus, placeSelfServiceOrder } from "./service.js";
import { createServiceRequest } from "../service-requests/service.js";

const dinerSchema = {
  // Id anonimo que el celular del comensal genera la primera vez (no es un dato personal).
  dinerId: z.string().min(8).max(64),
  dinerName: z.string().trim().min(1).max(40),
};

const placeOrderSchema = z.object({
  ...dinerSchema,
  items: z
    .array(
      z.object({
        menuItemId: z.string(),
        quantity: z.number().int().positive().max(20),
        notes: z.string().max(200).optional(),
        modifierIds: z.array(z.string()).max(20).optional(),
      })
    )
    .min(1)
    .max(30),
});

const serviceRequestSchema = z.object({
  ...dinerSchema,
  type: z.enum(["WAITER", "BILL"]),
  billScope: z.enum(["ALL", "MINE"]).optional(),
  paymentHint: z.enum(["CASH", "CARD", "TRANSFER"]).optional(),
});

/**
 * Rutas publicas (sin PIN) para el celular del comensal que escaneo el QR de su mesa. El QR
 * lleva el codigo secreto de la mesa (/m/<token>), no su nombre: sin el QR fisico no se puede
 * pedir. Limitadas por rate-limit (registrado en index.ts con global: false).
 */
export default async function selfOrderRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/api/public/m/:token/menu",
    { config: { rateLimit: { max: 60, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const { token } = request.params as { token: string };
      const menu = await getPublicMenuForTable(fastify.prisma, token);
      if (!menu) return reply.code(404).send({ error: "Mesa no encontrada" });
      return menu;
    }
  );

  fastify.post(
    "/api/public/m/:token/pedido",
    { config: { rateLimit: { max: 15, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const { token } = request.params as { token: string };
      const parsed = placeOrderSchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });

      try {
        const order = await placeSelfServiceOrder(fastify.prisma, fastify.io, { token, ...parsed.data });
        return reply.code(201).send({ id: order.id });
      } catch (err) {
        return reply.code(400).send({ error: (err as Error).message });
      }
    }
  );

  fastify.get(
    "/api/public/m/:token/estado",
    { config: { rateLimit: { max: 60, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const { token } = request.params as { token: string };
      const { dinerId } = request.query as { dinerId?: string };
      const status = await getPublicTableStatus(fastify.prisma, token, dinerId ?? null);
      if (!status) return reply.code(404).send({ error: "Mesa no encontrada" });
      return status;
    }
  );

  fastify.post(
    "/api/public/m/:token/llamado",
    { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const { token } = request.params as { token: string };
      const parsed = serviceRequestSchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });

      const table = await findTableByToken(fastify.prisma, token);
      if (!table) return reply.code(404).send({ error: "Mesa no encontrada" });

      const dto = await createServiceRequest(fastify.prisma, fastify.io, { tableId: table.id, ...parsed.data });
      return reply.code(201).send({ id: dto.id, type: dto.type });
    }
  );
}
