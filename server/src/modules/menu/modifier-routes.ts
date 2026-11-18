import { FastifyInstance } from "fastify";
import { z } from "zod";
import { PERMISSIONS } from "@rms/shared";
import { requirePermission } from "../../middleware/rbac.js";

/**
 * Grupos de extras ("¿con qué proteína?", "Adicionales") y sus opciones.
 *
 * Hasta ahora solo existian por script, asi que el restaurante no podia cambiar con que se
 * puede pedir un plato ni cuanto vale un adicional sin que alguien tocara la base de datos.
 */

const grupoSchema = z.object({
  name: z.string().min(1),
  // minSelect 0 = opcional; 1 = obligatorio elegir. maxSelect = cuantas opciones caben.
  minSelect: z.number().int().min(0).default(0),
  maxSelect: z.number().int().min(1).default(1),
});

const opcionSchema = z.object({
  name: z.string().min(1),
  priceDelta: z.number().min(0).default(0),
});

export default async function modifierRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", fastify.authenticate);
  fastify.addHook("preHandler", requirePermission(PERMISSIONS.MENU_MANAGE));

  fastify.get("/api/modifier-groups", async () => {
    const grupos = await fastify.prisma.modifierGroup.findMany({
      include: {
        modifiers: { orderBy: { name: "asc" } },
        menuItems: { include: { menuItem: { select: { id: true, name: true, archived: true } } } },
      },
      orderBy: { name: "asc" },
    });

    return grupos.map((g) => ({
      id: g.id,
      name: g.name,
      minSelect: g.minSelect,
      maxSelect: g.maxSelect,
      modifiers: g.modifiers.map((m) => ({
        id: m.id,
        name: m.name,
        priceDelta: m.priceDelta.toNumber(),
      })),
      itemIds: g.menuItems.filter((l) => !l.menuItem.archived).map((l) => l.menuItem.id),
      itemNames: g.menuItems.filter((l) => !l.menuItem.archived).map((l) => l.menuItem.name),
    }));
  });

  fastify.post("/api/modifier-groups", async (request, reply) => {
    const parsed = grupoSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
    const grupo = await fastify.prisma.modifierGroup.create({ data: parsed.data });
    return reply.code(201).send({ id: grupo.id });
  });

  fastify.patch("/api/modifier-groups/:id", async (request, reply) => {
    const parsed = grupoSchema.partial().safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
    const { id } = request.params as { id: string };
    await fastify.prisma.modifierGroup.update({ where: { id }, data: parsed.data });
    return { ok: true };
  });

  fastify.delete("/api/modifier-groups/:id", async (request) => {
    const { id } = request.params as { id: string };
    // Los pedidos viejos guardan el nombre y el precio del extra en su propio registro
    // (nameSnapshot/priceDeltaSnapshot), asi que borrar el grupo no altera cuentas pasadas.
    await fastify.prisma.modifierGroup.delete({ where: { id } });
    return { ok: true };
  });

  fastify.post("/api/modifier-groups/:id/modifiers", async (request, reply) => {
    const parsed = opcionSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
    const { id } = request.params as { id: string };
    const opcion = await fastify.prisma.modifier.create({ data: { ...parsed.data, groupId: id } });
    return reply.code(201).send({ id: opcion.id });
  });

  fastify.patch("/api/modifiers/:id", async (request, reply) => {
    const parsed = opcionSchema.partial().safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
    const { id } = request.params as { id: string };
    await fastify.prisma.modifier.update({ where: { id }, data: parsed.data });
    return { ok: true };
  });

  fastify.delete("/api/modifiers/:id", async (request) => {
    const { id } = request.params as { id: string };
    await fastify.prisma.modifier.delete({ where: { id } });
    return { ok: true };
  });

  /** Define en que platos aparece este grupo de extras. */
  fastify.put("/api/modifier-groups/:id/items", async (request, reply) => {
    const parsed = z.object({ itemIds: z.array(z.string()) }).safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
    const { id } = request.params as { id: string };

    await fastify.prisma.$transaction([
      fastify.prisma.menuItemModifierGroup.deleteMany({ where: { groupId: id } }),
      fastify.prisma.menuItemModifierGroup.createMany({
        data: parsed.data.itemIds.map((menuItemId) => ({ groupId: id, menuItemId })),
        skipDuplicates: true,
      }),
    ]);

    return { ok: true };
  });
}
