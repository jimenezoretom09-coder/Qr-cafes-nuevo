export const PERMISSIONS = {
  MENU_MANAGE: "menu:manage",
  MENU_TOGGLE_AVAILABILITY: "menu:toggle_availability",
  USERS_MANAGE: "users:manage",
  TABLES_MANAGE: "tables:manage",
  ORDERS_CREATE: "orders:create",
  ORDERS_VIEW_OWN: "orders:view_own",
  ORDERS_VIEW_ALL: "orders:view_all",
  KDS_MANAGE: "kds:manage",
  CASH_MANAGE: "cash:manage",
  INVENTORY_MANAGE: "inventory:manage",
  REPORTS_VIEW: "reports:view",
  AUDIT_VIEW: "audit:view",
  SYSTEM_CONFIG: "system:config",
  DISCOUNTS_APPROVE: "discounts:approve",
  VOID_APPROVE: "void:approve",
  REFUNDS_APPROVE: "refunds:approve",
  CUSTOMERS_MANAGE: "customers:manage",
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ROLE_NAMES = {
  ADMIN: "ADMIN",
  MANAGER: "MANAGER",
  WAITER: "WAITER",
  KITCHEN: "KITCHEN",
  CASHIER: "CASHIER",
  BAR: "BAR",
} as const;

export type RoleName = (typeof ROLE_NAMES)[keyof typeof ROLE_NAMES];

/** Default permission grants seeded per system role. Admin can later customize per-role in DB. */
export const DEFAULT_ROLE_PERMISSIONS: Record<RoleName, PermissionKey[]> = {
  ADMIN: Object.values(PERMISSIONS),
  MANAGER: [
    PERMISSIONS.ORDERS_VIEW_ALL,
    PERMISSIONS.TABLES_MANAGE,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.AUDIT_VIEW,
    PERMISSIONS.DISCOUNTS_APPROVE,
    PERMISSIONS.VOID_APPROVE,
    PERMISSIONS.REFUNDS_APPROVE,
    PERMISSIONS.MENU_TOGGLE_AVAILABILITY,
    PERMISSIONS.CUSTOMERS_MANAGE,
  ],
  WAITER: [
    PERMISSIONS.ORDERS_CREATE,
    PERMISSIONS.ORDERS_VIEW_OWN,
    PERMISSIONS.TABLES_MANAGE,
  ],
  KITCHEN: [PERMISSIONS.KDS_MANAGE, PERMISSIONS.MENU_TOGGLE_AVAILABILITY],
  BAR: [PERMISSIONS.KDS_MANAGE, PERMISSIONS.MENU_TOGGLE_AVAILABILITY],
  CASHIER: [PERMISSIONS.CASH_MANAGE, PERMISSIONS.ORDERS_VIEW_ALL, PERMISSIONS.CUSTOMERS_MANAGE],
};
