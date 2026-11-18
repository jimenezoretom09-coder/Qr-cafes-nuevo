import { Prisma, PrismaClient } from "@prisma/client";
import { Server as SocketIOServer } from "socket.io";
import {
  rooms,
  type Course,
  type OrderItemStatus,
  type TicketAction,
  type TicketDTO,
  type TicketStatus,
} from "@rms/shared";
import { recordAudit } from "../audit/service.js";
import { clearAlert } from "../orders/delay-tracker.js";
import { deriveOrderStatus } from "../orders/status.js";
import { sendPushToRoles } from "../push/service.js";

/** Comandas que siguen en manos de cocina (cuentan para la fila). */
export const KITCHEN_QUEUE_STATUSES: TicketStatus[] = ["SENT", "SEEN", "CONFIRMED", "PREPARING"];
/** Todo lo que todavia no se entrega en la mesa. */
export const OPEN_TICKET_STATUSES: TicketStatus[] = [...KITCHEN_QUEUE_STATUSES, "READY", "ON_THE_WAY"];

// Quien recibe cada aviso en el celular (aunque este bloqueado).
const PUSH_NEW_TICKET_ROLES = ["KITCHEN", "BAR", "ADMIN"];
const PUSH_READY_ROLES = ["WAITER"];

const ticketInclude = {
  items: {
    include: { modifiers: true, menuItem: { select: { preparationTimeEstimateMin: true } } },
    orderBy: { sentToKitchenAt: "asc" },
  },
  order: { include: { table: true, waiter: true } },
} satisfies Prisma.OrderTicketInclude;

type TicketRow = Prisma.OrderTicketGetPayload<{ include: typeof ticketInclude }>;

/** Medianoche de hoy en la zona horaria del negocio, para numerar las comandas del dia. */
function startOfToday(timeZone: string): Date {
  const now = new Date();
  const local = new Date(now.toLocaleString("en-US", { timeZone }));
  const offsetMs = now.getTime() - local.getTime();
  local.setHours(0, 0, 0, 0);
  return new Date(local.getTime() + offsetMs);
}

async function nextTicketNumber(prisma: PrismaClient): Promise<number> {
  const profile = await prisma.restaurantProfile.findFirst({ select: { timezone: true } });
  const since = startOfToday(profile?.timezone ?? "America/Bogota");
  const count = await prisma.orderTicket.count({ where: { sentAt: { gte: since } } });
  return count + 1;
}

/**
 * Mete platos recien pedidos en la comanda abierta de esa mesa, o abre una nueva.
 *
 * "Abierta" = cocina todavia no la confirma (SENT o SEEN). Si ya la habia visto, vuelve a
 * SENT para que se note en la pantalla que le llego algo mas.
 */
export async function attachItemsToTicket(
  prisma: PrismaClient,
  orderId: string,
  itemIds: string[]
): Promise<{ ticketId: string; isNew: boolean }> {
  const open = await prisma.orderTicket.findFirst({
    where: { orderId, status: { in: ["SENT", "SEEN"] } },
    orderBy: { sentAt: "desc" },
  });

  let ticketId: string;
  let isNew = false;
  if (open) {
    ticketId = open.id;
    if (open.status === "SEEN") {
      await prisma.orderTicket.update({ where: { id: open.id }, data: { status: "SENT", seenAt: null } });
    }
  } else {
    const ticket = await prisma.orderTicket.create({
      data: { orderId, number: await nextTicketNumber(prisma), status: "SENT" },
    });
    ticketId = ticket.id;
    isNew = true;
  }

  await prisma.orderItem.updateMany({ where: { id: { in: itemIds } }, data: { ticketId } });
  return { ticketId, isNew };
}

async function queuePositions(prisma: PrismaClient): Promise<Map<string, number>> {
  const queue = await prisma.orderTicket.findMany({
    where: { status: { in: KITCHEN_QUEUE_STATUSES } },
    orderBy: { sentAt: "asc" },
    select: { id: true },
  });
  return new Map(queue.map((t, idx) => [t.id, idx + 1]));
}

