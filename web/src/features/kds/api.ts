import { api } from "../../lib/api";
import type {
  KitchenStationDTO,
  MenuCategoryDTO,
  OrderItemDTO,
  OrderItemStatus,
  TicketAction,
  TicketDTO,
} from "@rms/shared";

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

export async function fetchKitchenTickets() {
  const { data } = await api.get<TicketDTO[]>("/api/tickets/kitchen");
  return data;
}

export async function fetchFloorTickets() {
  const { data } = await api.get<TicketDTO[]>("/api/tickets/floor");
  return data;
}

export async function ticketAction(ticketId: string, action: TicketAction, reason?: string) {
  const { data } = await api.post<TicketDTO>(`/api/tickets/${ticketId}/action`, { action, reason });
  return data;
}

export async function markItemSoldOut(orderItemId: string) {
  await api.post(`/api/tickets/items/${orderItemId}/sold-out`, {});
}

export async function fetchMenuTree() {
  const { data } = await api.get<MenuCategoryDTO[]>("/api/menu");
  return data;
}

export async function setItemAvailability(menuItemId: string, available: boolean) {
  await api.patch(`/api/menu/items/${menuItemId}/availability`, { available });
}
