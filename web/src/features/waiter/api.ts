import { api } from "../../lib/api";
import type { MenuCategoryDTO, OrderDTO, TableDTO } from "@rms/shared";

export async function fetchTables() {
  const { data } = await api.get<TableDTO[]>("/api/tables");
  return data;
}

export async function setTableStatus(tableId: string, status: TableDTO["status"]) {
  await api.patch(`/api/tables/${tableId}/status`, { status });
}

export async function fetchMenu() {
  const { data } = await api.get<MenuCategoryDTO[]>("/api/menu");
  return data;
}

export interface NewOrderItemPayload {
  menuItemId: string;
  quantity: number;
  notes?: string;
  modifierIds: string[];
}

export async function submitOrder(tableId: string, items: NewOrderItemPayload[]) {
  const { data } = await api.post<OrderDTO>("/api/orders", { tableId, items });
  return data;
}

export async function fetchMyOrders() {
  const { data } = await api.get<OrderDTO[]>("/api/orders/mine");
  return data;
}

export async function markItemServed(itemId: string) {
  await api.patch(`/api/orders/items/${itemId}/status`, { status: "SERVED" });
}

export async function requestCancelItem(itemId: string) {
  const { data } = await api.patch<{ status?: string }>(`/api/orders/items/${itemId}/status`, {
    status: "CANCELLED",
  });
  return data;
}

export async function requestBill(tableId: string) {
  await setTableStatus(tableId, "BILL_REQUESTED");
}
