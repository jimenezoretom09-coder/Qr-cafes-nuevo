import { FastifyInstance } from "fastify";
import { z } from "zod";
import { rooms, PERMISSIONS } from "@rms/shared";
import { requirePermission } from "../../middleware/rbac.js";

const OPEN_ORDER_STATUSES = ["OPEN", "IN_PROGRESS", "READY", "SERVED"];
const GRID_COLUMNS = 4;
const GRID_SPACING = 140;
const GRID_ORIGIN = 40;

const statusSchema = z.object({
  status: z.enum(["FREE", "OCCUPIED", "BILL_REQUESTED", "RESERVED"]),
});

const createTableSchema = z.object({
  label: z.string().min(1).max(30),
  capacity: z.number().int().positive().max(50).default(4),
});

const updateTableSchema = z.object({
  label: z.string().min(1).max(30).optional(),
  capacity: z.number().int().positive().max(50).optional(),
});

export default async function tableRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", fastify.authenticate);

  fastify.get("/api/tables", async () => {
    const tables = await fastify.prisma.restaurantTable.findMany({
      where: { archived: false },
      include: {
        orders: {
          where: { status: { in: OPEN_ORDER_STATUSES } },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { label: "asc" },
    });

    return tables.map((t) => ({
      id: t.id,
      label: t.label,
      capacity: t.capacity,
      zone: t.zone,
      posX: t.posX,
      posY: t.posY,
      status: t.status,
      activeOrderId: t.orders[0]?.id ?? null,
    }));
  });

  fastify.post(
    "/api/tables",
    { preHandler: requirePermission(PERMISSIONS.TABLES_MANAGE) },
    async (request, reply) => {
      const parsed = createTableSchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });

      const existing = await fastify.prisma.restaurantTable.findUnique({ where: { label: parsed.data.label } });
      if (existing) return reply.code(400).send({ error: `Ya existe una mesa llamada "${parsed.data.label}"` });

      // Ubica la mesa nueva en la siguiente casilla libre de una cuadricula simple
      // (4 por fila) para que aparezca en el mapa sin que nadie tenga que
      // acomodarla a mano.
      const totalTables = await fastify.prisma.restaurantTable.count();
      const col = totalTables % GRID_COLUMNS;
      const row = Math.floor(totalTables / GRID_COLUMNS);

      const table = await fastify.prisma.restaurantTable.create({
        data: {
          label: parsed.data.label,
          capacity: parsed.data.capacity,
          posX: GRID_ORIGIN + col * GRID_SPACING,
          posY: GRID_ORIGIN + row * GRID_SPACING,
        },
      });

      fastify.io.to(rooms.global()).emit("table:status_changed", { tableId: table.id, status: "FREE" });
      return reply.code(201).send({ id: table.id });
    }
  );

  fastify.patch(
    "/api/tables/:id",
    { preHandler: requirePermission(PERMISSIONS.TABLES_MANAGE) },
    async (request, reply) => {
      const parsed = updateTableSchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
      const { id } = request.params as { id: string };

      if (parsed.data.label) {
        const existing = await fastify.prisma.restaurantTable.findUnique({ where: { label: parsed.data.label } });
        if (existing && existing.id !== id) {
          return reply.code(400).send({ error: `Ya existe una mesa llamada "${parsed.data.label}"` });
        }
      }

      await fastify.prisma.restaurantTable.update({ where: { id }, data: parsed.data });
      return { ok: true };
    }
  );

  fastify.delete(
    "/api/tables/:id",
    { preHandler: requirePermission(PERMISSIONS.TABLES_MANAGE) },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const table = await fastify.prisma.restaurantTable.findUniqueOrThrow({ where: { id } });

      if (table.status !== "FREE") {
        return reply.code(400).send({ error: "No puedes quitar una mesa que está ocupada o con cuenta pedida" });
      }

      // El nombre tiene que quedar libre para poder reusarlo en una mesa nueva
      // mas adelante — el label original solo se conserva en el historial de
      // pedidos ya cerrados de esta mesa, no en la lista activa.
      await fastify.prisma.restaurantTable.update({
        where: { id },
        data: { archived: true, label: `${table.label} (borrada ${Date.now()})` },
      });
      return { ok: true };
    }
  );

  fastify.patch(
    "/api/tables/:id/status",
    { preHandler: requirePermission(PERMISSIONS.TABLES_MANAGE) },
    async (request, reply) => {
      const parsed = statusSchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
      const { id } = request.params as { id: string };

      const table = await fastify.prisma.restaurantTable.update({
        where: { id },
        data: { status: parsed.data.status },
      });

      fastify.io.to(rooms.global()).emit("table:status_changed", {
        tableId: table.id,
        status: table.status as "FREE" | "OCCUPIED" | "BILL_REQUESTED" | "RESERVED",
      });

      return { ok: true };
    }
  );
}
