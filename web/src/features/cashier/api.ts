import { api } from "../../lib/api";
import type { CashSessionDTO, CustomerDTO, OrderDTO, PaymentDTO, PaymentMethod } from "@rms/shared";

export async function fetchCurrentSession() {
  const { data } = await api.get<CashSessionDTO | null>("/api/cash-sessions/current");
  return data;
}

export async function openCashSession(openingAmount: number) {
  const { data } = await api.post<CashSessionDTO>("/api/cash-sessions/open", { openingAmount });
  return data;
}

export async function closeCashSession(sessionId: string, countedAmount: number) {
  const { data } = await api.post<CashSessionDTO>(`/api/cash-sessions/${sessionId}/close`, { countedAmount });
  return data;
}

export async function fetchSessionPayments(sessionId: string) {
  const { data } = await api.get<PaymentDTO[]>(`/api/cash-sessions/${sessionId}/payments`);
  return data;
}

export async function fetchOpenOrders() {
  const { data } = await api.get<OrderDTO[]>("/api/orders/open");
  return data;
}

export async function fetchOrder(orderId: string) {
  const { data } = await api.get<OrderDTO>(`/api/orders/${orderId}`);
  return data;
}

export async function fetchOrderPayments(orderId: string) {
  const { data } = await api.get<PaymentDTO[]>(`/api/orders/${orderId}/payments`);
  return data;
}

export interface RecordPaymentPayload {
  method: PaymentMethod;
  tipAmount: number;
  itemIds?: string[];
  /** Cobrar solo algunas unidades de una linea: 2 de los 4 morrillos. */
  itemPortions?: { orderItemId: string; quantity: number }[];
  splitEvenly?: { groupId: string; partsTotal: number };
  splitLabel?: string;
}

export async function recordPayment(orderId: string, payload: RecordPaymentPayload) {
  const { data } = await api.post<{ payment: PaymentDTO; order: OrderDTO; closed: boolean }>(
    `/api/orders/${orderId}/payments`,
    payload
  );
  return data;
}

export async function requestDiscount(orderId: string, input: { discountType: "PERCENT" | "FIXED"; value: number; reason?: string }) {
  const { data } = await api.post("/api/approvals", {
    type: "DISCOUNT",
    entityType: "Order",
    entityId: orderId,
    reason: input.reason,
    payload: { discountType: input.discountType, value: input.value },
  });
  return data;
}

export async function searchCustomers(search: string) {
  const { data } = await api.get<CustomerDTO[]>("/api/customers", { params: { search } });
  return data;
}

export async function createCustomer(input: { name: string; phone?: string; email?: string }) {
  const { data } = await api.post<CustomerDTO>("/api/customers", input);
  return data;
}

export async function attachCustomerToOrder(orderId: string, customerId: string | null) {
  const { data } = await api.patch<OrderDTO>(`/api/orders/${orderId}/customer`, { customerId });
  return data;
}
