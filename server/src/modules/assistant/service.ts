import { PrismaClient } from "@prisma/client";
import { buildSystemPrompt } from "./system-prompt.js";
import { Server as SocketIOServer } from "socket.io";
import { ASSISTANT_TOOLS, executeTool, type CartAddition, type ToolContext } from "./tools.js";
import { createLlmProvider, type LlmProvider } from "./llm/index.js";
import { logUnansweredQuestion } from "./unanswered-questions.js";

const MAX_HISTORY_MESSAGES = 12;

// Red de seguridad ademas de la tool flag_unanswered: los modelos economicos (Gemini Flash
// Lite) no siempre llaman la tool aunque el prompt se lo pida explicitamente. Si la respuesta
// final "suena" a que el asistente no supo algo, se registra igual — mejor un duplicado
// ocasional (se deduplica por texto normalizado) que perder la pregunta por completo.
const UNCERTAINTY_PATTERNS = [
  /no ten(go|emos) (esa|esta) informaci[oó]n/i,
  /no (te )?sabr[ií]a decir/i,
  /no est[aá] configurad[oa]/i,
  /no (lo )?s[eé] con (seguridad|certeza)/i,
  /no cuento con (esa|esta) informaci[oó]n/i,
];

// El prompt pide "sin markdown", pero los modelos económicos lo ignoran seguido (negritas con
// **, viñetas con *) — en una burbuja de chat plano eso se ve como asteriscos literales. Se
// limpia acá en vez de confiar solo en el prompt, mismo criterio que UNCERTAINTY_PATTERNS.
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/^[ \t]*[*-][ \t]+/gm, "• ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Creado de forma perezosa (no al cargar el módulo): si falta la API key, esto debe fallar
// solo cuando alguien use el chat -- no debe tumbar el arranque de TODO el servidor (pedidos,
// cocina, caja), que no dependen del asistente para nada.
let llmProvider: LlmProvider | null = null;
function getLlmProvider(): LlmProvider {
  if (!llmProvider) llmProvider = createLlmProvider();
  return llmProvider;
}

async function getOrCreateProfile(prisma: PrismaClient) {
  const existing = await prisma.restaurantProfile.findFirst();
  if (existing) return existing;
  return prisma.restaurantProfile.create({ data: {} });
}

export async function handleChatMessage(
  prisma: PrismaClient,
  io: SocketIOServer,
  params: {
    visitorId: string;
    userMessage: string;
    tableToken?: string;
    dinerName?: string;
  }
): Promise<{ reply: string; cartAdditions: CartAddition[] }> {
  const { visitorId, userMessage } = params;
  const [profile, hours, faqItems] = await Promise.all([
    getOrCreateProfile(prisma),
    prisma.restaurantHour.findMany(),
    prisma.faqItem.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  const session = await prisma.conversationSession.upsert({
    where: { visitorId },
    update: { lastMessageAt: new Date() },
    create: { visitorId },
  });

  const historyRows = await prisma.conversationMessage.findMany({
    where: { sessionId: session.id },
    orderBy: { createdAt: "desc" },
    take: MAX_HISTORY_MESSAGES,
  });
  historyRows.reverse();

  const history = historyRows.map((m) => ({
    role: m.role === "user" ? ("user" as const) : ("assistant" as const),
    content: m.content,
  }));

  const { cacheable, dynamic } = buildSystemPrompt({ profile, hours, faqItems });

  // El visitorId del chat es el mismo id anonimo con que el comensal pide desde su celular,
  // asi "¿como va mi pedido?" sabe cuales platos son suyos.
  const toolContext: ToolContext = {
    prisma,
    io,
    tableToken: params.tableToken ?? null,
    dinerId: visitorId,
    dinerName: params.dinerName ?? null,
    cartAdditions: [],
  };

  const rawText = await getLlmProvider().generateReply({
    cacheableSystemPrompt: cacheable,
    dynamicSystemPrompt: dynamic,
    tools: ASSISTANT_TOOLS,
    history,
    userMessage,
    executeTool: (name, input) => executeTool(toolContext, name, input),
  });
  const finalText = stripMarkdown(rawText);

  await prisma.conversationMessage.createMany({
    data: [
      { sessionId: session.id, role: "user", content: userMessage },
      { sessionId: session.id, role: "assistant", content: finalText },
    ],
  });

  if (UNCERTAINTY_PATTERNS.some((p) => p.test(finalText))) {
    await logUnansweredQuestion(prisma, userMessage);
  }

  return { reply: finalText, cartAdditions: toolContext.cartAdditions };
}
