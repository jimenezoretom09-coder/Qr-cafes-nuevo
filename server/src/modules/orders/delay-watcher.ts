import { FastifyInstance } from "fastify";
import { rooms } from "@rms/shared";
import { alertedItemIds } from "./delay-tracker.js";

const CHECK_INTERVAL_MS = 30_000;
const DELAY_BUFFER_MIN = 5;

export function startDelayWatcher(fastify: FastifyInstance) {
  const interval = setInterval(async () => {
    const items = await fastify.prisma.orderItem.findMany({
      where: { status: { in: ["QUEUED", "IN_PREPARATION"] } },
      include: { menuItem: true, order: { include: { table: true } } },
    });

    const now = Date.now();
    for (const item of items) {
      if (alertedItemIds.has(item.id)) continue;
      const waitingMinutes = (now - item.sentToKitchenAt.getTime()) / 60_000;
      const threshold = item.menuItem.preparationTimeEstimateMin + DELAY_BUFFER_MIN;
      if (waitingMinutes <= threshold) continue;

      alertedItemIds.add(item.id);
      const payload = {
        orderId: item.orderId,
        itemId: item.id,
        tableLabel: item.order.table.label,
        itemName: item.nameSnapshot,
        waitingMinutes: Math.round(waitingMinutes),
      };
      fastify.io.to(rooms.station(item.stationId)).emit("order:item_delayed", payload);
      fastify.io.to(rooms.role("MANAGER")).emit("alert:order_delayed", payload);
    }
  }, CHECK_INTERVAL_MS);

  fastify.addHook("onClose", () => clearInterval(interval));
}
