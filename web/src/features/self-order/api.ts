import { api } from "../../lib/api";

export interface PublicModifier {
  id: string;
  name: string;
  priceDelta: number;
}

export interface PublicModifierGroup {
  id: string;
  name: string;
  minSelect: number;
  maxSelect: number;
  modifiers: PublicModifier[];
}

export interface PublicMenuItem {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  videoUrl: string | null;
  allergens: string[];
  price: number;
  course: string;
  modifierGroups: PublicModifierGroup[];
}

export interface PublicMenuCategory {
  id: string;
  name: string;
  mealPeriod: string;
  items: PublicMenuItem[];
}

export interface PublicMenuResponse {
  table: { id: string; label: string; capacity: number };
  business: { name: string };
  categories: PublicMenuCategory[];
}

export interface SelfOrderCartItem {
  menuItemId: string;
  quantity: number;
  notes?: string;
  modifierIds?: string[];
}

export interface SelfOrderStatus {
  tableLabel: string;
  status: string;
  items: { id: string; name: string; quantity: number; status: string }[];
}

export async function fetchPublicMenu(tableLabel: string): Promise<PublicMenuResponse> {
  const { data } = await api.get(`/api/public/mesa/${encodeURIComponent(tableLabel)}/menu`);
  return data;
}

export async function placeSelfOrder(
  tableLabel: string,
  items: SelfOrderCartItem[]
): Promise<{ id: string }> {
  const { data } = await api.post(`/api/public/mesa/${encodeURIComponent(tableLabel)}/pedido`, { items });
  return data;
}

export async function fetchSelfOrderStatus(orderId: string): Promise<SelfOrderStatus> {
  const { data } = await api.get(`/api/public/pedido/${orderId}/estado`);
  return data;
}
