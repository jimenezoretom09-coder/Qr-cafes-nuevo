import { PrismaClient } from "@prisma/client";
import { Server as SocketIOServer } from "socket.io";
import {
  rooms,
  computeBillTotals,
  round2,
  TAX_RATE,
  SERVICE_CHARGE_RATE,
  type OrderItemDTO,
  type OrderDTO,
  type OrderItemStatus,
  type OrderTotalsDTO,
  type PaymentDTO,
  type PaymentMethod,
} from "@rms/shared";
import { recordAudit } from "../audit/service.js";
import { clearAlert } from "./delay-tracker.js";
import { deriveOrderStatus } from "./status.js";
import { attachItemsToTicket, publishTicket, syncTicketFromItems } from "../tickets/service.js";

const orderItemInclude = { modifiers: true } as const;
const orderInclude = {
  items: { include: orderItemInclude },
  waiter: true,
  table: true,
  payments: true,
  customer: true,
} as const;

type OrderWithItems = Awaited<ReturnType<typeof loadOrder>>;
type OrderItemRow = OrderWithItems["items"][number];

async function loadOrder(prisma: PrismaClient, orderId: string) {
  return prisma.order.findUniqueOrThrow({ where: { id: orderId }, include: orderInclude });
}

export function itemLineTotal(item: OrderItemRow): number {
  const modsTotal = item.modifiers.reduce((sum, m) => sum + m.priceDeltaSnapshot.toNumber(), 0);
  return item.quantity * (item.unitPriceSnapshot.toNumber() + modsTotal);
}

export function toOrderItemDTO(item: OrderItemRow): OrderItemDTO {
  return {
    id: item.id,
    orderId: item.orderId,
    menuItemId: item.menuItemId,
    name: item.nameSnapshot,
    unitPrice: item.unitPriceSnapshot.toNumber(),
    quantity: item.quantity,
    course: item.course as OrderItemDTO["course"],
    stationId: item.stationId,
    status: item.status as OrderItemStatus,
    isIncluded: item.isIncluded,
    notes: item.notes,
    modifiers: item.modifiers.map((m) => ({
      modifierId: m.modifierId,
      name: m.nameSnapshot,
      priceDelta: m.priceDeltaSnapshot.toNumber(),
    })),
    sentToKitchenAt: item.sentToKitchenAt.toISOString(),
    startedAt: item.startedAt?.toISOString() ?? null,
    readyAt: item.readyAt?.toISOString() ?? null,
    servedAt: item.servedAt?.toISOString() ?? null,
    paidAt: item.paidAt?.toISOString() ?? null,
    ticketId: item.ticketId,
    dinerName: item.dinerName,
    cancelReason: item.cancelReason,
  };
}

export function computeOrderTotals(order: OrderWithItems): OrderTotalsDTO {
  const activeItems = order.items.filter((i) => i.status !== "CANCELLED");
  const subtotal = round2(activeItems.reduce((sum, item) => sum + itemLineTotal(item), 0));
  const discountAmount = order.discountAmount.toNumber();
  const { discountedSubtotal, tax, serviceCharge } = computeBillTotals(subtotal, discountAmount);
  const total = round2(discountedSubtotal + tax + serviceCharge);
  const amountPaid = round2(
    order.payments
      .filter((p) => !p.refunded)
      .reduce((sum, p) => sum + p.subtotalAmount.toNumber() + p.taxAmount.toNumber() + p.serviceAmount.toNumber(), 0)
  );
  const balanceDue = round2(Math.max(0, total - amountPaid));
  return { subtotal, discountAmount, discountedSubtotal, tax, serviceCharge, total, amountPaid, balanceDue };
}

