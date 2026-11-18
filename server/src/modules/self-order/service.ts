import { PrismaClient } from "@prisma/client";
import { Server as SocketIOServer } from "socket.io";
import { computeBillTotals, round2, type TicketStatus } from "@rms/shared";
import { createOrGrowOrder } from "../orders/service.js";
import { getTicketDTOs } from "../tickets/service.js";
import { getSelfServiceUserId } from "./self-service-user.js";

const OPEN_ORDER_STATUSES = ["OPEN", "IN_PROGRESS", "READY", "SERVED"];

/** La mesa a la que pertenece un QR. null si el codigo no existe o la mesa se borro. */
export async function findTableByToken(prisma: PrismaClient, token: string) {
  const table = await prisma.restaurantTable.findUnique({ where: { publicToken: token } });
  if (!table || table.archived) return null;
  return table;
}

export async function getPublicMenuForTable(prisma: PrismaClient, token: string) {
  const table = await findTableByToken(prisma, token);
  if (!table) return null;

  const profile = await prisma.restaurantProfile.findFirst();

  const categories = await prisma.menuCategory.findMany({
    where: { archived: false },
    orderBy: { sortOrder: "asc" },
    include: {
      items: {
        where: { archived: false, available: true },
        orderBy: { name: "asc" },
        include: { modifierGroups: { include: { group: { include: { modifiers: true } } } } },
      },
    },
  });

  return {
    table: { id: table.id, label: table.label, capacity: table.capacity },
    business: {
      name: profile?.name ?? "Mi café",
      logoUrl: profile?.logoUrl ?? null,
      primaryColor: profile?.primaryColor ?? "#1b1c1c",
      accentColor: profile?.accentColor ?? "#775a19",
    },
    categories: categories
      .filter((c) => c.items.length > 0)
      .map((c) => ({
        id: c.id,
        name: c.name,
        mealPeriod: c.mealPeriod,
        items: c.items.map((i) => ({
          id: i.id,
          name: i.name,
          description: i.description,
          imageUrl: i.imageUrl,
          videoUrl: i.videoUrl,
          allergens: i.allergens,
          price: i.price.toNumber(),
          course: i.course,
          preparationTimeEstimateMin: i.preparationTimeEstimateMin,
          modifierGroups: i.modifierGroups.map((link) => ({
            id: link.group.id,
            name: link.group.name,
            minSelect: link.group.minSelect,
            maxSelect: link.group.maxSelect,
            modifiers: link.group.modifiers.map((m) => ({
              id: m.id,
              name: m.name,
              priceDelta: m.priceDelta.toNumber(),
            })),
          })),
        })),
      })),
  };
}

export interface SelfOrderItemInput {
  menuItemId: string;
  quantity: number;
  notes?: string;
  modifierIds?: string[];
}

export async function placeSelfServiceOrder(
  prisma: PrismaClient,
  io: SocketIOServer,
  params: { token: string; dinerId: string; dinerName: string; items: SelfOrderItemInput[] }
) {
  const table = await findTableByToken(prisma, params.token);
  if (!table) throw new Error("Mesa no encontrada");

  const selfServiceUserId = await getSelfServiceUserId(prisma);
  return createOrGrowOrder(prisma, io, {
    tableId: table.id,
    waiterId: selfServiceUserId,
    diner: { dinerId: params.dinerId, dinerName: params.dinerName },
    items: params.items.map((i) => ({
      menuItemId: i.menuItemId,
      quantity: i.quantity,
      notes: i.notes,
      modifierIds: i.modifierIds ?? [],
    })),
  });
}

/**
 * Lo que ve el comensal en "Seguimiento": cada comanda de la mesa con su estado, quien pidio
 * cada cosa, y la cuenta (la suya y la de toda la mesa).
 *
 * Solo la cuenta abierta de la mesa: cuando la caja la cierra, los siguientes que se sienten
 * empiezan en blanco.
 */
export async function getPublicTableStatus(prisma: PrismaClient, token: string, dinerId: string | null) {
  const table = await findTableByToken(prisma, token);
  if (!table) return null;

  const order = await prisma.order.findFirst({
    where: { tableId: table.id, status: { in: OPEN_ORDER_STATUSES } },
    include: { items: { include: { modifiers: true } } },
    orderBy: { createdAt: "desc" },
  });

  const pendingRequests = await prisma.serviceRequest.findMany({
    where: { tableId: table.id, status: "PENDING" },
    select: { type: true, createdAt: true },
  });

  if (!order) {
    return { tableLabel: table.label, tickets: [], bill: null, pendingRequests };
  }

  const itemById = new Map(order.items.map((i) => [i.id, i]));
  const lineTotal = (id: string) => {
    const i = itemById.get(id);
    if (!i || i.status === "CANCELLED") return 0;
    const mods = i.modifiers.reduce((s, m) => s + m.priceDeltaSnapshot.toNumber(), 0);
    return round2(i.quantity * (i.unitPriceSnapshot.toNumber() + mods));
  };
  const isMine = (id: string) => Boolean(dinerId) && itemById.get(id)?.dinerId === dinerId;

  const tickets = await getTicketDTOs(prisma, { orderId: order.id });

  const active = order.items.filter((i) => i.status !== "CANCELLED");
  const tableSubtotal = round2(active.reduce((s, i) => s + lineTotal(i.id), 0));
  const mineSubtotal = round2(active.filter((i) => isMine(i.id)).reduce((s, i) => s + lineTotal(i.id), 0));
  const tableTotals = computeBillTotals(tableSubtotal, order.discountAmount.toNumber());

  return {
    tableLabel: table.label,
    pendingRequests,
    // Lo mas reciente arriba: es lo que el comensal esta esperando.
    tickets: tickets
      .slice()
      .reverse()
      .map((t) => ({
        id: t.id,
        number: t.number,
        status: t.status as TicketStatus,
        rejectReason: t.rejectReason,
        queuePosition: t.queuePosition,
        estimateMin: t.estimateMin,
        sentAt: t.sentAt,
        seenAt: t.seenAt,
        confirmedAt: t.confirmedAt,
        startedAt: t.startedAt,
        readyAt: t.readyAt,
        pickedUpAt: t.pickedUpAt,
        deliveredAt: t.deliveredAt,
        rejectedAt: t.rejectedAt,
        items: t.items.map((i) => ({
          id: i.id,
          name: i.name,
          quantity: i.quantity,
          modifiers: i.modifiers,
          notes: i.notes,
          dinerName: i.dinerName,
          mine: isMine(i.id),
          cancelled: i.status === "CANCELLED",
          cancelReason: i.cancelReason,
          lineTotal: lineTotal(i.id),
        })),
      })),
    bill: {
      mine: mineSubtotal,
      table: round2(tableTotals.discountedSubtotal + tableTotals.tax + tableTotals.serviceCharge),
      discount: tableTotals.discountAmount,
      byDiner: Object.entries(
        active.reduce<Record<string, number>>((acc, i) => {
          const name = i.dinerName ?? "Pedido con el mesero";
          acc[name] = round2((acc[name] ?? 0) + lineTotal(i.id));
          return acc;
        }, {})
      ).map(([name, amount]) => ({ name, amount })),
    },
  };
}
