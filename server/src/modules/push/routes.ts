import { FastifyInstance } from "fastify";
import { z } from "zod";
import { ensurePushConfigured, removeSubscription, saveSubscription } from "./service.js";

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
});

export default async function pushRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", fastify.authenticate);

  fastify.get("/api/push/public-key", async () => ({ publicKey: await ensurePushConfigured(fastify.prisma) }));

  fastify.post("/api/push/subscribe", async (request, reply) => {
    const parsed = subscriptionSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
    await saveSubscription(fastify.prisma, request.user.id, parsed.data);
    return { ok: true };
  });

  fastify.post("/api/push/unsubscribe", async (request, reply) => {
    const parsed = z.object({ endpoint: z.string() }).safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
    await removeSubscription(fastify.prisma, parsed.data.endpoint);
    return { ok: true };
  });
}