export function toOrderDTO(order: OrderWithItems): OrderDTO {
  return {
    id: order.id,
    tableId: order.tableId,
    tableLabel: order.table.label,
    waiterId: order.waiterId,
    waiterName: order.waiter.name,
    status: order.status as OrderDTO["status"],
    discountAmount: order.discountAmount.toNumber(),
    discountReason: order.discountReason,
    customerId: order.customerId,
    customerName: order.customer?.name ?? null,
    createdAt: order.createdAt.toISOString(),
    items: order.items.map(toOrderItemDTO),
    totals: computeOrderTotals(order),
  };
}

export interface NewOrderItemInput {
  menuItemId: string;
  quantity: number;
  notes?: string;
  modifierIds: string[];
}

/** Quien de la mesa pidio (solo pedidos desde el QR). */
export interface DinerInfo {
  dinerId: string;
  dinerName: string;
}

/**
 * Reparte las sobremesas que van incluidas con el almuerzo.
 *
 * Cada almuerzo (MenuItem.includesDrink) da derecho a una bebida de las incluidas
 * (MenuItem.isIncludedDrink: mazamorra, claro, jugo del dia). Se regalan las primeras que se
 * pidieron y se cobran las de mas, que es como lo cobra el restaurante: si entran 5 almuerzos
 * y 6 sobremesas, la sexta se cobra.
 *
 * Cuando una linea queda partida (3 jugos y solo 2 gratis) se separa en dos: la incluida en 0
 * y la que se cobra a su precio. Asi la cuenta muestra exactamente que se regalo y que no, y
 * el resto del sistema —caja, recibos, reportes— no necesita saber nada de esta regla.
 *
 * Se vuelve a calcular entero en cada cambio del pedido, para que agregar o cancelar platos
 * despues deje siempre el mismo resultado.
 */
export async function recalcIncludedDrinks(prisma: PrismaClient, orderId: string) {
  const items = await prisma.orderItem.findMany({
    where: { orderId, status: { not: "CANCELLED" } },
    include: { menuItem: { select: { includesDrink: true, isIncludedDrink: true, price: true } }, modifiers: true },
    orderBy: { sentToKitchenAt: "asc" },
  });

  const derechos = items
    .filter((i) => i.menuItem.includesDrink)
    .reduce((sum, i) => sum + i.quantity, 0);

  const bebidas = items.filter((i) => i.menuItem.isIncludedDrink);
  if (derechos === 0 && bebidas.every((b) => !b.isIncluded)) return;

  let porRegalar = derechos;

  for (const bebida of bebidas) {
    const gratis = Math.min(porRegalar, bebida.quantity);
    porRegalar -= gratis;

    // Ya paga lo que debe pagar y regala lo que debe regalar: nada que mover.
    if (gratis === bebida.quantity && bebida.isIncluded) continue;
    if (gratis === 0 && !bebida.isIncluded) continue;

    const precioLista = bebida.menuItem.price;

    if (gratis === bebida.quantity) {
      await prisma.orderItem.update({
        where: { id: bebida.id },
        data: { isIncluded: true, unitPriceSnapshot: 0 },
      });
    } else if (gratis === 0) {
      await prisma.orderItem.update({
        where: { id: bebida.id },
        data: { isIncluded: false, unitPriceSnapshot: precioLista },
      });
    } else {
      // Parte incluida y parte cobrada: se separan en dos lineas.
      await prisma.$transaction([
        prisma.orderItem.update({
          where: { id: bebida.id },
          data: { quantity: gratis, isIncluded: true, unitPriceSnapshot: 0 },
        }),
        prisma.orderItem.create({
          data: {
            orderId: bebida.orderId,
            menuItemId: bebida.menuItemId,
            nameSnapshot: bebida.nameSnapshot,
            unitPriceSnapshot: precioLista,
            quantity: bebida.quantity - gratis,
            course: bebida.course,
            stationId: bebida.stationId,
            status: bebida.status,
            notes: bebida.notes,
            ticketId: bebida.ticketId,
            dinerId: bebida.dinerId,
            dinerName: bebida.dinerName,
            isIncluded: false,
            sentToKitchenAt: bebida.sentToKitchenAt,
            startedAt: bebida.startedAt,
            readyAt: bebida.readyAt,
            servedAt: bebida.servedAt,
            modifiers: {
              create: bebida.modifiers.map((m) => ({
                modifierId: m.modifierId,
                nameSnapshot: m.nameSnapshot,
                priceDeltaSnapshot: m.priceDeltaSnapshot,
              })),
            },
          },
        }),
      ]);
    }
  }
}