function toTicketDTO(t: TicketRow, positions: Map<string, number>): TicketDTO {
  const activeItems = t.items.filter((i) => i.status !== "CANCELLED");
  return {
    id: t.id,
    number: t.number,
    orderId: t.orderId,
    tableId: t.order.tableId,
    tableLabel: t.order.table.label,
    waiterName: t.order.waiter.name,
    status: t.status as TicketStatus,
    rejectReason: t.rejectReason,
    queuePosition: positions.get(t.id) ?? null,
    estimateMin: Math.max(0, ...activeItems.map((i) => i.menuItem.preparationTimeEstimateMin)),
    items: t.items.map((i) => ({
      id: i.id,
      name: i.nameSnapshot,
      quantity: i.quantity,
      stationId: i.stationId,
      course: i.course as Course,
      status: i.status as OrderItemStatus,
      notes: i.notes,
      modifiers: i.modifiers.map((m) => m.nameSnapshot),
      dinerName: i.dinerName,
      cancelReason: i.cancelReason,
    })),
    sentAt: t.sentAt.toISOString(),
    seenAt: t.seenAt?.toISOString() ?? null,
    confirmedAt: t.confirmedAt?.toISOString() ?? null,
    startedAt: t.startedAt?.toISOString() ?? null,
    readyAt: t.readyAt?.toISOString() ?? null,
    pickedUpAt: t.pickedUpAt?.toISOString() ?? null,
    deliveredAt: t.deliveredAt?.toISOString() ?? null,
    rejectedAt: t.rejectedAt?.toISOString() ?? null,
  };
}

export async function getTicketDTOs(prisma: PrismaClient, where: Prisma.OrderTicketWhereInput): Promise<TicketDTO[]> {
  const [rows, positions] = await Promise.all([
    prisma.orderTicket.findMany({ where, include: ticketInclude, orderBy: { sentAt: "asc" } }),
    queuePositions(prisma),
  ]);
  return rows.map((r) => toTicketDTO(r, positions));
}

function itemSummary(dto: TicketDTO): string {
  return dto.items
    .filter((i) => i.status !== "CANCELLED")
    .map((i) => `${i.quantity}× ${i.name}`)
    .join(", ");
}

/**
 * Avisa a todo el personal que la comanda cambio. Si cambia el orden de la fila (entro una
 * nueva o una salio de cocina), las demas tambien se mueven de puesto, asi que el tablero se
 * refresca completo con este mismo evento.
 */
export async function publishTicket(
  prisma: PrismaClient,
  io: SocketIOServer,
  ticketId: string,
  reason: "new" | "grown" | "status" = "status"
): Promise<TicketDTO | null> {
  const [dto] = await getTicketDTOs(prisma, { id: ticketId });
  if (!dto) return null;
  io.to(rooms.global()).emit("ticket:updated", dto);

  if (reason === "new" || reason === "grown") {
    await sendPushToRoles(prisma, PUSH_NEW_TICKET_ROLES, {
      title: reason === "new" ? `Nuevo pedido #${dto.number} · Mesa ${dto.tableLabel}` : `Mesa ${dto.tableLabel} agregó más`,
      body: itemSummary(dto),
      url: "/kds",
      tag: `ticket-${dto.id}`,
    });
  } else if (dto.status === "READY") {
    await sendPushToRoles(prisma, PUSH_READY_ROLES, {
      title: `Listo para llevar · Mesa ${dto.tableLabel}`,
      body: `Pedido #${dto.number}: ${itemSummary(dto)}`,
      url: "/waiter",
      tag: `ticket-${dto.id}`,
    });
  }
  return dto;
}

/** Cocina abrio la pantalla: todo lo que estaba "Enviado" pasa a "Recibido por cocina". */
export async function markTicketsSeen(prisma: PrismaClient, io: SocketIOServer) {
  const unseen = await prisma.orderTicket.findMany({ where: { status: "SENT" }, select: { id: true } });
  if (unseen.length === 0) return;
  await prisma.orderTicket.updateMany({
    where: { id: { in: unseen.map((t) => t.id) }, status: "SENT" },
    data: { status: "SEEN", seenAt: new Date() },
  });
  for (const t of unseen) await publishTicket(prisma, io, t.id);
}

/**
 * Despues de mover platos: recalcula el estado de la cuenta, libera la mesa si todo quedo
 * cancelado y le avisa a la pantalla del mesero.
 */
