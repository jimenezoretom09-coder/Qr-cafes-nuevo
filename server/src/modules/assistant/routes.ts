import { FastifyInstance } from "fastify";
import { z } from "zod";
import { PERMISSIONS } from "@rms/shared";
import { requirePermission } from "../../middleware/rbac.js";
import { handleChatMessage } from "./service.js";

const chatSchema = z.object({
  visitorId: z.string().min(1),
  message: z.string().min(1).max(2000),
});

const profileSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  tone: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  policies: z.string().optional(),
});

const hourSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  opensAt: z.string(),
  closesAt: z.string(),
  closed: z.boolean().default(false),
});

const faqSchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
  sortOrder: z.number().default(0),
});

/** Chat público del comensal — sin PIN, protegido solo por rate-limit (config por-ruta; el
 * plugin @fastify/rate-limit se registra en index.ts con { global: false }). */
export default async function assistantPublicRoutes(fastify: FastifyInstance) {
  fastify.post(
    "/api/public/asistente/mensaje",
    { config: { rateLimit: { max: 20, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const parsed = chatSchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });

      try {
        const replyText = await handleChatMessage(fastify.prisma, parsed.data.visitorId, parsed.data.message);
        return { reply: replyText };
      } catch (err) {
        request.log.error(err);
        return reply.code(500).send({ error: "No se pudo procesar el mensaje en este momento." });
      }
    }
  );
}

/** Panel de administración: perfil del negocio, horario, FAQ, y la cola de preguntas sin
 * responder — esto último es el mecanismo de "aprender con el tiempo". */
export async function assistantAdminRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", fastify.authenticate);
  fastify.addHook("preHandler", requirePermission(PERMISSIONS.MENU_MANAGE));

  fastify.get("/api/assistant/profile", async () => {
    const profile = await fastify.prisma.restaurantProfile.findFirst();
    return profile ?? (await fastify.prisma.restaurantProfile.create({ data: {} }));
  });

  fastify.patch("/api/assistant/profile", async (request, reply) => {
    const parsed = profileSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });

    const existing = await fastify.prisma.restaurantProfile.findFirst();
    const profile = existing
      ? await fastify.prisma.restaurantProfile.update({ where: { id: existing.id }, data: parsed.data })
      : await fastify.prisma.restaurantProfile.create({ data: parsed.data });
    return profile;
  });

  fastify.get("/api/assistant/hours", async () => {
    const hours = await fastify.prisma.restaurantHour.findMany({ orderBy: { dayOfWeek: "asc" } });
    return hours;
  });

  fastify.put("/api/assistant/hours/:dayOfWeek", async (request, reply) => {
    const { dayOfWeek } = request.params as { dayOfWeek: string };
    const parsed = hourSchema.safeParse({ ...(request.body as object), dayOfWeek: Number(dayOfWeek) });
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });

    const hour = await fastify.prisma.restaurantHour.upsert({
      where: { dayOfWeek: parsed.data.dayOfWeek },
      update: parsed.data,
      create: parsed.data,
    });
    return hour;
  });

  fastify.get("/api/assistant/faq", async () => {
    return fastify.prisma.faqItem.findMany({ orderBy: { sortOrder: "asc" } });
  });

  fastify.post("/api/assistant/faq", async (request, reply) => {
    const parsed = faqSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
    const faq = await fastify.prisma.faqItem.create({ data: parsed.data });
    return reply.code(201).send(faq);
  });

  fastify.patch("/api/assistant/faq/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = faqSchema.partial().safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
    return fastify.prisma.faqItem.update({ where: { id }, data: parsed.data });
  });

  fastify.delete("/api/assistant/faq/:id", async (request) => {
    const { id } = request.params as { id: string };
    await fastify.prisma.faqItem.delete({ where: { id } });
    return { ok: true };
  });

  fastify.get("/api/assistant/preguntas-sin-responder", async () => {
    return fastify.prisma.unansweredQuestion.findMany({
      where: { resolved: false },
      orderBy: { timesAsked: "desc" },
    });
  });

  fastify.post("/api/assistant/preguntas-sin-responder/:id/convertir-en-faq", async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = z.object({ answer: z.string().min(1) }).safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });

    const question = await fastify.prisma.unansweredQuestion.findUniqueOrThrow({ where: { id } });
    const faq = await fastify.prisma.faqItem.create({
      data: { question: question.question, answer: parsed.data.answer },
    });
    await fastify.prisma.unansweredQuestion.update({
      where: { id },
      data: { resolved: true, resolvedAt: new Date(), promotedToFaqId: faq.id },
    });
    return reply.code(201).send(faq);
  });

  fastify.post("/api/assistant/preguntas-sin-responder/:id/descartar", async (request) => {
    const { id } = request.params as { id: string };
    await fastify.prisma.unansweredQuestion.update({
      where: { id },
      data: { resolved: true, resolvedAt: new Date() },
    });
    return { ok: true };
  });
}
