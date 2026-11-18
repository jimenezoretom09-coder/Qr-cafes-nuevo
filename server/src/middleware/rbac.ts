import { FastifyReply, FastifyRequest } from "fastify";
import type { PermissionKey } from "@rms/shared";

export function requirePermission(permission: PermissionKey) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;
    if (!user || !user.permissions.includes(permission)) {
      reply.code(403).send({ error: "No tienes permiso para esta acción" });
    }
  };
}
