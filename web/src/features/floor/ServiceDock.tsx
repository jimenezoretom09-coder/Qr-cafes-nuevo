import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ServiceRequestDTO, TicketAction, TicketDTO } from "@rms/shared";
import { getErrorMessage } from "../../lib/api";
import { useSocketEvent } from "../../lib/use-socket-event";
import { armarSonido, playAlerta } from "../../lib/sound";
import { fetchFloorTickets, ticketAction } from "../kds/api";
import { attendServiceRequest, fetchServiceRequests } from "./api";

const HINT_LABEL: Record<string, string> = { CASH: "💵 Efectivo", CARD: "💳 Tarjeta", TRANSFER: "📲 Transferencia" };

function minutesAgo(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  return m < 1 ? "ahora" : `hace ${m} min`;
}

function RequestCard({ r, busy, onAttend }: { r: ServiceRequestDTO; busy: boolean; onAttend: () => void }) {
  const isBill = r.type === "BILL";
  return (
    <div className={`rounded-xl border-2 p-3 ${isBill ? "border-violet-300 bg-violet-50" : "border-amber-300 bg-amber-50"}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-lg font-extrabold text-slate-900">
            {isBill ? "🧾" : "🙋"} Mesa {r.tableLabel}
          </p>
          <p className="text-sm font-semibold text-slate-700">
            {isBill
              ? r.billScope === "MINE"
                ? `Cuenta solo de ${r.dinerName ?? "un comensal"}`
                : "Cuenta de toda la mesa"
              : `Llama al mesero${r.dinerName ? ` · ${r.dinerName}` : ""}`}
          </p>
          {isBill && r.paymentHint && <p className="text-sm text-slate-600">{HINT_LABEL[r.paymentHint]}</p>}
        </div>
        <span className="shrink-0 text-xs font-semibold text-slate-500">{minutesAgo(r.createdAt)}</span>
      </div>
      <button
        disabled={busy}
        onClick={onAttend}
        className="mt-3 w-full rounded-lg bg-slate-900 py-2 text-sm font-bold text-white active:scale-95"
      >
        ✓ Atendido
      </button>
    </div>
  );
}

function DeliveryCard({ t, busy, onAction }: { t: TicketDTO; busy: boolean; onAction: (a: TicketAction) => void }) {
  const live = t.items.filter((i) => i.status !== "CANCELLED");
  const groups = new Map<string, typeof live>();
  for (const i of live) {
    const who = i.dinerName ?? t.waiterName;
    groups.set(who, [...(groups.get(who) ?? []), i]);
  }
  return (
    <div className="rounded-xl border-2 border-emerald-300 bg-emerald-50 p-3">
      <div className="flex items-center justify-between">
        <p className="text-lg font-extrabold text-slate-900">🍽 Mesa {t.tableLabel}</p>
        <span className="text-sm font-bold text-slate-500">#{t.number}</span>
      </div>
      <div className="mt-1 space-y-1">
        {[...groups.entries()].map(([who, list]) => (
          <p key={who} className="text-sm text-slate-700">
            <span className="font-bold text-blue-700">{who}:</span> {list.map((i) => `${i.quantity}× ${i.name}`).join(", ")}
          </p>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        {t.status === "READY" && (
          <button disabled={busy} onClick={() => onAction("pickup")} className="flex-1 rounded-lg bg-white py-2 text-sm font-bold text-emerald-800 ring-1 ring-emerald-300">
            🚶 Llevando
          </button>
        )}
        <button disabled={busy} onClick={() => onAction("deliver")} className="flex-1 rounded-lg bg-emerald-600 py-2 text-sm font-bold text-white active:scale-95">
          ✓ Entregado
        </button>
      </div>
    </div>
  );
}

/**
 * Boton flotante con todo lo que piden las mesas: llamados al mesero, cuentas pedidas y
 * pedidos listos para llevar. Mesero y dueño ven todo; caja solo las cuentas.
 */
export default function ServiceDock({ mode }: { mode: "waiter" | "cashier" | "owner" }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const showDeliveries = mode !== "cashier";

  useEffect(() => {
    armarSonido();
  }, []);

  const { data: requests = [] } = useQuery({
    queryKey: ["service-requests"],
    queryFn: fetchServiceRequests,
    refetchInterval: 20_000,
  });
  const { data: deliveries = [] } = useQuery({
    queryKey: ["floor-tickets"],
    queryFn: fetchFloorTickets,
    refetchInterval: 20_000,
    enabled: showDeliveries,
  });

  useSocketEvent("service:requested", (r) => {
    queryClient.invalidateQueries({ queryKey: ["service-requests"] });
    if (mode !== "cashier" || r.type === "BILL") playAlerta(2, 990);
  });
  useSocketEvent("service:updated", () => {
    queryClient.invalidateQueries({ queryKey: ["service-requests"] });
  });
  useSocketEvent("ticket:updated", () => {
    if (showDeliveries) queryClient.invalidateQueries({ queryKey: ["floor-tickets"] });
  });

  const mutation = useMutation({
    mutationFn: async (v: { kind: "attend"; id: string } | { kind: "ticket"; id: string; action: TicketAction }) => {
      if (v.kind === "attend") await attendServiceRequest(v.id);
      else await ticketAction(v.id, v.action);
    },
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["service-requests"] });
      queryClient.invalidateQueries({ queryKey: ["floor-tickets"] });
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const visibleRequests = mode === "cashier" ? requests.filter((r) => r.type === "BILL") : requests;
  const visibleDeliveries = showDeliveries ? deliveries : [];
  const total = visibleRequests.length + visibleDeliveries.length;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Llamados y entregas"
        className={`fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full px-4 py-3 font-bold text-white shadow-xl transition active:scale-95 ${
          total > 0 ? "animate-pulse bg-red-600" : "bg-slate-800"
        }`}
      >
        🔔 <span>{total > 0 ? total : "Mesas"}</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center" onClick={() => setOpen(false)}>
          <div
            className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-4 sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xl font-extrabold text-slate-900">Lo que piden las mesas</h2>
              <button onClick={() => setOpen(false)} className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-bold">
                Cerrar
              </button>
            </div>
            {error && <p className="mb-3 rounded bg-red-50 p-2 text-sm font-semibold text-red-700">{error}</p>}

            {visibleRequests.length > 0 && (
              <section className="mb-4 space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Llamados</h3>
                {visibleRequests.map((r) => (
                  <RequestCard key={r.id} r={r} busy={mutation.isPending} onAttend={() => mutation.mutate({ kind: "attend", id: r.id })} />
                ))}
              </section>
            )}

            {visibleDeliveries.length > 0 && (
              <section className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Para llevar a la mesa</h3>
                {visibleDeliveries.map((t) => (
                  <DeliveryCard key={t.id} t={t} busy={mutation.isPending} onAction={(a) => mutation.mutate({ kind: "ticket", id: t.id, action: a })} />
                ))}
              </section>
            )}

            {total === 0 && <p className="py-8 text-center text-slate-400">Todo tranquilo: ninguna mesa está esperando.</p>}
          </div>
        </div>
      )}
    </>
  );
}