export async function createOrGrowOrder(
  prisma: PrismaClient,
  io: SocketIOServer,
  params: { tableId: string; waiterId: string; items: NewOrderItemInput[]; diner?: DinerInfo }
) {
  const menuItems = await prisma.menuItem.findMany({
    where: { id: { in: params.items.map((i) => i.menuItemId) } },
    include: { modifierGroups: { include: { group: { include: { modifiers: true } } } } },
  });
  const menuItemById = new Map(menuItems.map((m) => [m.id, m]));

  for (const input of params.items) {
    const menuItem = menuItemById.get(input.menuItemId);
    if (!menuItem) throw new Error(`Plato no encontrado: ${input.menuItemId}`);
    if (!menuItem.available) throw new Error(`El plato "${menuItem.name}" ya no está disponible`);
  }

  let order = await prisma.order.findFirst({
    where: { tableId: params.tableId, status: { in: ["OPEN", "IN_PROGRESS", "READY", "SERVED"] } },
  });
  if (!order) {
    order = await prisma.order.create({
      data: { tableId: params.tableId, waiterId: params.waiterId, status: "OPEN" },
    });
    await prisma.restaurantTable.update({ where: { id: params.tableId }, data: { status: "OCCUPIED" } });
  }

  const createdItemIds: string[] = [];
  for (const input of params.items) {
    const menuItem = menuItemById.get(input.menuItemId)!;
    const allModifiers = menuItem.modifierGroups.flatMap((g) => g.group.modifiers);
    const chosenModifiers = allModifiers.filter((m) => input.modifierIds.includes(m.id));

    const item = await prisma.orderItem.create({
      data: {
        orderId: order.id,
        menuItemId: menuItem.id,
        nameSnapshot: menuItem.name,
        unitPriceSnapshot: menuItem.price,
        quantity: input.quantity,
        course: menuItem.course,
        stationId: menuItem.stationId,
        status: "QUEUED",
        notes: input.notes,
        dinerId: params.diner?.dinerId,
        dinerName: params.diner?.dinerName,
        modifiers: {
          create: chosenModifiers.map((m) => ({
            modifierId: m.id,
            nameSnapshot: m.name,
            priceDeltaSnapshot: m.priceDelta,
          })),
        },
      },
    });
    createdItemIds.push(item.id);
  }

  await prisma.order.update({ where: { id: order.id }, data: { status: "IN_PROGRESS" } });
  // Antes de repartir sobremesas: las filas que se partan ahi deben heredar ya su comanda.
  const { ticketId, isNew } = await attachItemsToTicket(prisma, order.id, createdItemIds);
  await recalcIncludedDrinks(prisma, order.id);
  await recordAudit(prisma, {
    userId: params.waiterId,
    action: "ORDER_ITEMS_ADDED",
    entityType: "Order",
    entityId: order.id,
    metadata: { itemCount: createdItemIds.length },
  });

  const fullOrder = await loadOrder(prisma, order.id);
  const table = fullOrder.table;

  for (const item of fullOrder.items) {
    if (!createdItemIds.includes(item.id)) continue;
    io.to(rooms.station(item.stationId)).emit("order:item_created", {
      orderId: order.id,
      tableLabel: table.label,
      item: toOrderItemDTO(item),
    });
  }
  await publishTicket(prisma, io, ticketId, isNew ? "new" : "grown");

  return toOrderDTO(fullOrder);
}

