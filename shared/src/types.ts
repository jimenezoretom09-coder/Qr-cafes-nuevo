export type TableStatus = "FREE" | "OCCUPIED" | "BILL_REQUESTED" | "RESERVED";

export type OrderItemStatus =
  | "QUEUED"
  | "IN_PREPARATION"
  | "READY"
  | "SERVED"
  | "CANCELLED";

export type OrderStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "READY"
  | "SERVED"
  | "CLOSED"
  | "CANCELLED";

export type Course = "STARTER" | "MAIN" | "DESSERT" | "DRINK";

export interface KitchenStationDTO {
  id: string;
  name: string;
  color: string;
}

export interface ModifierDTO {
  id: string;
  name: string;
  priceDelta: number;
}

export interface ModifierGroupDTO {
  id: string;
  name: string;
  minSelect: number;
  maxSelect: number;
  modifiers: ModifierDTO[];
}

export interface MenuItemDTO {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  videoUrl: string | null;
  allergens: string[];
  /** Almuerzo que da derecho a una sobremesa incluida. */
  includesDrink: boolean;
  /** Bebida que puede entrar gratis con el almuerzo (mazamorra, claro, jugo del día). */
  isIncludedDrink: boolean;
  /** Contiene alcohol: sello +18 en la carta. */
  isAdult: boolean;
  price: number;
  available: boolean;
  stationId: string;
  preparationTimeEstimateMin: number;
  course: Course;
  modifierGroups: ModifierGroupDTO[];
}

export type MealPeriod = "BREAKFAST" | "LUNCH" | "ALL";

export interface MenuCategoryDTO {
  id: string;
  name: string;
  sortOrder: number;
  mealPeriod: MealPeriod;
  items: MenuItemDTO[];
}

export interface TableDTO {
  id: string;
  label: string;
  capacity: number;
  zone: string;
  posX: number;
  posY: number;
  status: TableStatus;
  activeOrderId: string | null;
  /** Codigo secreto del QR de la mesa (/m/<publicToken>). */
  publicToken: string;
}

export interface OrderItemModifierDTO {
  modifierId: string;
  name: string;
  priceDelta: number;
}

export interface OrderItemDTO {
  id: string;
  orderId: string;
  menuItemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  course: Course;
  stationId: string;
  status: OrderItemStatus;
  /** Sobremesa que entró gratis con un almuerzo: se cobra en 0. */
  isIncluded: boolean;
  notes: string | null;
  modifiers: OrderItemModifierDTO[];
  sentToKitchenAt: string;
  startedAt: string | null;
  readyAt: string | null;
  servedAt: string | null;
  paidAt: string | null;
  ticketId: string | null;
  /** Comensal que lo pidio desde su celular (null si lo tomo el mesero). */
  dinerName: string | null;
  /** "Agotado" o el motivo que escribio cocina al rechazarlo. */
  cancelReason: string | null;
}

/**
 * Estados de una comanda, en el orden en que los ve el comensal:
 * Enviado -> Recibido (cocina lo vio en pantalla) -> Confirmado -> Preparando -> Listo ->
 * En camino a tu mesa -> Entregado. REJECTED: cocina no lo puede preparar.
 */
export type TicketStatus =
  | "SENT"
  | "SEEN"
  | "CONFIRMED"
  | "PREPARING"
  | "READY"
  | "ON_THE_WAY"
  | "DELIVERED"
  | "REJECTED";

export const TICKET_STATUS_FLOW: TicketStatus[] = [
  "SENT",
  "SEEN",
  "CONFIRMED",
  "PREPARING",
  "READY",
  "ON_THE_WAY",
  "DELIVERED",
];

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  SENT: "Enviado",
  SEEN: "Recibido por cocina",
  CONFIRMED: "Confirmado",
  PREPARING: "Preparando",
  READY: "¡Listo!",
  ON_THE_WAY: "En camino a tu mesa",
  DELIVERED: "Entregado",
  REJECTED: "No disponible",
};

