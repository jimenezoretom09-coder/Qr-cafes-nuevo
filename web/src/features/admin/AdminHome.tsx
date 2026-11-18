import { useState } from "react";
import { Link, Navigate, NavLink, Route, Routes } from "react-router-dom";
import { PERMISSIONS } from "@rms/shared";
import { useAuthStore } from "../../lib/auth-store";
import DashboardHome from "./DashboardHome";
import MenuManager from "./MenuManager";
import UserManager from "./UserManager";
import ApprovalQueue from "./ApprovalQueue";
import ReportsPage from "./ReportsPage";
import CustomersPage from "./CustomersPage";
import TableManager from "./TableManager";
import AssistantPage from "./AssistantPage";
import ModifiersPage from "./ModifiersPage";
import QrCodesPage from "./QrCodesPage";
import ServiceDock from "../floor/ServiceDock";

export default function AdminHome() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [mobileOpen, setMobileOpen] = useState(false);
  const canManageMenu = user?.permissions.includes(PERMISSIONS.MENU_MANAGE) ?? false;
  const canManageUsers = user?.permissions.includes(PERMISSIONS.USERS_MANAGE) ?? false;
  const canViewReports = user?.permissions.includes(PERMISSIONS.REPORTS_VIEW) ?? false;
  const canManageCustomers = user?.permissions.includes(PERMISSIONS.CUSTOMERS_MANAGE) ?? false;
  const canManageTables = user?.permissions.includes(PERMISSIONS.TABLES_MANAGE) ?? false;
  const canUseWaiter = user?.permissions.includes(PERMISSIONS.ORDERS_CREATE) ?? false;
  const canUseKds = user?.permissions.includes(PERMISSIONS.KDS_MANAGE) ?? false;
  const canUseCashier = user?.permissions.includes(PERMISSIONS.CASH_MANAGE) ?? false;
  const canApprove =
    user?.permissions.includes(PERMISSIONS.DISCOUNTS_APPROVE) ||
    user?.permissions.includes(PERMISSIONS.VOID_APPROVE) ||
    user?.permissions.includes(PERMISSIONS.REFUNDS_APPROVE) ||
    false;

  const navItems = [
    { to: "", label: "Resumen" },
    ...(canViewReports ? [{ to: "reportes", label: "Reportes" }] : []),
    ...(canApprove ? [{ to: "aprobaciones", label: "Aprobaciones" }] : []),
    ...(canManageMenu ? [{ to: "menu", label: "Menú" }] : []),
    ...(canManageTables ? [{ to: "mesas", label: "Mesas" }] : []),
    ...(canManageTables ? [{ to: "qr", label: "Códigos QR" }] : []),
    ...(canManageMenu ? [{ to: "extras", label: "Extras" }] : []),
    ...(canManageMenu ? [{ to: "asistente", label: "Asistente y marca" }] : []),
    ...(canManageUsers ? [{ to: "usuarios", label: "Usuarios" }] : []),
    ...(canManageCustomers ? [{ to: "clientes", label: "Clientes" }] : []),
  ];

  const sidebarContent = (
    <>
      <h1 className="mb-6 text-lg font-bold text-white">Administración</h1>
      <nav className="flex flex-col gap-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === ""}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `rounded-lg px-3 py-2 text-sm font-semibold ${
                isActive ? "bg-white text-slate-900" : "text-slate-300 hover:bg-slate-800"
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      {(canUseWaiter || canUseKds || canUseCashier) && (
        <div className="mt-4 border-t border-slate-700 pt-4">
          <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Otras pantallas
          </p>
          <nav className="flex flex-col gap-1">
            {canUseWaiter && (
              <Link
                to="/waiter"
                className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800"
              >
                Meseros
              </Link>
            )}
            {canUseKds && (
              <Link
                to="/kds"
                className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800"
              >
                Cocina
              </Link>
            )}
            {canUseCashier && (
              <Link
                to="/cashier"
                className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800"
              >
                Caja
              </Link>
            )}
          </nav>
        </div>
      )}

      <div className="mt-auto pt-4">
        <p className="text-sm text-slate-400">{user?.name}</p>
        <button onClick={logout} className="mt-2 w-full rounded-lg bg-slate-700 py-2 text-sm font-semibold text-white">
          Salir
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen flex-col bg-slate-100 md:flex-row">
      {/* Barra superior solo en celular/tablet angosta: boton para abrir el menu */}
      <header className="flex items-center justify-between bg-slate-900 px-4 py-3 md:hidden">
        <span className="text-lg font-bold text-white">Administración</span>
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Abrir menú"
          className="rounded-lg bg-slate-800 px-3 py-2 text-white"
        >
          ☰
        </button>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] transform flex-col bg-slate-900 p-4 transition-transform duration-200 md:static md:z-auto md:w-56 md:max-w-none md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent}
      </aside>

      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <Routes>
          <Route index element={<DashboardHome />} />
          <Route path="reportes" element={canViewReports ? <ReportsPage /> : <Navigate to=".." replace />} />
          <Route path="aprobaciones" element={canApprove ? <ApprovalQueue /> : <Navigate to=".." replace />} />
          <Route path="menu" element={canManageMenu ? <MenuManager /> : <Navigate to=".." replace />} />
          <Route path="mesas" element={canManageTables ? <TableManager /> : <Navigate to=".." replace />} />
          <Route path="qr" element={canManageTables ? <QrCodesPage /> : <Navigate to=".." replace />} />
          <Route path="extras" element={canManageMenu ? <ModifiersPage /> : <Navigate to=".." replace />} />
          <Route path="asistente" element={canManageMenu ? <AssistantPage /> : <Navigate to=".." replace />} />
          <Route path="usuarios" element={canManageUsers ? <UserManager /> : <Navigate to=".." replace />} />
          <Route path="clientes" element={canManageCustomers ? <CustomersPage /> : <Navigate to=".." replace />} />
        </Routes>
      </main>
      <ServiceDock mode="owner" />
    </div>
  );
}