const NEXT_STATUS: Record<OrderItemStatus, OrderItemStatus[]> = {
  QUEUED: ["IN_PREPARATION", "CANCELLED"],
  IN_PREPARATION: ["READY", "CANCELLED"],
  READY: ["SERVED"],
  SERVED: [],
  CANCELLED: [],
};

export async function updateOrderItemStatus(
  prisma: PrismaClient,
  io: SocketIOServer,
  params: { orderItemId: string; nextStatus: OrderItemStatus; actingUserId: string; cancelReason?: string }
) {
  const item = await prisma.orderItem.findUniqueOrThrow({
    where: { id: params.orderItemId },
    include: { order: { include: { table: true } } },
  });

  const allowed = NEXT_STATUS[item.status as OrderItemStatus] ?? [];
  if (!allowed.includes(params.nextStatus)) {
    throw new Error(`Transición inválida: ${item.status} -> ${params.nextStatus}`);
  }

  const timestampField =
    params.nextStatus === "IN_PREPARATION"
      ? "startedAt"
      : params.nextStatus === "READY"
      ? "readyAt"
      : params.nextStatus === "SERVED"
      ? "servedAt"
      : null;

  await prisma.orderItem.update({
    where: { id: item.id },
    data: {
      status: params.nextStatus,
      ...(timestampField ? { [timestampField]: new Date() } : {}),
      ...(params.nextStatus === "CANCELLED" ? { cancelReason: params.cancelReason ?? "Anulado" } : {}),
    },
  });
  clearAlert(item.id);

  // Cancelar un almuerzo quita el derecho a su sobremesa, asi que hay que repartirlas de nuevo.
  if (params.nextStatus === "CANCELLED") {
    await recalcIncludedDrinks(prisma, item.orderId);
  }

  await recordAudit(prisma, {
    userId: params.actingUserId,
    action: "ORDER_ITEM_STATUS_CHANGED",
    entityType: "OrderItem",
    entityId: item.id,
    metadata: { from: item.status, to: params.nextStatus },
  });

  const siblingItems = await prisma.orderItem.findMany({ where: { orderId: item.orderId } });
  const derivedStatus = deriveOrderStatus(siblingItems);
  await prisma.order.update({ where: { id: item.orderId }, data: { status: derivedStatus } });

  // Every item ended up cancelled (e.g. the only item on the order was voided) — free the
  // table instead of leaving it stuck "OCCUPIED" with no active order to close it out.
  if (derivedStatus === "CANCELLED") {
    await prisma.restaurantTable.update({ where: { id: item.order.tableId }, data: { status: "FREE" } });
    io.to(rooms.global()).emit("table:status_changed", { tableId: item.order.tableId, status: "FREE" });
  }

  const statusChangedPayload = {
    orderId: item.orderId,
    itemId: item.id,
    status: params.nextStatus,
    tableLabel: item.order.table.label,
    itemName: item.nameSnapshot,
  };
  // Waiter needs the "ready to serve" notification; the station room needs it so every
  // KDS terminal watching that station stays in sync (not just the one that made the change).
  io.to(rooms.waiter(item.order.waiterId)).emit("order:item_status_changed", statusChangedPayload);
  io.to(rooms.station(item.stationId)).emit("order:item_status_changed", statusChangedPayload);

  // La comanda de este plato puede cambiar de estado con el (todo listo, todo cancelado...).
  if (item.ticketId) await syncTicketFromItems(prisma, io, item.ticketId);

  return { ok: true };
}

