import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatCOP } from "@rms/shared";
import { fetchOpenOrders } from "./api";
import { useSocketEvent } from "../../lib/use-socket-event";

const STATUS_LABELS: Record<string, string> = {
  OPEN: "Abierta",
  IN_PROGRESS: "En preparación",
  READY: "Lista",
  SERVED: "Servida",
};

export default function CheckoutScreen() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: orders = [] } = useQuery({ queryKey: ["orders", "open"], queryFn: fetchOpenOrders });

  useSocketEvent("order:payment_recorded", () => {
    queryClient.invalidateQueries({ queryKey: ["orders", "open"] });
  });
  useSocketEvent("table:status_changed", () => {
    queryClient.invalidateQueries({ queryKey: ["orders", "open"] });
  });
  useSocketEvent("order:item_status_changed", () => {
    queryClient.invalidateQueries({ queryKey: ["orders", "open"] });
  });

  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-bold text-slate-800">Cuentas abiertas</h1>

      {orders.length === 0 && <p className="text-slate-400">No hay cuentas pendientes de cobro.</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {orders.map((order) => (
          <button
            key={order.id}
            onClick={() => navigate(`/cashier/order/${order.id}`)}
            className="rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-blue-400 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold text-slate-800">Mesa {order.tableLabel}</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                {STATUS_LABELS[order.status] ?? order.status}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500">Mesero: {order.waiterName}</p>
            <p className="mt-3 text-2xl font-bold text-slate-900">{formatCOP(order.totals.balanceDue)}</p>
            {order.totals.balanceDue < order.totals.total && (
              <p className="text-xs text-emerald-600 font-medium">
                Ya pagado: {formatCOP(order.totals.total - order.totals.balanceDue)} de {formatCOP(order.totals.total)}
              </p>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
