import { Link } from "react-router-dom";
import { PERMISSIONS } from "@rms/shared";
import { useAuthStore } from "../../lib/auth-store";
import KdsBoard from "./KdsBoard";

export default function KdsHome() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const canUseAdmin =
    user?.permissions.includes(PERMISSIONS.MENU_MANAGE) ||
    user?.permissions.includes(PERMISSIONS.USERS_MANAGE) ||
    false;

  return (
    <div className="flex h-screen flex-col bg-slate-100">
      <header className="flex flex-wrap items-center justify-between gap-2 bg-slate-900 px-4 py-3 sm:px-6">
        <h1 className="text-lg font-bold text-white sm:text-xl">
          <span className="sm:hidden">Cocina</span>
          <span className="hidden sm:inline">Cocina — Pantalla de pedidos</span>
        </h1>
        <div className="flex items-center gap-2 sm:gap-4">
          <span className="hidden text-slate-300 sm:inline">{user?.name}</span>
          {canUseAdmin && (
            <Link to="/admin" className="rounded-lg bg-slate-700 px-3 py-1.5 text-sm font-semibold text-white">
              Panel Admin
            </Link>
          )}
          <button onClick={logout} className="rounded-lg bg-slate-700 px-3 py-1.5 text-sm font-semibold text-white">
            Salir
          </button>
        </div>
      </header>
      <div className="flex-1 overflow-hidden">
        <KdsBoard />
      </div>
    </div>
  );
}
