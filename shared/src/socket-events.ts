import type {
  ApprovalRequestDTO,
  CashSessionDTO,
  OrderItemDTO,
  OrderItemStatus,
  OrderTotalsDTO,
  PaymentDTO,
  TableStatus,
} from "./types.js";

/** Room helpers — keep naming consistent between server emitters and client subscribers. */
export const rooms = {
  station: (stationId: string) => `station:${stationId}`,
  waiter: (userId: string) => `waiter:${userId}`,
  role: (roleName: string) => `role:${roleName}`,
  global: () => "restaurant:global",
};

export interface OrderItemCreatedPayload {
  orderId: string;
  tableLabel: string;
  item: OrderItemDTO;
}

export interface OrderItemStatusChangedPayload {
  orderId: string;
  itemId: string;
  status: OrderItemStatus;
  tableLabel: string;
  itemName: string;
}

export interface OrderItemDelayedPayload {
  orderId: string;
  itemId: string;
  tableLabel: string;
  itemName: string;
  waitingMinutes: number;
}

export interface MenuItemAvailabilityPayload {
  menuItemId: string;
  available: boolean;
}

export interface TableStatusChangedPayload {
  tableId: string;
  status: TableStatus;
}

export interface OrderPaymentRecordedPayload {
  orderId: string;
  totals: OrderTotalsDTO;
  payment: PaymentDTO;
}

/** Discriminated event map shared by server (emit) and client (on) — keeps names/payloads in sync. */
export interface ServerToClientEvents {
  "order:item_created": (payload: OrderItemCreatedPayload) => void;
  "order:item_status_changed": (payload: OrderItemStatusChangedPayload) => void;
  "order:item_delayed": (payload: OrderItemDelayedPayload) => void;
  "menu:item_availability_changed": (payload: MenuItemAvailabilityPayload) => void;
  "table:status_changed": (payload: TableStatusChangedPayload) => void;
  "alert:order_delayed": (payload: OrderItemDelayedPayload) => void;
  "order:payment_recorded": (payload: OrderPaymentRecordedPayload) => void;
  "cash:session_opened": (payload: CashSessionDTO) => void;
  "cash:session_closed": (payload: CashSessionDTO) => void;
  "approval:requested": (payload: ApprovalRequestDTO) => void;
  "approval:decided": (payload: ApprovalRequestDTO) => void;
}

export interface ClientToServerEvents {
  "subscribe:station": (stationId: string) => void;
}
