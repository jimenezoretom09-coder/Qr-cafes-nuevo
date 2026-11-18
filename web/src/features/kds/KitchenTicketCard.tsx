import type { KitchenStationDTO, TicketAction, TicketDTO } from "@rms/shared";
import { useElapsedMinutes } from "./useElapsedMinutes";

const COURSE_LABELS: Record<string, string> = {
  STARTER: "Entrada",
  MAIN: "Fuerte",
  DESSERT: "Postre",
  DRINK: "Bebida",
};

export default function KitchenTicketCard({
  ticket,
  stations,
  stationFilter,
  isNext,
  busy,
  onAction,
  onSoldOut,
}: {
  ticket: TicketDTO;
  stations: Map<string, KitchenStationDTO>;
  stationFilter: string | null;
  isNext: boolean;
  busy: boolean;
  onAction: (action: TicketAction) => void;
  onSoldOut: (itemId: string, itemName: string) => void;
}) {
  const { label: elapsed, minutes } = useElapsedMinutes(ticket.sentAt);
  const inKitchen = ["SENT", "SEEN", "CONFIRMED", "PREPARING"].includes(ticket.status);
  const urgency = !inKitchen ? "done" : minutes > 15 ? "red" : minutes > 8 ? "amber" : "green";
  const border = { green: "border-emerald-400", amber: "border-amber-400", red: "border-red-500", done: "border-slate-300" }[urgency];
  const timer = { green: "text-emerald-600", amber: "text-amber-600", red: "text-red-600", done: "text-slate-400" }[urgency];

  // Platos agrupados por comensal: "Laura: capuchino" — asi se arma la bandeja de la mesa completa.
  const items = ticket.items.filter((i) => !stationFilter || i.stationId === stationFilter);
  const groups = new Map<string, typeof items>();
  for (const i of items) {
    const who = i.dinerName ?? ticket.waiterName;
    groups.set(who, [...(groups.get(who) ?? []), i]);
  }
  const isNew = ticket.status === "SENT" || ticket.status === "SEEN";

  return (
    <div className={`rounded-xl border-2 bg-white p-4 shadow-sm ${border} ${isNew ? "ring-4 ring-blue-200" : ""}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-slate-800 px-3 py-1 text-base font-extrabold text-white">Mesa {ticket.tableLabel}</span>
          <span className="text-sm font-bold text-slate-500">#{ticket.number}</span>
        </div>
        <span className={`font-mono text-lg font-bold ${timer}`}>{elapsed}</span>
      </div>
      {isNext && (
        <p className="mt-2 rounded bg-blue-600 px-2 py-1 text-center text-xs font-extrabold uppercase tracking-wider text-white">
          ⬆ Siguiente en salir
        </p>
      )}
      {isNew && (
        <p className="mt-2 rounded bg-blue-50 px-2 py-1 text-center text-xs font-bold text-blue-800">Nuevo · falta confirmar</p>
      )}

      <div className="mt-3 space-y-3">
        {[...groups.entries()].map(([who, list]) => (
          <div key={who}>
            <p className="text-xs font-bold uppercase tracking-wide text-blue-700">👤 {who}</p>
            <ul className="mt-1 space-y-1.5">
              {list.map((i) => {
                const cancelled = i.status === "CANCELLED";
                const station = stations.get(i.stationId);
                return (
                  <li key={i.id} className="flex items-start justify-between gap-2">
                    <div className={cancelled ? "text-slate-400 line-through" : ""}>
                      <p className="text-lg font-bold leading-tight text-slate-800">
                        {i.quantity}× {i.name}
                      </p>
                      <p className="text-[11px] font-semibold uppercase text-slate-400">
                        {COURSE_LABELS[i.course] ?? i.course}
                        {station && !stationFilter && (
                          <span className="ml-1.5 rounded px-1.5 py-0.5 text-white" style={{ backgroundColor: station.color }}>
                            {station.name}
                          </span>
                        )}
                      </p>
                      {i.modifiers.length > 0 && <p className="text-sm text-slate-600">• {i.modifiers.join(" • ")}</p>}
                      {i.notes && <p className="mt-1 rounded bg-amber-50 px-2 py-1 text-sm font-medium text-amber-800">📝 {i.notes}</p>}
                      {cancelled && <p className="text-xs font-bold text-red-600 no-underline">{i.cancelReason ?? "Cancelado"}</p>}
                    </div>
                    {!cancelled && inKitchen && (
                      <button
                        onClick={() => onSoldOut(i.id, i.name)}
                        disabled={busy}
                        className="shrink-0 rounded-lg border border-red-300 px-2 py-1 text-xs font-bold text-red-600 active:scale-95"
                      >
                        Agotado
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
        {items.length === 0 && <p className="text-sm text-slate-400">Nada de esta estación en este pedido.</p>}
      </div>

      <div className="mt-4 flex gap-2">
        {isNew && (
          <>
            <button disabled={busy} onClick={() => onAction("reject")} className="rounded-lg bg-slate-100 px-3 py-2.5 text-sm font-bold text-slate-600">
              Rechazar
            </button>
            <button disabled={busy} onClick={() => onAction("confirm")} className="flex-1 rounded-lg bg-blue-600 py-2.5 font-bold text-white active:scale-95">
              ✓ Confirmar pedido
            </button>
          </>
        )}
        {ticket.status === "CONFIRMED" && (
          <button disabled={busy} onClick={() => onAction("start")} className="flex-1 rounded-lg bg-slate-800 py-2.5 font-bold text-white active:scale-95">
            Empezar a preparar
          </button>
        )}
        {ticket.status === "PREPARING" && (
          <button disabled={busy} onClick={() => onAction("ready")} className="flex-1 rounded-lg bg-emerald-600 py-2.5 font-bold text-white active:scale-95">
            ✓ Todo listo
          </button>
        )}
        {ticket.status === "READY" && (
          <p className="flex-1 rounded-lg bg-emerald-50 py-2.5 text-center font-bold text-emerald-700">Listo · esperando al mesero</p>
        )}
        {ticket.status === "ON_THE_WAY" && (
          <p className="flex-1 rounded-lg bg-slate-50 py-2.5 text-center font-bold text-slate-500">En camino a la mesa</p>
        )}
      </div>
    </div>
  );
}
