import { FastifyInstance } from "fastify";
import { z } from "zod";
import { rooms, PERMISSIONS } from "@rms/shared";
import { requirePermission } from "../../middleware/rbac.js";
import { recordAudit } from "../audit/service.js";
import { archiveMenuItem, getMenuTree } from "./service.js";

const createCategorySchema = z.object({
  name: z.string().min(1),
  sortOrder: z.number().default(0),
  mealPeriod: z.enum(["BREAKFAST", "LUNCH", "ALL"]).default("LUNCH"),
});

const updateCategorySchema = createCategorySchema.partial();

// Acepta un enlace externo (https://...) o una ruta propia del sitio (/videos/ajiaco.mp4),
// porque las fotos y videos del restaurante se sirven desde el mismo sitio en web/public.
// Cadena vacia = borrar el medio.
const urlOrClear = z
  .string()
  .refine((v) => v === "" || v.startsWith("/") || /^https?:\/\//.test(v), {
    message: "Debe ser un enlace https:// o una ruta del sitio que empiece con /",
  })
  .optional()
  .transform((v) => (v === "" ? null : v));

const createItemSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  imageUrl: urlOrClear,
  videoUrl: urlOrClear,
  allergens: z.array(z.string()).optional(),
  includesDrink: z.boolean().optional(),
  isIncludedDrink: z.boolean().optional(),
  isAdult: z.boolean().optional(),
  price: z.number().positive(),
  categoryId: z.string(),
  stationId: z.string(),
  course: z.enum(["STARTER", "MAIN", "DESSERT", "DRINK"]),
  preparationTimeEstimateMin: z.number().int().positive().default(10),
});

const updateItemSchema = createItemSchema.partial().extend({
  available: z.boolean().optional(),
});

const availabilitySchema = z.object({ available: z.boolean() });

const createStationSchema = z.object({
  name: z.string().min(1).max(40),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default("#64748b"),
});
const updateStationSchema = createStationSchema.partial();