async function syncOrderAfterItemChanges(prisma: PrismaClient, io: SocketIOServer, orderId: string, changedItemIds: string[]) {
  const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true, table: true } });
  const derived = deriveOrderStatus(order.items);
  if (order.status !== "CLOSED") {
    await prisma.order.update({ where: { id: orderId }, data: { status: derived } });
  }
  if (derived === "CANCELLED" && order.status !== "CLOSED") {
    await prisma.restaurantTable.update({ where: { id: order.tableId }, data: { status: "FREE" } });
    io.to(rooms.global()).emit("table:status_changed", { tableId: order.tableId, status: "FREE" });
  }

  for (const item of order.items.filter((i) => changedItemIds.includes(i.id))) {
    clearAlert(item.id);
    const payload = {
      orderId,
      itemId: item.id,
      status: item.status as OrderItemStatus,
      tableLabel: order.table.label,
      itemName: item.nameSnapshot,
    };
    io.to(rooms.waiter(order.waiterId)).emit("order:item_status_changed", payload);
    io.to(rooms.station(item.stationId)).emit("order:item_status_changed", payload);
  }
}

// De que estados se puede tomar cada accion, y a cual lleva.
const TRANSITIONS: Record<TicketAction, { from: TicketStatus[]; to: TicketStatus }> = {
  confirm: { from: ["SENT", "SEEN"], to: "CONFIRMED" },
  // Se puede empezar sin haber tocado "Confirmar": cuenta como confirmada en el mismo momento.
  start: { from: ["SENT", "SEEN", "CONFIRMED"], to: "PREPARING" },
  ready: { from: ["CONFIRMED", "PREPARING"], to: "READY" },
  pickup: { from: ["READY"], to: "ON_THE_WAY" },
  deliver: { from: ["READY", "ON_THE_WAY"], to: "DELIVERED" },
  reject: { from: ["SENT", "SEEN", "CONFIRMED", "PREPARING"], to: "REJECTED" },
};

export const KITCHEN_ACTIONS: TicketAction[] = ["confirm", "start", "ready", "reject"];
export const FLOOR_ACTIONS: TicketAction[] = ["pickup", "deliver"];

export async function advanceTicket(
  prisma: PrismaClient,
  io: SocketIOServer,
  params: { ticketId: string; action: TicketAction; actingUserId: string; reason?: string }
): Promise<TicketDTO | null> {
  const ticket = await prisma.orderTicket.findUniqueOrThrow({ where: { id: params.ticketId }, include: { items: true } });
  const rule = TRANSITIONS[params.action];
  if (!rule.from.includes(ticket.status as TicketStatus)) {
    throw new Error(`Este pedido ya está en otro estado (${ticket.status}). Actualiza la pantalla.`);
  }

  const now = new Date();
  const data: Prisma.OrderTicketUpdateInput = { status: rule.to };
  const live = ticket.items.filter((i) => i.status !== "CANCELLED");
  const changed: string[] = [];

  async function moveItems(fromStatuses: string[], to: OrderItemStatus, extra: Prisma.OrderItemUpdateManyMutationInput) {
    const ids = live.filter((i) => fromStatuses.includes(i.status)).map((i) => i.id);
    if (ids.length === 0) return;
    await prisma.orderItem.updateMany({ where: { id: { in: ids } }, data: { status: to, ...extra } });
    changed.push(...ids);
  }

  switch (params.action) {
    case "confirm":
      data.confirmedAt = now;
      if (!ticket.seenAt) data.seenAt = now;
      break;
    case "start":
      data.startedAt = now;
      if (!ticket.confirmedAt) data.confirmedAt = now;
      if (!ticket.seenAt) data.seenAt = now;
      await moveItems(["QUEUED"], "IN_PREPARATION", { startedAt: now });
      break;
    case "ready":
      data.readyAt = now;
      if (!ticket.startedAt) data.startedAt = now;
      // Los que nunca pasaron por "Empezar" quedan con la misma hora de inicio y fin.
      await moveItems(["QUEUED"], "READY", { startedAt: now, readyAt: now });
      await moveItems(["IN_PREPARATION"], "READY", { readyAt: now });
      break;
    case "pickup":
      data.pickedUpAt = now;
      break;
    case "deliver":
      data.deliveredAt = now;
      if (!ticket.pickedUpAt) data.pickedUpAt = now;
      await moveItems(["READY", "QUEUED", "IN_PREPARATION"], "SERVED", { servedAt: now });
      break;
    case "reject": {
      const reason = params.reason?.trim() || "Cocina no lo puede preparar";
      data.rejectedAt = now;
      data.rejectReason = reason;
      await moveItems(["QUEUED", "IN_PREPARATION", "READY"], "CANCELLED", { cancelReason: reason });
      break;
    }
  }

  await prisma.orderTicket.update({ where: { id: ticket.id }, data });
  await recordAudit(prisma, {
    userId: params.actingUserId,
    action: "TICKET_STATUS_CHANGED",
    entityType: "OrderTicket",
    entityId: ticket.id,
    metadata: { from: ticket.status, to: rule.to, reason: params.reason },
  });

  if (changed.length > 0) {
    if (params.action === "reject") {
      const { recalcIncludedDrinks } = await import("../orders/service.js");
      await recalcIncludedDrinks(prisma, ticket.orderId);
    }
    await syncOrderAfterItemChanges(prisma, io, ticket.orderId, changed);
  }

  return publishTicket(prisma, io, ticket.id);
}

