import { Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { fetchMyOrders, fetchTables, setTableStatus } from "./api";
import { useAuthStore } from "../../lib/auth-store";
import { useSocketEvent } from "../../lib/use-socket-event";
import OrderStatusPanel from "./OrderStatusPanel";
import { PERMISSIONS, type TableDTO } from "@rms/shared";

const STATUS_STYLES: Record<TableDTO["status"], string> = {
  FREE: "bg-emerald-100 border-emerald-400 text-emerald-800",
  OCCUPIED: "bg-amber-100 border-amber-400 text-amber-800",
  BILL_REQUESTED: "bg-red-100 border-red-400 text-red-800",
  RESERVED: "bg-slate-200 border-slate-400 text-slate-700",
};

const STATUS_LABELS: Record<TableDTO["status"], string> = {
  FREE: "Libre",
  OCCUPIED: "Ocupada",
  BILL_REQUESTED: "Cuenta pedida",
  RESERVED: "Reservada",
};

// El salon se diseño sobre un lienzo de 640 de ancho; en pantallas mas
// angostas (celular) se encoge todo el lienzo en conjunto para que quepa sin
// recortar ni encimar mesas, en vez de dejarlo desbordar con scroll
// horizontal. El alto crece solo segun cuantas mesas haya (filas de a 4).
const MAP_WIDTH = 640;
const TABLE_BOX = 112;
const ROW_MARGIN = 40;

function useMapScale() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const availableWidth = entry.contentRect.width;
      setScale(Math.min(1, availableWidth / MAP_WIDTH));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { containerRef, scale };
}

export default function TableMapScreen() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [panelOpen, setPanelOpen] = useState(false);
  const { containerRef, scale } = useMapScale();
  const canUseAdmin =
    user?.permissions.includes(PERMISSIONS.MENU_MANAGE) ||
    user?.permissions.includes(PERMISSIONS.USERS_MANAGE) ||
    false;

  const { data: tables = [] } = useQuery({ queryKey: ["tables"], queryFn: fetchTables });
  const { data: myOrders = [] } = useQuery({
    queryKey: ["orders", "mine"],
    queryFn: fetchMyOrders,
    refetchInterval: 15_000,
  });
  const kitchenStatusByTable = new Map(myOrders.map((o) => [o.tableId, o.status]));
  const mapHeight =
    tables.length > 0 ? Math.max(...tables.map((t) => t.posY)) + TABLE_BOX + ROW_MARGIN : ROW_MARGIN * 2;

  useSocketEvent("table:status_changed", () => {
    queryClient.invalidateQueries({ queryKey: ["tables"] });
  });
  useSocketEvent("menu:item_availability_changed", () => {
    queryClient.invalidateQueries({ queryKey: ["menu"] });
  });
  useSocketEvent("order:item_status_changed", () => {
    queryClient.invalidateQueries({ queryKey: ["orders", "mine"] });
  });

  async function handleTableClick(table: TableDTO) {
    if (table.status === "FREE") {
      await setTableStatus(table.id, "OCCUPIED");
      queryClient.invalidateQueries({ queryKey: ["tables"] });
    }
    navigate(`/waiter/table/${table.id}`);
  }

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      <header className="flex flex-col gap-3 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Mapa de mesas</h1>
          <p className="text-sm text-slate-500">{user?.name}</p>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <button
            onClick={() => setPanelOpen(true)}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 sm:flex-none"
          >
            Mis pedidos
          </button>
          {canUseAdmin && (
            <Link
              to="/admin"
              className="flex-1 rounded-lg bg-slate-200 px-4 py-2 text-center font-semibold text-slate-700 sm:flex-none"
            >
              Panel Admin
            </Link>
          )}
          <button
            onClick={logout}
            className="flex-1 rounded-lg bg-slate-200 px-4 py-2 font-semibold text-slate-700 sm:flex-none"
          >
            Salir
          </button>
        </div>
      </header>

      <div ref={containerRef} className="relative flex-1 overflow-auto p-4 sm:p-8">
        <div
          className="relative mx-auto"
          style={{ width: MAP_WIDTH * scale, height: mapHeight * scale }}
        >
          <div style={{ width: MAP_WIDTH, height: mapHeight, transform: `scale(${scale})`, transformOrigin: "top left" }}>
            {tables.map((table) => {
              const kitchenStatus = kitchenStatusByTable.get(table.id);
              return (
                <button
                  key={table.id}
                  onClick={() => handleTableClick(table)}
                  style={{ left: table.posX, top: table.posY }}
                  className={`absolute flex h-28 w-28 flex-col items-center justify-center rounded-2xl border-2 shadow-sm transition active:scale-95 ${STATUS_STYLES[table.status]}`}
                >
                  {kitchenStatus === "IN_PROGRESS" && (
                    <span className="absolute -top-2 -right-2 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white shadow">
                      Preparando
                    </span>
                  )}
                  {kitchenStatus === "READY" && (
                    <span className="absolute -top-2 -right-2 animate-pulse rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white shadow">
                      ¡Listo!
                    </span>
                  )}
                  <span className="text-2xl font-bold">{table.label}</span>
                  <span className="text-xs">{table.capacity} personas</span>
                  <span className="text-xs font-medium mt-1">{STATUS_LABELS[table.status]}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {panelOpen && <OrderStatusPanel onClose={() => setPanelOpen(false)} />}
    </div>
  );
}
