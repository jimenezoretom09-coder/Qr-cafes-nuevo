import { PrismaClient, Prisma } from "@prisma/client";
import type { LlmTool } from "./llm/types.js";
import { logUnansweredQuestion } from "./unanswered-questions.js";

const DAY_NAMES = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

export const ASSISTANT_TOOLS: LlmTool[] = [
  {
    name: "get_menu",
    description:
      "Devuelve las categorías y platos disponibles del restaurante, con precio, descripción, alérgenos, y los extras que se le pueden agregar a cada plato. Úsala siempre que el cliente pregunte por la carta, un plato específico, o pida una recomendación — nunca inventes platos ni precios que no vengan de aquí.",
    parameters: {
      type: "object",
      properties: {
        category: { type: "string", description: "Filtrar por nombre de categoría (opcional)." },
      },
    },
  },
  {
    name: "get_business_info",
    description:
      "Devuelve el horario, dirección, teléfono, políticas y preguntas frecuentes del restaurante. La mayoría de esta info ya está en tus instrucciones; usa esta tool solo si necesitas confirmar algo que no tengas.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "flag_unanswered",
    description:
      "Registra una pregunta que no pudiste responder con seguridad porque no está en el menú, la info del negocio, ni las preguntas frecuentes. Llama a esta tool ANTES de decirle al cliente que no sabes — así el restaurante puede revisar la pregunta después y enseñarle al asistente la respuesta correcta.",
    parameters: {
      type: "object",
      properties: {
        question: { type: "string", description: "La pregunta del cliente, en sus propias palabras." },
      },
      required: ["question"],
    },
  },
];

export async function executeTool(
  prisma: PrismaClient,
  name: string,
  input: Record<string, unknown>
): Promise<unknown> {
  switch (name) {
    case "get_menu": {
      const category = typeof input.category === "string" ? input.category : undefined;

      const categories = await prisma.menuCategory.findMany({
        where: {
          archived: false,
          ...(category ? { name: { contains: category, mode: Prisma.QueryMode.insensitive } } : {}),
        },
        orderBy: { sortOrder: "asc" },
        include: {
          items: {
            where: { archived: false, available: true },
            include: { modifierGroups: { include: { group: { include: { modifiers: true } } } } },
          },
        },
      });

      return categories
        .filter((c) => c.items.length > 0)
        .map((c) => ({
          category: c.name,
          items: c.items.map((i) => ({
            name: i.name,
            description: i.description,
            price: i.price.toString(),
            allergens: i.allergens,
            tienePreview: Boolean(i.imageUrl || i.videoUrl),
            extrasDisponibles: i.modifierGroups.flatMap((link) =>
              link.group.modifiers.map((m) => `${m.name} (+${m.priceDelta.toString()})`)
            ),
          })),
        }));
    }

    case "get_business_info": {
      const [profile, hours, faqItems] = await Promise.all([
        prisma.restaurantProfile.findFirst(),
        prisma.restaurantHour.findMany(),
        prisma.faqItem.findMany({ orderBy: { sortOrder: "asc" } }),
      ]);
      return {
        name: profile?.name ?? null,
        description: profile?.description ?? null,
        address: profile?.address ?? null,
        phone: profile?.phone ?? null,
        policies: profile?.policies ?? null,
        hours: [...hours]
          .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
          .map((h) => ({ day: DAY_NAMES[h.dayOfWeek], closed: h.closed, opensAt: h.opensAt, closesAt: h.closesAt })),
        faq: faqItems.map((f) => ({ question: f.question, answer: f.answer })),
      };
    }

    case "flag_unanswered": {
      const question = String(input.question ?? "").trim();
      if (!question) return { ok: false };
      await logUnansweredQuestion(prisma, question);
      return { ok: true };
    }

    default:
      throw new Error(`Tool desconocida: ${name}`);
  }
}
