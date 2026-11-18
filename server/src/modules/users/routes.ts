import { FastifyInstance } from "fastify";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { PERMISSIONS } from "@rms/shared";
import { requirePermission } from "../../middleware/rbac.js";
import { recordAudit } from "../audit/service.js";

const createUserSchema = z.object({
  name: z.string().min(2),
  roleId: z.string(),
  pin: z.string().min(4).max(6),
});

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  roleId: z.string().optional(),
  pin: z.string().min(4).max(6).optional(),
  active: z.boolean().optional(),
});

export default async function userRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", fastify.authenticate);

  fastify.get(
    "/api/users",
    { preHandler: requirePermission(PERMISSIONS.USERS_MANAGE) },
    async () => {
      const users = await fastify.prisma.user.findMany({
        include: { role: true },
        orderBy: { createdAt: "asc" },
      });
      return users.map((u) => ({
        id: u.id,
        name: u.name,
        active: u.active,
        roleId: u.roleId,
        roleName: u.role.name,
      }));
    }
  );

  fastify.get(
    "/api/roles",
    { preHandler: requirePermission(PERMISSIONS.USERS_MANAGE) },
    async () => {
      return fastify.prisma.role.findMany({ orderBy: { name: "asc" } });
    }
  );

  fastify.post(
    "/api/users",
    { preHandler: requirePermission(PERMISSIONS.USERS_MANAGE) },
    async (request, reply) => {
      const parsed = createUserSchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });

      const pinHash = await bcrypt.hash(parsed.data.pin, 10);
      const user = await fastify.prisma.user.create({
        data: { name: parsed.data.name, roleId: parsed.data.roleId, pinHash },
      });

      await recordAudit(fastify.prisma, {
        userId: request.user.id,
        action: "USER_CREATED",
        entityType: "User",
        entityId: user.id,
        metadata: { name: user.name, roleId: user.roleId },
      });

      return reply.code(201).send({ id: user.id });
    }
  );

  fastify.patch(
    "/api/users/:id",
    { preHandler: requirePermission(PERMISSIONS.USERS_MANAGE) },
    async (request, reply) => {
      const parsed = updateUserSchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
      const { id } = request.params as { id: string };

      const data: Record<string, unknown> = { ...parsed.data };
      delete data.pin;
      if (parsed.data.pin) {
        data.pinHash = await bcrypt.hash(parsed.data.pin, 10);
      }

      await fastify.prisma.user.update({ where: { id }, data });
      await recordAudit(fastify.prisma, {
        userId: request.user.id,
        action: "USER_UPDATED",
        entityType: "User",
        entityId: id,
        metadata: { changes: Object.keys(parsed.data) },
      });

      return { ok: true };
    }
  );
}
