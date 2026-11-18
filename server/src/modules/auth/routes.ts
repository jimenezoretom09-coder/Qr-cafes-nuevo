import { FastifyInstance } from "fastify";
import { z } from "zod";
import { findUserByPin, toAuthUserDTO } from "./service.js";
import { recordAudit } from "../audit/service.js";

const loginSchema = z.object({ pin: z.string().min(4).max(6) });

export default async function authRoutes(fastify: FastifyInstance) {
  fastify.post("/api/auth/login-pin", async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "PIN inválido" });
    }

    const user = await findUserByPin(fastify.prisma, parsed.data.pin);
    if (!user) {
      return reply.code(401).send({ error: "PIN incorrecto" });
    }

    const authUser = toAuthUserDTO(user);
    const token = fastify.jwt.sign(authUser, { expiresIn: "12h" });
    await recordAudit(fastify.prisma, {
      userId: user.id,
      action: "LOGIN",
      entityType: "User",
      entityId: user.id,
    });

    return { token, user: authUser };
  });

  fastify.get("/api/auth/me", { preHandler: fastify.authenticate }, async (request) => {
    return request.user;
  });
}
