import fp from "fastify-plugin";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fastifyJwt from "@fastify/jwt";
import type { AuthUserDTO } from "@rms/shared";

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: AuthUserDTO;
    user: AuthUserDTO;
  }
}

export default fp(async (fastify: FastifyInstance) => {
  // En la nube (Render pone RENDER=true solo) no se acepta la clave por defecto: con ella
  // cualquiera podria firmar un token de administrador. Como cada restaurante es una
  // instalacion aparte, olvidar esta variable en un cliente nuevo es facil — mejor que el
  // despliegue falle con un mensaje claro que quede abierto sin que nadie se entere.
  if (process.env.RENDER && !process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET no está configurada en Render. Agrégala en Environment antes de desplegar.");
  }

  fastify.register(fastifyJwt, {
    secret: process.env.JWT_SECRET ?? "dev-only-change-me",
  });

  fastify.decorate("authenticate", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.code(401).send({ error: "No autorizado" });
    }
  });
});
