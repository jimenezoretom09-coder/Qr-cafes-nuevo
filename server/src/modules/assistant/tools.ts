import { PrismaClient, Prisma } from "@prisma/client";
import { Server as SocketIOServer } from "socket.io";
import { TICKET_STATUS_LABELS, type TicketStatus } from "@rms/shared";
import type { LlmTool } from "./llm/types.js";
import { logUnansweredQuestion } from "./unanswered-questions.js";
import { findTableByToken, getPublicTableStatus } from "../self-order/service.js";
import { createServiceRequest } from "../service-requests/service.js";

/** Lo que el chat del comensal le deja listo a la pantalla para agregar a "Mi pedido". */
export interface CartAddition {
  menuItemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  modifierIds: string[];
  modifierNames: string[];
  modifiersPriceDelta: number;
  notes?: string;
}

/** Mesa y comensal que estan chateando (llegan del QR). Sin mesa, el chat solo informa. */
export interface ToolContext {
  prisma: PrismaClient;
  io: SocketIOServer;
  tableToken: string | null;
  dinerId: string | null;
  dinerName: string | null;
  cartAdditions: CartAddition[];
}

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
    name: "add_to_cart",
    description:
      "Agrega platos al pedido del comensal cuando te pide algo para comer o tomar (\"quiero dos capuchinos\", \"tráeme un croissant\"). Usa los id que devuelve get_menu (llámala antes si no los tienes). Los platos quedan en 'Mi pedido' en su pantalla; el comensal los revisa y toca 'Confirmar pedido' para que lleguen a cocina — tú no los envías a cocina. Si un plato tiene extras obligatorios (minSelect > 0) y el comensal no dijo cuál quiere, pregúntale antes de llamar esta tool.",
    parameters: {
      type: "object",
      properties: {
        items: {
          type: "array",
          description: "Platos a agregar.",
          items: {
            type: "object",
            properties: {
              menuItemId: { type: "string", description: "id del plato (de get_menu)." },
              quantity: { type: "integer", description: "Cantidad, 1 si no la dijo." },
              modifierIds: {
                type: "array",
                description: "ids de los extras elegidos (de get_menu), si aplica.",
                items: { type: "string" },
              },
              notes: { type: "string", description: "Indicaciones para cocina, ej: 'sin azúcar'." },
            },
            required: ["menuItemId", "quantity"],
          },
        },
      },
      required: ["items"],
    },
  },
  {
    name: "get_order_status",
    description:
      "Devuelve en qué va el pedido de la mesa (enviado, recibido por cocina, confirmado, preparando, listo, en camino, entregado), cuántos pedidos hay antes en la fila, y cuánto va la cuenta. Úsala cuando pregunten '¿cómo va mi pedido?', '¿cuánto falta?' o '¿cuánto llevo?'.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "call_staff",
    description:
      "Llama al mesero a la mesa, o pide la cuenta. Úsala solo cuando el comensal lo pida explícitamente (\"llama al mesero\", \"tráeme la cuenta\").",
    parameters: {
      type: "object",
      properties: {
        type: { type: "string", description: "WAITER para llamar al mesero, BILL para pedir la cuenta." },
        billScope: { type: "string", description: "Solo para BILL: ALL (toda la mesa) o MINE (solo lo suyo). ALL si no lo dijo." },
      },
      required: ["type"],
    },
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

async function addToCart(ctx: ToolContext, input: Record<string, unknown>) {
  const requested = Array.isArray(input.items) ? (input.items as Record<string, unknown>[]) : [];
  if (requested.length === 0) return { ok: false, error: "No indicaste platos." };

  const ids = requested.map((r) => String(r.menuItemId ?? ""));
  const menuItems = await ctx.prisma.menuItem.findMany({
    where: { id: { in: ids } },
    include: { modifierGroups: { include: { group: { include: { modifiers: true } } } } },
  });
  const byId = new Map(menuItems.map((m) => [m.id, m]));

  const added: string[] = [];
  const problems: string[] = [];

  for (const r of requested) {
    const item = byId.get(String(r.menuItemId ?? ""));
    if (!item || item.archived) {
      problems.push(`No encontré el plato con id ${String(r.menuItemId)} — vuelve a consultar get_menu.`);
      continue;
    }
    if (!item.available) {
      problems.push(`${item.name} está agotado en este momento.`);
      continue;
    }

    const quantity = Math.min(20, Math.max(1, Math.round(Number(r.quantity ?? 1)) || 1));
    const wanted = Array.isArray(r.modifierIds) ? (r.modifierIds as unknown[]).map(String) : [];
    const groups = item.modifierGroups.map((l) => l.group);
    const allMods = groups.flatMap((g) => g.modifiers);
    const chosen = allMods.filter((m) => wanted.includes(m.id));

    const groupProblems = groups.flatMap((g) => {
      const count = chosen.filter((m) => m.groupId === g.id).length;
      const options = g.modifiers.map((m) => m.name).join(", ");
      if (count < g.minSelect) return [`${item.name}: falta elegir ${g.name} (opciones: ${options}).`];
      if (count > g.maxSelect) return [`${item.name}: en ${g.name} se pueden elegir máximo ${g.maxSelect}.`];
      return [];
    });
    if (groupProblems.length > 0) {
      problems.push(...groupProblems);
      continue;
    }

    const notes = typeof r.notes === "string" && r.notes.trim() ? r.notes.trim().slice(0, 200) : undefined;
    ctx.cartAdditions.push({
      menuItemId: item.id,
      name: item.name,
      unitPrice: item.price.toNumber(),
      quantity,
      modifierIds: chosen.map((m) => m.id),
      modifierNames: chosen.map((m) => m.name),
      modifiersPriceDelta: chosen.reduce((sum, m) => sum + m.priceDelta.toNumber(), 0),
      notes,
    });
    added.push(`${quantity}× ${item.name}${chosen.length ? ` (${chosen.map((m) => m.name).join(", ")})` : ""}`);
  }

  return {
    ok: added.length > 0,
    agregados: added,
    problemas: problems,
    recordatorio:
      added.length > 0
        ? "Dile al comensal que quedó en 'Mi pedido' y que toque 'Confirmar pedido' para enviarlo a cocina."
        : undefined,
  };
}

export async function executeTool(
  ctx: ToolContext,
  name: string,
  input: Record<string, unknown>
): Promise<unknown> {
  const { prisma } = ctx;
  switch (name) {
    case "add_to_cart":
      if (!ctx.tableToken) return { ok: false, error: "Este chat no está abierto desde una mesa: no se puede pedir." };
      return addToCart(ctx, input);

    case "get_order_status": {
      if (!ctx.tableToken) return { ok: false, error: "Este chat no está abierto desde una mesa." };
      const status = await getPublicTableStatus(prisma, ctx.tableToken, ctx.dinerId);
      if (!status || status.tickets.length === 0) return { pedidos: [], nota: "La mesa todavía no ha enviado pedidos." };
      return {
        mesa: status.tableLabel,
        pedidos: status.tickets.map((t) => ({
          numero: t.number,
          estado: TICKET_STATUS_LABELS[t.status as TicketStatus],
          pedidosAntesEnLaFila: t.queuePosition ? t.queuePosition - 1 : null,
          minutosEstimados: t.estimateMin,
          platos: t.items.map((i) => `${i.quantity}× ${i.name}${i.dinerName ? ` (${i.dinerName})` : ""}${i.cancelled ? ` — ${i.cancelReason ?? "cancelado"}` : ""}`),
        })),
        cuenta: status.bill ? { lo_suyo: status.bill.mine, toda_la_mesa: status.bill.table } : null,
        nota: "Los precios están en miles de pesos (25 = $25.000).",
      };
    }

    case "call_staff": {
      if (!ctx.tableToken) return { ok: false, error: "Este chat no está abierto desde una mesa." };
      const table = await findTableByToken(prisma, ctx.tableToken);
      if (!table) return { ok: false, error: "Mesa no encontrada." };
      const type = String(input.type).toUpperCase() === "BILL" ? "BILL" : "WAITER";
      const billScope = String(input.billScope ?? "ALL").toUpperCase() === "MINE" ? "MINE" : "ALL";
      await createServiceRequest(prisma, ctx.io, {
        tableId: table.id,
        type,
        billScope: type === "BILL" ? billScope : undefined,
        dinerId: ctx.dinerId ?? undefined,
        dinerName: ctx.dinerName ?? undefined,
      });
      return { ok: true, aviso: type === "BILL" ? "La caja ya sabe que piden la cuenta." : "El mesero ya fue avisado." };
    }

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
            id: i.id,
            name: i.name,
            description: i.description,
            price: i.price.toString(),
            allergens: i.allergens,
            tienePreview: Boolean(i.imageUrl || i.videoUrl),
            extras: i.modifierGroups.map((link) => ({
              grupo: link.group.name,
              minSelect: link.group.minSelect,
              maxSelect: link.group.maxSelect,
              opciones: link.group.modifiers.map((m) => ({ id: m.id, nombre: m.name, precioExtra: m.priceDelta.toString() })),
            })),
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