/** Cancels every not-yet-served item of an order; closes the order if nothing active remains. */
export async function cancelWholeOrder(
  prisma: PrismaClient,
  io: SocketIOServer,
  orderId: string,
  actingUserId: string
) {
  const order = await loadOrder(prisma, orderId);
  const cancellable = order.items.filter((i) => i.status === "QUEUED" || i.status === "IN_PREPARATION");
  for (const item of cancellable) {
    await updateOrderItemStatus(prisma, io, { orderItemId: item.id, nextStatus: "CANCELLED", actingUserId });
  }

  const refreshed = await loadOrder(prisma, orderId);
  const remainingActive = refreshed.items.filter((i) => i.status !== "CANCELLED");
  if (remainingActive.length === 0) {
    await prisma.order.update({ where: { id: orderId }, data: { status: "CANCELLED" } });
    await prisma.restaurantTable.update({ where: { id: refreshed.tableId }, data: { status: "FREE" } });
    io.to(rooms.global()).emit("table:status_changed", { tableId: refreshed.tableId, status: "FREE" });
  }
}

export async function applyDiscountToOrder(
  prisma: PrismaClient,
  orderId: string,
  discount: { discountType: "PERCENT" | "FIXED"; value: number },
  actingUserId: string,
  reason?: string
) {
  const order = await loadOrder(prisma, orderId);
  const activeSubtotal = order.items
    .filter((i) => i.status !== "CANCELLED")
    .reduce((sum, item) => sum + itemLineTotal(item), 0);

  const amount =
    discount.discountType === "PERCENT"
      ? round2(activeSubtotal * (discount.value / 100))
      : round2(Math.min(discount.value, activeSubtotal));

  await prisma.order.update({ where: { id: orderId }, data: { discountAmount: amount, discountReason: reason ?? null } });
  await recordAudit(prisma, {
    userId: actingUserId,
    action: "DISCOUNT_APPLIED",
    entityType: "Order",
    entityId: orderId,
    metadata: { amount, discount },
  });
  return amount;
}

export async function getStationQueue(prisma: PrismaClient, stationId: string) {
  const items = await prisma.orderItem.findMany({
    where: { stationId, status: { in: ["QUEUED", "IN_PREPARATION", "READY"] } },
    include: { modifiers: true, order: { include: { table: true, waiter: true } } },
    orderBy: { sentToKitchenAt: "asc" },
  });

  return items.map((item) => ({
    ...toOrderItemDTO(item),
    tableLabel: item.order.table.label,
    waiterName: item.order.waiter.name,
  }));
}

export async function getWaiterOpenOrders(prisma: PrismaClient, waiterId: string) {
  const orders = await prisma.order.findMany({
    where: { waiterId, status: { in: ["OPEN", "IN_PROGRESS", "READY", "SERVED"] } },
    include: orderInclude,
    orderBy: { createdAt: "desc" },
  });
  return orders.map(toOrderDTO);
}

export async function getOrder(prisma: PrismaClient, orderId: string) {
  return toOrderDTO(await loadOrder(prisma, orderId));
}

export async function setOrderCustomer(prisma: PrismaClient, orderId: string, customerId: string | null) {
  const order = await loadOrder(prisma, orderId);
  if (order.status === "CLOSED" || order.status === "CANCELLED") {
    throw new Error("La orden ya está cerrada");
  }
  await prisma.order.update({ where: { id: orderId }, data: { customerId } });
  return getOrder(prisma, orderId);
}

export async function getOpenOrdersForCheckout(prisma: PrismaClient) {
  const orders = await prisma.order.findMany({
    where: { status: { in: ["OPEN", "IN_PROGRESS", "READY", "SERVED"] } },
    include: orderInclude,
    orderBy: { createdAt: "asc" },
  });
  return orders.map(toOrderDTO);
}

// ---------- Payments ----------

