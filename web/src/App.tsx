import { Navigate, Route, Routes } from "react-router-dom";
import { useAuthStore } from "./lib/auth-store";
import { PERMISSIONS, ROLE_NAMES, type RoleName } from "@rms/shared";
import PinLoginScreen from "./features/auth/PinLoginScreen";
import ProtectedRoute from "./features/auth/ProtectedRoute";
import WaiterHome from "./features/waiter/WaiterHome";
import KdsHome from "./features/kds/KdsHome";
import AdminHome from "./features/admin/AdminHome";
import CashierHome from "./features/cashier/CashierHome";
import SelfOrderScreen from "./features/self-order/SelfOrderScreen";

// Roles rarely have a single clean permission (e.g. ADMIN holds every permission,
// including ORDERS_CREATE), so route by role identity rather than sniffing permissions.
const LANDING_ROUTE_BY_ROLE: Record<RoleName, string> = {
  [ROLE_NAMES.ADMIN]: "/admin",
  [ROLE_NAMES.MANAGER]: "/admin",
  [ROLE_NAMES.WAITER]: "/waiter",
  [ROLE_NAMES.KITCHEN]: "/kds",
  [ROLE_NAMES.BAR]: "/kds",
  [ROLE_NAMES.CASHIER]: "/cashier",
};

function landingRouteFor(roleName: string): string {
  return LANDING_ROUTE_BY_ROLE[roleName as RoleName] ?? "/";
}

export default function App() {
  const user = useAuthStore((s) => s.user);

  return (
    <Routes>
      <Route path="/pedir/:tableLabel" element={<SelfOrderScreen />} />
      <Route
        path="/"
        element={user ? <Navigate to={landingRouteFor(user.roleName)} replace /> : <PinLoginScreen />}
      />
      <Route
        path="/waiter/*"
        element={
          <ProtectedRoute permission={PERMISSIONS.ORDERS_CREATE}>
            <WaiterHome />
          </ProtectedRoute>
        }
      />
      <Route
        path="/kds"
        element={
          <ProtectedRoute permission={PERMISSIONS.KDS_MANAGE}>
            <KdsHome />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute
            permission={[PERMISSIONS.MENU_MANAGE, PERMISSIONS.USERS_MANAGE, PERMISSIONS.REPORTS_VIEW]}
          >
            <AdminHome />
          </ProtectedRoute>
        }
      />
      <Route
        path="/cashier/*"
        element={
          <ProtectedRoute permission={PERMISSIONS.CASH_MANAGE}>
            <CashierHome />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
