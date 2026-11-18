import { PrismaClient } from "@prisma/client";
import { round2, type KitchenReportDTO, type SalesReportDTO } from "@rms/shared";
import { computeOrderTotals, itemLineTotal } from "../orders/service.js";

export async function getSalesReport(prisma: PrismaClient, from: Date, to: Date): Promise<SalesReportDTO> {
  const orders = await prisma.order.findMany({
    where: { status: "CLOSED", closedAt: { gte: from, lte: to } },
    include: {
      items: { include: { modifiers: true, menuItem: { include: { category: true } } } },
      waiter: true,
      table: true,
      payments: true,
      customer: true,
    },
  });

  let totalRevenue = 0;
  let totalTips = 0;
  const byHour = new Map<number, { total: number; orderCount: number }>();
  const byCategory = new Map<string, { categoryName: string; grossTotal: number; itemCount: number }>();
  const byWaiter = new Map<string, { waiterName: string; total: number; orderCount: number }>();

  for (const order of orders) {
    const totals = computeOrderTotals(order);
    totalRevenue = round2(totalRevenue + totals.total);
    totalTips = round2(totalTips + order.payments.filter((p) => !p.refunded).reduce((s, p) => s + p.tipAmount.toNumber(), 0));

    const hour = order.closedAt!.getHours();
    const hourEntry = byHour.get(hour) ?? { total: 0, orderCount: 0 };
    hourEntry.total = round2(hourEntry.total + totals.total);
    hourEntry.orderCount += 1;
    byHour.set(hour, hourEntry);

    const waiterEntry = byWaiter.get(order.waiterId) ?? { waiterName: order.waiter.name, total: 0, orderCount: 0 };
    waiterEntry.total = round2(waiterEntry.total + totals.total);
    waiterEntry.orderCount += 1;
    byWaiter.set(order.waiterId, waiterEntry);

    for (const item of order.items) {
      if (item.status === "CANCELLED") continue;
      const categoryId = item.menuItem.categoryId;
      const categoryEntry = byCategory.get(categoryId) ?? {
        categoryName: item.menuItem.category.name,
        grossTotal: 0,
        itemCount: 0,
      };
      categoryEntry.grossTotal = round2(categoryEntry.grossTotal + itemLineTotal(item));
      categoryEntry.itemCount += item.quantity;
      byCategory.set(categoryId, categoryEntry);
    }
  }

  return {
    from: from.toISOString(),
    to: to.toISOString(),
    totalRevenue,
    totalOrders: orders.length,
    totalTips,
    averageTicket: orders.length > 0 ? round2(totalRevenue / orders.length) : 0,
    byHour: Array.from(byHour.entries())
      .map(([hour, v]) => ({ hour, ...v }))
      .sort((a, b) => a.hour - b.hour),
    byCategory: Array.from(byCategory.entries())
      .map(([categoryId, v]) => ({ categoryId, ...v }))
      .sort((a, b) => b.grossTotal - a.grossTotal),
    byWaiter: Array.from(byWaiter.entries())
      .map(([waiterId, v]) => ({ waiterId, ...v }))
      .sort((a, b) => b.total - a.total),
  };
}

export async function getKitchenReport(prisma: PrismaClient, from: Date, to: Date): Promise<KitchenReportDTO> {
  const items = await prisma.orderItem.findMany({
    where: {
      sentToKitchenAt: { gte: from, lte: to },
      readyAt: { not: null },
      status: { not: "CANCELLED" },
    },
    include: { menuItem: { include: { station: true } } },
  });

  const byStation = new Map<
    string,
    { stationName: string; itemCount: number; totalPrepMinutes: number; delayedCount: number }
  >();

  for (const item of items) {
    const prepMinutes = (item.readyAt!.getTime() - item.sentToKitchenAt.getTime()) / 60_000;
    const threshold = item.menuItem.preparationTimeEstimateMin + 5;
    const entry = byStation.get(item.stationId) ?? {
      stationName: item.menuItem.station.name,
      itemCount: 0,
      totalPrepMinutes: 0,
      delayedCount: 0,
    };
    entry.itemCount += 1;
    entry.totalPrepMinutes += prepMinutes;
    if (prepMinutes > threshold) entry.delayedCount += 1;
    byStation.set(item.stationId, entry);
  }

  return {
    from: from.toISOString(),
    to: to.toISOString(),
    byStation: Array.from(byStation.entries())
      .map(([stationId, v]) => ({
        stationId,
        stationName: v.stationName,
        itemCount: v.itemCount,
        avgPrepMinutes: round2(v.totalPrepMinutes / v.itemCount),
        delayedCount: v.delayedCount,
      }))
      .sort((a, b) => b.itemCount - a.itemCount),
  };
}
