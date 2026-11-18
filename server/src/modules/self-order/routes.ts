import { FastifyInstance } from "fastify";
import { z } from "zod";
import { getPublicMenuForTable, placeSelfServiceOrder, getSelfServiceOrderStatus } from "./service.js";

const placeOrderSchema = z.object({
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

/**
 * Public, unauthenticated routes so a diner's own phone (scanning a table QR) can browse the
 * menu and place an order without a staff PIN. Not registered behind `fastify.authenticate` —
 * Fastify plugin encapsulation keeps that hook scoped to the modules that add it themselves.
 */
export default async function selfOrderRoutes(fastify: FastifyInstance) {
  fastify.get("/api/public/mesa/:tableLabel/menu", async (request, reply) => {
    const { tableLabel } = request.params as { tableLabel: string };
    const menu = await getPublicMenuForTable(fastify.prisma, tableLabel);
    if (!menu) return reply.code(404).send({ error: "Mesa no encontrada" });
    return menu;
  });

  fastify.post("/api/public/mesa/:tableLabel/pedido", async (request, reply) => {
    const { tableLabel } = request.params as { tableLabel: string };
    const parsed = placeOrderSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });

    try {
      const order = await placeSelfServiceOrder(fastify.prisma, fastify.io, {
        tableLabel,
        items: parsed.data.items,
      });
      return reply.code(201).send(order);
    } catch (err) {
      return reply.code(400).send({ error: (err as Error).message });
    }
  });

  fastify.get("/api/public/pedido/:orderId/estado", async (request, reply) => {
    const { orderId } = request.params as { orderId: string };
    const status = await getSelfServiceOrderStatus(fastify.prisma, orderId);
    if (!status) return reply.code(404).send({ error: "Pedido no encontrado" });
    return status;
  });
}
