import type { TicketStatus } from "@rms/shared";
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
  isAdult: boolean;
  preparationTimeEstimateMin: number;
  modifierGroups: PublicModifierGroup[];
}

export interface PublicMenuCategory {
  id: string;
  name: string;
  mealPeriod: string;
  items: PublicMenuItem[];
}

export interface PublicBusiness {
  name: string;
  logoUrl: string | null;
  primaryColor: string;
  accentColor: string;
  tipSuggestionPercent: number;
}

export interface PublicMenuResponse {
  table: { id: string; label: string; capacity: number };
  business: PublicBusiness;
  categories: PublicMenuCategory[];
}

export interface SelfOrderCartItem {
  menuItemId: string;
  quantity: number;
  notes?: string;
  modifierIds?: string[];
}

export interface PublicTicketItem {
  id: string;
  name: string;
  quantity: number;
  modifiers: string[];
  notes: string | null;
  dinerName: string | null;
  mine: boolean;
  cancelled: boolean;
  cancelReason: string | null;
  lineTotal: number;
}

export interface PublicTicket {
  id: string;
  number: number;
  status: TicketStatus;
  rejectReason: string | null;
  queuePosition: number | null;
  estimateMin: number;
  sentAt: string;
  seenAt: string | null;
  confirmedAt: string | null;
  startedAt: string | null;
  readyAt: string | null;
  pickedUpAt: string | null;
  deliveredAt: string | null;
  rejectedAt: string | null;
  items: PublicTicketItem[];
}

export interface PublicTableStatus {
  tableLabel: string;
  tickets: PublicTicket[];
  pendingRequests: { type: "WAITER" | "BILL"; createdAt: string }[];
  /** La cuenta que este comensal acaba de pagar aqui: para ofrecerle calificar la visita. */
  recentVisit: { orderId: string; closedAt: string; alreadyRated: boolean; googleReviewUrl: string | null } | null;
  bill: {
    mine: number;
    table: number;
    discount: number;
    byDiner: { name: string; amount: number }[];
  } | null;
}

export interface Diner {
  dinerId: string;
  dinerName: string;
}

const base = (token: string) => `/api/public/m/${encodeURIComponent(token)}`;

export async function fetchPublicMenu(token: string): Promise<PublicMenuResponse> {
  const { data } = await api.get(`${base(token)}/menu`);
  return data;
}

export async function placeSelfOrder(token: string, diner: Diner, items: SelfOrderCartItem[]): Promise<{ id: string }> {
  const { data } = await api.post(`${base(token)}/pedido`, { ...diner, items });
  return data;
}

export async function fetchTableStatus(token: string, dinerId: string): Promise<PublicTableStatus> {
  const { data } = await api.get(`${base(token)}/estado`, { params: { dinerId } });
  return data;
}

export async function requestService(
  token: string,
  diner: Diner,
  params: {
    type: "WAITER" | "BILL";
    billScope?: "ALL" | "MINE";
    paymentHint?: "CASH" | "CARD" | "TRANSFER";
    tipPercent?: number;
  }
) {
  await api.post(`${base(token)}/llamado`, { ...diner, ...params });
}

export async function sendFeedback(token: string, diner: Diner, params: { orderId: string; rating: number; comment?: string }) {
  await api.post(`${base(token)}/opinion`, { ...diner, ...params });
}
