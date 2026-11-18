import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchMyOrders, markItemServed, requestBill, requestCancelItem } from "./api";
import { useSocketEvent } from "../../lib/use-socket-event";
import { getErrorMessage } from "../../lib/api";
import type { OrderItemStatus } from "@rms/shared";

const ITEM_STATUS_STYLES: Record<OrderItemStatus, string> = {
  QUEUED: "bg-slate-100 text-slate-600",
  IN_PREPARATION: "bg-amber-100 text-amber-700",
  READY: "bg-emerald-100 text-emerald-700 animate-pulse",
  SERVED: "bg-slate-50 text-slate-400 line-through",
  CANCELLED: "bg-red-50 text-red-400 line-through",
};

const ITEM_STATUS_LABELS: Record<OrderItemStatus, string> = {
  QUEUED: "En cola",
  IN_PREPARATION: "En preparación",
  READY: "¡Listo!",
  SERVED: "Servido",
  CANCELLED: "Cancelado",
};

export default function OrderStatusPanel({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const { data: orders = [] } = useQuery({
    queryKey: ["orders", "mine"],
    queryFn: fetchMyOrders,
    refetchInterval: 15_000,
  });

  useSocketEvent("order:item_status_changed", () => {
    queryClient.invalidateQueries({ queryKey: ["orders", "mine"] });
  });
  useSocketEvent("approval:decided", () => {
    queryClient.invalidateQueries({ queryKey: ["orders", "mine"] });
  });

  async function handleServed(itemId: string) {
    await markItemServed(itemId);
    queryClient.invalidateQueries({ queryKey: ["orders", "mine"] });
  }

  async function handleCancel(itemId: string) {
    try {
      const result = await requestCancelItem(itemId);
      queryClient.invalidateQueries({ queryKey: ["orders", "mine"] });
      if (result.status === "PENDING") {
        alert("Solicitud de anulación enviada. Esperando aprobación del gerente/admin.");
      }
    } catch (err) {
      alert(getErrorMessage(err));
    }
  }

  async function handleRequestBill(tableId: string) {
    await requestBill(tableId);
    queryClient.invalidateQueries({ queryKey: ["tables"] });
  }

  return (
    <div className="fixed inset-0 z-20 flex justify-end bg-black/30" onClick={onClose}>
      <div className="h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">Mis pedidos</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">
            ✕
          </button>
        </div>

        {orders.length === 0 && <p className="text-slate-400">No tienes pedidos abiertos.</p>}

        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="rounded-xl border border-slate-200 p-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="font-semibold text-slate-700">Mesa {order.tableLabel}</p>
                <button
                  onClick={() => handleRequestBill(order.tableId)}
                  className="rounded-lg bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-200"
                >
                  Pedir la cuenta
                </button>
              </div>
              <ul className="space-y-2">
                {order.items.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-slate-800">
                        {item.quantity}× {item.name}
                      </p>
                      {item.notes && <p className="text-xs text-slate-400">Nota: {item.notes}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${ITEM_STATUS_STYLES[item.status]}`}>
                        {ITEM_STATUS_LABELS[item.status]}
                      </span>
                      {item.status === "READY" && (
                        <button
                          onClick={() => handleServed(item.id)}
                          className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700"
                        >
                          Entregado
                        </button>
                      )}
                      {(item.status === "QUEUED" || item.status === "IN_PREPARATION") && (
                        <button
                          onClick={() => handleCancel(item.id)}
                          className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500 hover:bg-red-100 hover:text-red-600"
                        >
                          Cancelar
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