/** Acciones que mueven una comanda de un estado al siguiente. */
export type TicketAction = "confirm" | "start" | "ready" | "pickup" | "deliver" | "reject";

export interface TicketItemDTO {
  id: string;
  name: string;
  quantity: number;
  stationId: string;
  course: Course;
  status: OrderItemStatus;
  notes: string | null;
  modifiers: string[];
  dinerName: string | null;
  cancelReason: string | null;
}

export interface TicketDTO {
  id: string;
  number: number;
  orderId: string;
  tableId: string;
  tableLabel: string;
  waiterName: string;
  status: TicketStatus;
  rejectReason: string | null;
  /** Lugar en la fila de cocina (1 = es el siguiente). null si ya salio de cocina. */
  queuePosition: number | null;
  /** Minutos estimados: el plato mas demorado de la comanda. */
  estimateMin: number;
  items: TicketItemDTO[];
  sentAt: string;
  seenAt: string | null;
  confirmedAt: string | null;
  startedAt: string | null;
  readyAt: string | null;
  pickedUpAt: string | null;
  deliveredAt: string | null;
  rejectedAt: string | null;
}

export type ServiceRequestType = "WAITER" | "BILL";

export interface ServiceRequestDTO {
  id: string;
  tableId: string;
  tableLabel: string;
  type: ServiceRequestType;
  billScope: "ALL" | "MINE" | null;
  paymentHint: "CASH" | "CARD" | "TRANSFER" | null;
  /** Propina voluntaria que pidio incluir el cliente (0 = sin propina, null = no respondio). */
  tipPercent: number | null;
  dinerName: string | null;
  status: "PENDING" | "ATTENDED";
  createdAt: string;
  attendedAt: string | null;
}

export interface OrderTotalsDTO {
  subtotal: number;
  discountAmount: number;
  discountedSubtotal: number;
  tax: number;
  serviceCharge: number;
  total: number;
  amountPaid: number;
  balanceDue: number;
}

export interface OrderDTO {
  id: string;
  tableId: string;
  tableLabel: string;
  waiterId: string;
  waiterName: string;
  status: OrderStatus;
  discountAmount: number;
  discountReason: string | null;
  customerId: string | null;
  customerName: string | null;
  createdAt: string;
  items: OrderItemDTO[];
  totals: OrderTotalsDTO;
}

export interface CustomerDTO {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  points: number;
  visitCount: number;
  totalSpent: number;
  createdAt: string;
}

export type PaymentMethod = "CASH" | "CARD" | "DIGITAL";

export interface PaymentDTO {
  id: string;
  orderId: string;
  tableLabel: string;
  method: PaymentMethod;
  subtotalAmount: number;
  taxAmount: number;
  serviceAmount: number;
  tipAmount: number;
  amount: number;
  splitLabel: string | null;
  createdById: string;
  createdByName: string;
  cashSessionId: string;
  refunded: boolean;
  itemIds: string[];
  createdAt: string;
}

export interface CashSessionDTO {
  id: string;
  openedById: string;
  openedByName: string;
  closedById: string | null;
  closedByName: string | null;
  openingAmount: number;
  closingAmountExpected: number | null;
  closingAmountCounted: number | null;
  discrepancy: number | null;
  totalsByMethod: Record<PaymentMethod, number>;
  paymentCount: number;
  openedAt: string;
  closedAt: string | null;
}

export type ApprovalType = "DISCOUNT" | "VOID_ITEM" | "VOID_ORDER" | "REFUND";
export type ApprovalStatus = "PENDING" | "APPROVED" | "DENIED";

export interface ApprovalRequestDTO {
  id: string;
  type: ApprovalType;
  status: ApprovalStatus;
  reason: string | null;
  payload: Record<string, unknown> | null;
  entityType: string;
  entityId: string;
  requestedById: string;
  requestedByName: string;
  decidedById: string | null;
  decidedByName: string | null;
  createdAt: string;
  decidedAt: string | null;
}

export interface AuthUserDTO {
  id: string;
  name: string;
  roleId: string;
  roleName: string;
  permissions: string[];
}
