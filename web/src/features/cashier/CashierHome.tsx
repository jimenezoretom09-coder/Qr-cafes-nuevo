import { useState } from "react";
import { Link, NavLink, Route, Routes } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatCOP, PERMISSIONS } from "@rms/shared";
import { fetchCurrentSession } from "./api";
import { useAuthStore } from "../../lib/auth-store";
import { useSocketEvent } from "../../lib/use-socket-event";
import OpenSessionScreen from "./OpenSessionScreen";
import CheckoutScreen from "./CheckoutScreen";
import PaymentScreen from "./PaymentScreen";
import TransactionHistory from "./TransactionHistory";
import CloseSessionModal from "./CloseSessionModal";

export default function CashierHome() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const queryClient = useQueryClient();
  const [showCloseModal, setShowCloseModal] = useState(false);
  const canUseAdmin =
    user?.permissions.includes(PERMISSIONS.MENU_MANAGE) ||
    user?.permissions.includes(PERMISSIONS.USERS_MANAGE) ||
    false;

  const { data: session, isLoading } = useQuery({
    queryKey: ["cash-session", "current"],
    queryFn: fetchCurrentSession,
  });

  useSocketEvent("cash:session_opened", () => {
    queryClient.invalidateQueries({ queryKey: ["cash-session", "current"] });
  });
  useSocketEvent("cash:session_closed", () => {
    queryClient.invalidateQueries({ queryKey: ["cash-session", "current"] });
  });

  if (isLoading) return <div className="p-6 text-slate-400">Cargando...</div>;
  if (!session) return <OpenSessionScreen />;

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      <header className="flex flex-wrap items-center justify-between gap-2 bg-white px-4 py-3 shadow-sm sm:px-6">
        <div className="flex items-center gap-3 sm:gap-6">
          <h1 className="text-lg font-bold text-slate-800">Caja</h1>
          <nav className="flex gap-1">
            <NavLink
              to=""
              end
              className={({ isActive }) =>
                `rounded-lg px-3 py-1.5 text-sm font-semibold ${isActive ? "bg-blue-600 text-white" : "text-slate-500"}`
              }
            >
              Cobrar
            </NavLink>
            <NavLink
              to="historial"
              className={({ isActive }) =>
                `rounded-lg px-3 py-1.5 text-sm font-semibold ${isActive ? "bg-blue-600 text-white" : "text-slate-500"}`
              }
            >
              Historial
            </NavLink>
          </nav>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <span className="hidden text-sm text-slate-500 md:inline">
            {user?.name} · Apertura {formatCOP(session.openingAmount)}
          </span>
          <button
            onClick={() => setShowCloseModal(true)}
            className="rounded-lg bg-red-100 px-3 py-1.5 text-sm font-semibold text-red-700"
          >
            Cerrar caja
          </button>
          {canUseAdmin && (
            <Link to="/admin" className="rounded-lg bg-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700">
              Panel Admin
            </Link>
          )}
          <button onClick={logout} className="rounded-lg bg-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700">
            Salir
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <Routes>
          <Route index element={<CheckoutScreen />} />
          <Route path="order/:orderId" element={<PaymentScreen />} />
          <Route path="historial" element={<TransactionHistory sessionId={session.id} />} />
        </Routes>
      </div>

      {showCloseModal && <CloseSessionModal session={session} onClose={() => setShowCloseModal(false)} />}
    </div>
  );
}