function toPaymentDTO(
  payment: {
    id: string;
    orderId: string;
    method: string;
    subtotalAmount: { toNumber(): number };
    taxAmount: { toNumber(): number };
    serviceAmount: { toNumber(): number };
    tipAmount: { toNumber(): number };
    amount: { toNumber(): number };
    splitLabel: string | null;
    createdById: string;
    createdBy: { name: string };
    cashSessionId: string;
    refunded: boolean;
    items: { orderItemId: string }[];
    createdAt: Date;
  },
  tableLabel: string
): PaymentDTO {
  return {
    id: payment.id,
    orderId: payment.orderId,
    tableLabel,
    method: payment.method as PaymentMethod,
    subtotalAmount: payment.subtotalAmount.toNumber(),
    taxAmount: payment.taxAmount.toNumber(),
    serviceAmount: payment.serviceAmount.toNumber(),
    tipAmount: payment.tipAmount.toNumber(),
    amount: payment.amount.toNumber(),
    splitLabel: payment.splitLabel,
    createdById: payment.createdById,
    createdByName: payment.createdBy.name,
    cashSessionId: payment.cashSessionId,
    refunded: payment.refunded,
    itemIds: payment.items.map((i) => i.orderItemId),
    createdAt: payment.createdAt.toISOString(),
  };
}

export interface RecordPaymentInput {
  orderId: string;
  method: PaymentMethod;
  tipAmount: number;
  createdById: string;
  cashSessionId: string;
  itemIds?: string[];
  /** Cobrar solo parte de una linea: 2 de los 4 morrillos, por ejemplo. */
  itemPortions?: { orderItemId: string; quantity: number }[];
  splitEvenly?: { groupId: string; partsTotal: number };
  splitLabel?: string;
}

/**
 * Deja listas para cobrar solo las unidades pedidas de cada linea.
 *
 * Un pedido de "4× Morrillo" es una sola fila, asi que para cobrarle 2 a un comensal se parte
 * la fila en dos: la original queda con las 2 que se van a pagar y nace otra con las 2 que
 * siguen pendientes (con sus mismos extras, nota y estado de cocina). Asi el resto del cobro
 * —recibos, saldo, marcar como pagado— sigue funcionando igual, sin tocar la base de datos.
 *
 * Devuelve los ids de las filas que quedaron listas para marcar como pagadas.
 */
async function splitItemsForPartialPayment(
  prisma: PrismaClient,
  order: OrderWithItems,
  portions: { orderItemId: string; quantity: number }[]
): Promise<string[]> {
  const idsToCharge: string[] = [];

  for (const portion of portions) {
    const item = order.items.find((i) => i.id === portion.orderItemId);
    if (!item) throw new Error("Algunos platos no existen o están cancelados");
    if (item.status === "CANCELLED") throw new Error(`${item.nameSnapshot} está cancelado`);
    if (item.paidAt) throw new Error(`Ya pagado: ${item.nameSnapshot}`);
    if (portion.quantity < 1 || portion.quantity > item.quantity) {
      throw new Error(`Cantidad inválida para ${item.nameSnapshot}: hay ${item.quantity} sin pagar`);
    }

    idsToCharge.push(item.id);
    if (portion.quantity === item.quantity) continue;

    const restante = item.quantity - portion.quantity;
    await prisma.$transaction([
      prisma.orderItem.update({ where: { id: item.id }, data: { quantity: portion.quantity } }),
      prisma.orderItem.create({
        data: {
          orderId: item.orderId,
          menuItemId: item.menuItemId,
          nameSnapshot: item.nameSnapshot,
          unitPriceSnapshot: item.unitPriceSnapshot,
          quantity: restante,
          course: item.course,
          stationId: item.stationId,
          status: item.status,
          notes: item.notes,
          ticketId: item.ticketId,
          dinerId: item.dinerId,
          dinerName: item.dinerName,
          sentToKitchenAt: item.sentToKitchenAt,
          startedAt: item.startedAt,
          readyAt: item.readyAt,
          servedAt: item.servedAt,
          modifiers: {
            create: item.modifiers.map((m) => ({
              modifierId: m.modifierId,
              nameSnapshot: m.nameSnapshot,
              priceDeltaSnapshot: m.priceDeltaSnapshot,
            })),
          },
        },
      }),
    ]);
  }

  return idsToCharge;
}

