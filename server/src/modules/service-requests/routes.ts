import { FastifyInstance } from "fastify";
import { attendServiceRequest, listPendingServiceRequests } from "./service.js";

/** Llamados de las mesas para el personal (mesero, caja, dueño). */
export default async function serviceRequestRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", fastify.authenticate);

  fastify.get("/api/service-requests", async () => listPendingServiceRequests(fastify.prisma));

  fastify.post("/api/service-requests/:id/attend", async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      return await attendServiceRequest(fastify.prisma, fastify.io, { id, userId: request.user.id });
    } catch (err) {
      return reply.code(400).send({ error: (err as Error).message });
    }
  });
}