export default async function menuRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", fastify.authenticate);

  fastify.get("/api/menu", async () => getMenuTree(fastify.prisma));

  fastify.get("/api/stations", async () => fastify.prisma.kitchenStation.findMany({ orderBy: { name: "asc" } }));

  fastify.post(
    "/api/stations",
    { preHandler: requirePermission(PERMISSIONS.MENU_MANAGE) },
    async (request, reply) => {
      const parsed = createStationSchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });

      const existing = await fastify.prisma.kitchenStation.findUnique({ where: { name: parsed.data.name } });
      if (existing) return reply.code(400).send({ error: `Ya existe una estación llamada "${parsed.data.name}"` });

      const station = await fastify.prisma.kitchenStation.create({ data: parsed.data });
      return reply.code(201).send({ id: station.id });
    }
  );

  fastify.patch(
    "/api/stations/:id",
    { preHandler: requirePermission(PERMISSIONS.MENU_MANAGE) },
    async (request, reply) => {
      const parsed = updateStationSchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
      const { id } = request.params as { id: string };

      if (parsed.data.name) {
        const existing = await fastify.prisma.kitchenStation.findUnique({ where: { name: parsed.data.name } });
        if (existing && existing.id !== id) {
          return reply.code(400).send({ error: `Ya existe una estación llamada "${parsed.data.name}"` });
        }
      }

      await fastify.prisma.kitchenStation.update({ where: { id }, data: parsed.data });
      return { ok: true };
    }
  );

  fastify.delete(
    "/api/stations/:id",
    { preHandler: requirePermission(PERMISSIONS.MENU_MANAGE) },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      // A diferencia de mesas y platos, las estaciones no se archivan: no hay nada en el
      // historial que dependa de que siga existiendo (los pedidos solo copian su id a modo de
      // texto para enrutar en cocina, no una relacion real). Si todavia hay platos activos
      // apuntando a ella, se avisa en vez de dejarlos sin estacion.
      const platosActivos = await fastify.prisma.menuItem.count({ where: { stationId: id, archived: false } });
      if (platosActivos > 0) {
        return reply
          .code(400)
          .send({ error: `No puedes eliminar esta estación: ${platosActivos} plato(s) todavía la usan.` });
      }
      const categoriasQueLaUsan = await fastify.prisma.menuCategory.count({
        where: { defaultStationId: id, archived: false },
      });
      if (categoriasQueLaUsan > 0) {
        return reply
          .code(400)
          .send({ error: `No puedes eliminar esta estación: ${categoriasQueLaUsan} categoría(s) la usan por defecto.` });
      }

      await fastify.prisma.kitchenStation.delete({ where: { id } });
      return { ok: true };
    }
  );

  fastify.post(
    "/api/menu/categories",
    { preHandler: requirePermission(PERMISSIONS.MENU_MANAGE) },
    async (request, reply) => {
      const parsed = createCategorySchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
      const category = await fastify.prisma.menuCategory.create({ data: parsed.data });
      return reply.code(201).send({ id: category.id });
    }
  );

  fastify.patch(
    "/api/menu/categories/:id",
    { preHandler: requirePermission(PERMISSIONS.MENU_MANAGE) },
    async (request, reply) => {
      const parsed = updateCategorySchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
      const { id } = request.params as { id: string };

      await fastify.prisma.menuCategory.update({ where: { id }, data: parsed.data });
      await recordAudit(fastify.prisma, {
        userId: request.user.id,
        action: "MENU_CATEGORY_UPDATED",
        entityType: "MenuCategory",
        entityId: id,
        metadata: { changes: Object.keys(parsed.data) },
      });

      return { ok: true };
    }
  );

  fastify.post(
    "/api/menu/items",
    { preHandler: requirePermission(PERMISSIONS.MENU_MANAGE) },
    async (request, reply) => {
      const parsed = createItemSchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });

      const item = await fastify.prisma.menuItem.create({ data: parsed.data });
      await recordAudit(fastify.prisma, {
        userId: request.user.id,
        action: "MENU_ITEM_CREATED",
        entityType: "MenuItem",
        entityId: item.id,
        metadata: { name: item.name },
      });
      return reply.code(201).send({ id: item.id });
    }
  );

  fastify.patch(
    "/api/menu/items/:id",
    { preHandler: requirePermission(PERMISSIONS.MENU_MANAGE) },
    async (request, reply) => {
      const parsed = updateItemSchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
      const { id } = request.params as { id: string };

      const item = await fastify.prisma.menuItem.update({ where: { id }, data: parsed.data });
      await recordAudit(fastify.prisma, {
        userId: request.user.id,
        action: "MENU_ITEM_UPDATED",
        entityType: "MenuItem",
        entityId: id,
        metadata: { changes: Object.keys(parsed.data) },
      });

      if (parsed.data.available !== undefined) {
        fastify.io.to(rooms.global()).emit("menu:item_availability_changed", {
          menuItemId: item.id,
          available: item.available,
        });
      }

      return { ok: true };
    }
  );

  fastify.delete(
    "/api/menu/items/:id",
    { preHandler: requirePermission(PERMISSIONS.MENU_MANAGE) },
    async (request) => {
      const { id } = request.params as { id: string };
      const result = await archiveMenuItem(fastify.prisma, id);

      await recordAudit(fastify.prisma, {
        userId: request.user.id,
        action: "MENU_ITEM_ARCHIVED",
        entityType: "MenuItem",
        entityId: id,
        metadata: result,
      });

      return { ok: true, ...result };
    }
  );

  fastify.patch(
    "/api/menu/items/:id/availability",
    { preHandler: requirePermission(PERMISSIONS.MENU_TOGGLE_AVAILABILITY) },
    async (request, reply) => {
      const parsed = availabilitySchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
      const { id } = request.params as { id: string };

      const item = await fastify.prisma.menuItem.update({
        where: { id },
        data: { available: parsed.data.available },
      });

      await recordAudit(fastify.prisma, {
        userId: request.user.id,
        action: "MENU_ITEM_AVAILABILITY_TOGGLED",
        entityType: "MenuItem",
        entityId: id,
        metadata: { available: item.available },
      });

      fastify.io.to(rooms.global()).emit("menu:item_availability_changed", {
        menuItemId: item.id,
        available: item.available,
      });

      return { ok: true };
    }
  );
}