export async function recordPayment(prisma: PrismaClient, io: SocketIOServer, input: RecordPaymentInput) {
  let order = await loadOrder(prisma, input.orderId);
  if (order.status === "CLOSED" || order.status === "CANCELLED") {
    throw new Error("La orden ya está cerrada");
  }

  // Cobro parcial de una linea (2 de 4 morrillos): se parten las filas primero y desde ahi
  // el cobro sigue el mismo camino de siempre, con las filas ya del tamaño correcto.
  let itemIds = input.itemIds;
  if (input.itemPortions && input.itemPortions.length > 0) {
    if (order.discountAmount.toNumber() > 0) {
      throw new Error("No se puede dividir por plato una cuenta con descuento aplicado. Usa 'Pagar completo'.");
    }
    itemIds = await splitItemsForPartialPayment(prisma, order, input.itemPortions);
    order = await loadOrder(prisma, input.orderId);
  }
  input = { ...input, itemIds };

  const activeItems = order.items.filter((i) => i.status !== "CANCELLED");
  const fullTotals = computeOrderTotals(order);

  let subtotalAmount: number;
  let taxAmount: number;
  let serviceAmount: number;
  let itemIdsToMark: string[] = [];
  let splitLabel = input.splitLabel ?? null;
  let splitGroupId: string | null = null;

  if (input.itemIds && input.itemIds.length > 0) {
    if (order.discountAmount.toNumber() > 0) {
      throw new Error("No se puede dividir por plato una cuenta con descuento aplicado. Usa 'Pagar completo'.");
    }
    const selected = activeItems.filter((i) => input.itemIds!.includes(i.id));
    if (selected.length !== input.itemIds.length) {
      throw new Error("Algunos platos no existen o están cancelados");
    }
    const alreadyPaid = selected.filter((i) => i.paidAt);
    if (alreadyPaid.length > 0) {
      throw new Error(`Ya pagado: ${alreadyPaid.map((i) => i.nameSnapshot).join(", ")}`);
    }
    // Discount is guaranteed 0 here (blocked above), so tax/service apply directly at the standard rates.
    const itemSubtotal = selected.reduce((sum, item) => sum + itemLineTotal(item), 0);
    subtotalAmount = round2(itemSubtotal);
    taxAmount = round2(itemSubtotal * TAX_RATE);
    serviceAmount = round2(itemSubtotal * SERVICE_CHARGE_RATE);
    itemIdsToMark = selected.map((i) => i.id);
  } else if (input.splitEvenly) {
    const { groupId, partsTotal } = input.splitEvenly;
    if (partsTotal < 2) throw new Error("Debe dividirse en al menos 2 partes");
    const existingCount = await prisma.payment.count({ where: { orderId: order.id, splitGroupId: groupId } });
    if (existingCount >= partsTotal) throw new Error("Ya se registraron todas las partes de esta división");
    const isLast = existingCount === partsTotal - 1;

    const shareSubtotal = round2(fullTotals.discountedSubtotal / partsTotal);
    const shareTax = round2(fullTotals.tax / partsTotal);
    const shareService = round2(fullTotals.serviceCharge / partsTotal);

    if (isLast) {
      subtotalAmount = round2(fullTotals.discountedSubtotal - shareSubtotal * (partsTotal - 1));
      taxAmount = round2(fullTotals.tax - shareTax * (partsTotal - 1));
      serviceAmount = round2(fullTotals.serviceCharge - shareService * (partsTotal - 1));
    } else {
      subtotalAmount = shareSubtotal;
      taxAmount = shareTax;
      serviceAmount = shareService;
    }
    splitGroupId = groupId;
    splitLabel = `${existingCount + 1} de ${partsTotal}`;
  } else {
    const unpaid = activeItems.filter((i) => !i.paidAt);
    if (unpaid.length === 0) throw new Error("Esta cuenta ya está completamente pagada");
    const alreadyAnyPaid = activeItems.some((i) => i.paidAt);
    const unpaidSubtotal = unpaid.reduce((sum, item) => sum + itemLineTotal(item), 0);
    const effectiveDiscount = alreadyAnyPaid ? 0 : order.discountAmount.toNumber();
    const discountedUnpaidSubtotal = Math.max(0, unpaidSubtotal - effectiveDiscount);
    subtotalAmount = round2(discountedUnpaidSubtotal);
    taxAmount = round2(discountedUnpaidSubtotal * TAX_RATE);
    serviceAmount = round2(discountedUnpaidSubtotal * SERVICE_CHARGE_RATE);
    itemIdsToMark = unpaid.map((i) => i.id);
  }

  const amount = round2(subtotalAmount + taxAmount + serviceAmount + input.tipAmount);

  const payment = await prisma.payment.create({
    data: {
      orderId: order.id,
      method: input.method,
      subtotalAmount,
      taxAmount,
      serviceAmount,
      tipAmount: input.tipAmount,
      amount,
      splitGroupId,
      splitLabel,
      createdById: input.createdById,
      cashSessionId: input.cashSessionId,
      items: { create: itemIdsToMark.map((id) => ({ orderItemId: id })) },
    },
    include: { createdBy: true, items: true },
  });

  if (itemIdsToMark.length > 0) {
    await prisma.orderItem.updateMany({ where: { id: { in: itemIdsToMark } }, data: { paidAt: new Date() } });
  }

  await recordAudit(prisma, {
    userId: input.createdById,
    action: "PAYMENT_RECORDED",
    entityType: "Payment",
    entityId: payment.id,
    metadata: { orderId: order.id, method: input.method, amount },
  });

  let refreshedOrder = await loadOrder(prisma, order.id);
  const refreshedTotals = computeOrderTotals(refreshedOrder);
  let closed = false;
  if (refreshedTotals.balanceDue <= 0.01) {
    const stillUnpaidActive = refreshedOrder.items.filter((i) => i.status !== "CANCELLED" && !i.paidAt);
    if (stillUnpaidActive.length > 0) {
      await prisma.orderItem.updateMany({
        where: { id: { in: stillUnpaidActive.map((i) => i.id) } },
        data: { paidAt: new Date() },
      });
    }
    await prisma.order.update({ where: { id: order.id }, data: { status: "CLOSED", closedAt: new Date() } });
    await prisma.restaurantTable.update({ where: { id: order.tableId }, data: { status: "FREE" } });
    // Cuenta pagada: los llamados que quedaran pendientes en esa mesa ya no aplican.
    await prisma.serviceRequest.updateMany({
      where: { tableId: order.tableId, status: "PENDING" },
      data: { status: "ATTENDED", attendedAt: new Date(), attendedById: input.createdById },
    });
    closed = true;
    refreshedOrder = await loadOrder(prisma, order.id);

    // 1 point per whole currency unit spent (excluding tip), only once the bill is fully settled.
    if (refreshedOrder.customerId) {
      const pointsEarned = Math.floor(refreshedTotals.total);
      await prisma.customer.update({
        where: { id: refreshedOrder.customerId },
        data: {
          points: { increment: pointsEarned },
          visitCount: { increment: 1 },
          totalSpent: { increment: refreshedTotals.total },
        },
      });
    }
  }

  const finalTotals = computeOrderTotals(refreshedOrder);
  const paymentDTO = toPaymentDTO(payment, refreshedOrder.table.label);

  const payload = { orderId: order.id, totals: finalTotals, payment: paymentDTO };
  io.to(rooms.waiter(order.waiterId)).emit("order:payment_recorded", payload);
  io.to(rooms.role("CASHIER")).emit("order:payment_recorded", payload);
  io.to(rooms.role("MANAGER")).emit("order:payment_recorded", payload);
  io.to(rooms.role("ADMIN")).emit("order:payment_recorded", payload);
  if (closed) {
    io.to(rooms.global()).emit("table:status_changed", { tableId: order.tableId, status: "FREE" });
  }

  return { payment: paymentDTO, order: toOrderDTO(refreshedOrder), closed };
}
