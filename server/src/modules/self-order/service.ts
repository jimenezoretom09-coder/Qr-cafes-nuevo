import { PrismaClient } from "@prisma/client";
import { Server as SocketIOServer } from "socket.io";
import { createOrGrowOrder } from "../orders/service.js";
import { getSelfServiceUserId } from "./self-service-user.js";

export async function getPublicMenuForTable(prisma: PrismaClient, tableLabel: string) {
  const table = await prisma.restaurantTable.findUnique({ where: { label: tableLabel } });
  if (!table || table.archived) return null;

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
    business: { name: profile?.name ?? "Mi restaurante" },
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
  params: { tableLabel: string; items: SelfOrderItemInput[] }
) {
  const table = await prisma.restaurantTable.findUnique({ where: { label: params.tableLabel } });
  if (!table || table.archived) throw new Error("Mesa no encontrada");

  const selfServiceUserId = await getSelfServiceUserId(prisma);
  return createOrGrowOrder(prisma, io, {
    tableId: table.id,
    waiterId: selfServiceUserId,
    items: params.items.map((i) => ({
      menuItemId: i.menuItemId,
      quantity: i.quantity,
      notes: i.notes,
      modifierIds: i.modifierIds ?? [],
    })),
  });
}

export async function getSelfServiceOrderStatus(prisma: PrismaClient, orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true, table: true },
  });
  if (!order) return null;

  return {
    tableLabel: order.table.label,
    status: order.status,
    items: order.items
      .filter((i) => i.status !== "CANCELLED")
      .map((i) => ({ id: i.id, name: i.nameSnapshot, quantity: i.quantity, status: i.status })),
  };
}
