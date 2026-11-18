import { api } from "../../lib/api";
import type { KitchenStationDTO, OrderItemDTO, OrderItemStatus } from "@rms/shared";

export type StationQueueItem = OrderItemDTO & { tableLabel: string; waiterName: string };

export async function fetchStations() {
  const { data } = await api.get<KitchenStationDTO[]>("/api/stations");
  return data;
}

export async function fetchStationQueue(stationId: string) {
  const { data } = await api.get<StationQueueItem[]>(`/api/kds/${stationId}/queue`);
  return data;
}

export async function updateItemStatus(itemId: string, status: OrderItemStatus) {
  await api.patch(`/api/orders/items/${itemId}/status`, { status });
}
