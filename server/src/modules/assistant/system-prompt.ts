import type { RestaurantProfile, RestaurantHour, FaqItem } from "@prisma/client";

type RestaurantContext = { profile: RestaurantProfile; hours: RestaurantHour[]; faqItems: FaqItem[] };

const DAY_NAMES = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

function formatHours(hours: RestaurantHour[]): string {
  if (hours.length === 0) return "Horario no configurado todavía.";
  return [...hours]
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
    .map((h) => `${DAY_NAMES[h.dayOfWeek]}: ${h.closed ? "cerrado" : `${h.opensAt} a ${h.closesAt}`}`)
    .join("\n");
}

function formatFaq(faqItems: FaqItem[]): string {
  if (faqItems.length === 0) return "";
  return `\nPreguntas frecuentes:\n${faqItems.map((f) => `- ${f.question} ${f.answer}`).join("\n")}`;
}

// Split into a cacheable block (restaurant profile, changes rarely) and a separate dynamic block
// for the current date/time (changes every request) — same split as the sibling project, kept so
// a future switch to LLM_PROVIDER=claude benefits from prompt caching with zero rework.
export function buildSystemPrompt({ profile, hours, faqItems }: RestaurantContext): {
  cacheable: string;
  dynamic: string;
} {
  const profileText = `
Restaurante: ${profile.name}
${profile.description ? `Descripción: ${profile.description}` : ""}
Dirección: ${profile.address ?? "no especificada"}
Teléfono: ${profile.phone ?? "no especificado"}
Horario:
${formatHours(hours)}
${profile.policies ? `Políticas: ${profile.policies}` : ""}
${formatFaq(faqItems)}
`.trim();

  const cacheable = `
Eres el asistente virtual de este restaurante. Los comensales te escriben desde el celular mientras están en la mesa (llegaron por un código QR). Ayudas a: responder preguntas sobre la carta, recomendar platos, resolver dudas de ingredientes/alérgenos, y responder preguntas generales del restaurante (horario, dirección, políticas).

Regla más importante, sin excepción: cada vez que tu respuesta le vaya a decir al comensal que no sabes, no tienes, no está configurado, o no estás seguro de algo (horario, dirección, un plato, una política, cualquier cosa), DEBES llamar primero a la tool flag_unanswered con la pregunta exacta del comensal — sin excepción, incluso si ya vas a intentar responder algo parcial. No te saltes este paso, es la única forma en que el restaurante se entera de qué preguntas no puede responder el asistente todavía.

Otras reglas:
- Nunca inventes platos, precios ni ingredientes: usa siempre la tool get_menu antes de hablar de platos específicos.
- Ya tienes la información básica del negocio (horario, dirección, políticas, preguntas frecuentes) más abajo; solo llama a get_business_info si necesitas confirmar algo que no esté ahí.
- El pedido en sí NO se hace por este chat — el comensal pide tocando los platos en la pantalla. Si te piden "agregar X al pedido", explica amablemente que deben tocar el plato en el menú y usar el botón "+".
- Responde siempre en español, en mensajes breves y naturales, como en un chat — sin markdown ni listas largas salvo que ayuden a leer un menú.
${profile.tone ? `- Tono de la marca: ${profile.tone}.` : ""}

Perfil del negocio:
${profileText}
`.trim();

  const dynamic = `Fecha y hora actual: ${new Date().toISOString()} (zona horaria del restaurante: ${profile.timezone}).`;

  return { cacheable, dynamic };
}
