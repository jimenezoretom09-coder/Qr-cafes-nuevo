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