/**
 * Boton "Agotado" sobre un plato de la comanda: se cancela ese plato (el comensal lo ve como
 * "Agotado") y el plato se apaga en la carta para que nadie mas lo pueda pedir.
 */
export async function markItemSoldOut(
  prisma: PrismaClient,
  io: SocketIOServer,
  params: { orderItemId: string; actingUserId: string; reason?: string }
): Promise<TicketDTO | null> {
  const item = await prisma.orderItem.findUniqueOrThrow({ where: { id: params.orderItemId } });
  if (item.status === "SERVED" || item.status === "CANCELLED") {
    throw new Error("Ese plato ya fue entregado o cancelado");
  }
  const reason = params.reason?.trim() || "Agotado";

  await prisma.orderItem.update({ where: { id: item.id }, data: { status: "CANCELLED", cancelReason: reason } });
  const menuItem = await prisma.menuItem.update({ where: { id: item.menuItemId }, data: { available: false } });
  io.to(rooms.global()).emit("menu:item_availability_changed", { menuItemId: menuItem.id, available: false });

  await recordAudit(prisma, {
    userId: params.actingUserId,
    action: "ORDER_ITEM_SOLD_OUT",
    entityType: "OrderItem",
    entityId: item.id,
    metadata: { menuItemId: item.menuItemId, reason },
  });

  const { recalcIncludedDrinks } = await import("../orders/service.js");
  await recalcIncludedDrinks(prisma, item.orderId);
  await syncOrderAfterItemChanges(prisma, io, item.orderId, [item.id]);

  if (!item.ticketId) return null;
  return syncTicketFromItems(prisma, io, item.ticketId);
}

/**
 * Cuando un plato cambia por fuera de la comanda (el mesero lo anula, lo marca servido desde
 * su panel, se agota uno), la comanda se ajusta a lo que queda: si ya no queda nada vivo se
 * rechaza; si todo lo vivo esta listo o entregado, avanza.
 */
export async function syncTicketFromItems(
  prisma: PrismaClient,
  io: SocketIOServer,
  ticketId: string
): Promise<TicketDTO | null> {
  const ticket = await prisma.orderTicket.findUnique({ where: { id: ticketId }, include: { items: true } });
  if (!ticket) return null;

  const status = ticket.status as TicketStatus;
  const live = ticket.items.filter((i) => i.status !== "CANCELLED");
  const now = new Date();
  let data: Prisma.OrderTicketUpdateInput | null = null;

  if (live.length === 0) {
    if (status !== "REJECTED") {
      const reasons = [...new Set(ticket.items.map((i) => i.cancelReason).filter(Boolean))];
      data = { status: "REJECTED", rejectedAt: now, rejectReason: reasons.join(", ") || "Cancelado" };
    }
  } else if (live.every((i) => i.status === "SERVED")) {
    if (status !== "DELIVERED") data = { status: "DELIVERED", deliveredAt: now };
  } else if (live.every((i) => i.status === "READY" || i.status === "SERVED")) {
    if (KITCHEN_QUEUE_STATUSES.includes(status)) data = { status: "READY", readyAt: now };
  } else if (live.some((i) => i.status === "IN_PREPARATION")) {
    if (status === "SENT" || status === "SEEN" || status === "CONFIRMED") {
      data = { status: "PREPARING", startedAt: now, confirmedAt: ticket.confirmedAt ?? now };
    }
  }

  if (data) await prisma.orderTicket.update({ where: { id: ticket.id }, data });
  return publishTicket(prisma, io, ticket.id);
}
