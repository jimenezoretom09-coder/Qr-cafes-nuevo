import { formatCOP, TICKET_STATUS_FLOW, TICKET_STATUS_LABELS, type TicketStatus } from "@rms/shared";
import type { PublicTableStatus, PublicTicket } from "./api";

const STEP_TIME_FIELD: Record<Exclude<TicketStatus, "REJECTED">, keyof PublicTicket> = {
  SENT: "sentAt",
  SEEN: "seenAt",
  CONFIRMED: "confirmedAt",
  PREPARING: "startedAt",
  READY: "readyAt",
  ON_THE_WAY: "pickedUpAt",
  DELIVERED: "deliveredAt",
};

function hhmm(iso: string | null | unknown) {
  if (typeof iso !== "string") return "";
  return new Date(iso).toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit" });
}

function headline(t: PublicTicket): string {
  const ahead = t.queuePosition ? t.queuePosition - 1 : 0;
  const fila = ahead === 0 ? "Eres el siguiente en la fila." : `Hay ${ahead} pedido${ahead === 1 ? "" : "s"} antes que el tuyo.`;
  switch (t.status) {
    case "SENT":
      return "Tu pedido llegó. Esperando que cocina lo vea…";
    case "SEEN":
      return `Cocina ya vio tu pedido. ${fila}`;
    case "CONFIRMED":
      return `Confirmado. ${fila}`;
    case "PREPARING":
      return t.estimateMin > 0 ? `Lo están preparando · aprox. ${t.estimateMin} min` : "Lo están preparando.";
    case "READY":
      return "¡Está listo! Ya te lo llevan a la mesa.";
    case "ON_THE_WAY":
      return "El mesero va camino a tu mesa.";
    case "DELIVERED":
      return "Entregado. ¡Que lo disfrutes!";
    case "REJECTED":
      return t.rejectReason ? `No se pudo preparar: ${t.rejectReason}.` : "No se pudo preparar.";
  }
}

const STATUS_CHIP: Record<TicketStatus, string> = {
  SENT: "bg-epi-surface-container text-epi-ink",
  SEEN: "bg-sky-100 text-sky-900",
  CONFIRMED: "bg-indigo-100 text-indigo-900",
  PREPARING: "bg-amber-100 text-amber-900",
  READY: "bg-emerald-600 text-white animate-pulse",
  ON_THE_WAY: "bg-emerald-100 text-emerald-900",
  DELIVERED: "bg-epi-surface-low text-epi-ink-variant",
  REJECTED: "bg-red-100 text-red-800",
};

function Timeline({ ticket }: { ticket: PublicTicket }) {
  const currentIdx = TICKET_STATUS_FLOW.indexOf(ticket.status as Exclude<TicketStatus, "REJECTED">);
  return (
    <ol className="mt-4 space-y-0">
      {TICKET_STATUS_FLOW.map((step, idx) => {
        const done = idx < currentIdx;
        const current = idx === currentIdx;
        const time = ticket[STEP_TIME_FIELD[step as Exclude<TicketStatus, "REJECTED">]];
        return (
          <li key={step} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
                  done
                    ? "bg-epi-ink text-white"
                    : current
                    ? "bg-epi-gold text-white ring-4 ring-epi-gold/25"
                    : "border-2 border-epi-outline-variant bg-epi-surface text-epi-outline-variant"
                }`}
              >
                {done ? "✓" : idx + 1}
              </span>
              {idx < TICKET_STATUS_FLOW.length - 1 && (
                <span className={`my-0.5 w-0.5 flex-1 ${done ? "bg-epi-ink" : "bg-epi-outline-variant/60"}`} style={{ minHeight: 14 }} />
              )}
            </div>
            <div className="flex flex-1 items-start justify-between pb-2">
              <span
                className={`text-sm ${
                  current ? "font-bold text-epi-ink" : done ? "text-epi-ink" : "text-epi-ink-variant/70"
                }`}
              >
                {TICKET_STATUS_LABELS[step]}
              </span>
              {(done || current) && <span className="text-xs text-epi-ink-variant">{hhmm(time)}</span>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function TicketCard({ ticket, expanded }: { ticket: PublicTicket; expanded: boolean }) {
  const byDiner = new Map<string, PublicTicket["items"]>();
  for (const item of ticket.items) {
    const key = item.mine ? "__mine" : item.dinerName ?? "Con el mesero";
    byDiner.set(key, [...(byDiner.get(key) ?? []), item]);
  }
  const groups = [...byDiner.entries()].sort(([a], [b]) => (a === "__mine" ? -1 : b === "__mine" ? 1 : 0));

  return (
    <article className="rounded-xl border border-epi-outline-variant/50 bg-epi-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-display text-lg font-bold text-epi-ink">Pedido #{ticket.number}</h3>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${STATUS_CHIP[ticket.status]}`}>
          {TICKET_STATUS_LABELS[ticket.status]}
        </span>
      </div>
      <p className="mt-1 text-sm text-epi-ink-variant">{headline(ticket)}</p>

      {expanded && ticket.status !== "REJECTED" && <Timeline ticket={ticket} />}

      <div className="mt-3 space-y-2 border-t border-epi-outline-variant/40 pt-3">
        {groups.map(([who, items]) => (
          <div key={who}>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-epi-gold">
              {who === "__mine" ? "Lo tuyo" : who}
            </p>
            {items.map((i) => (
              <div key={i.id} className="flex items-start justify-between gap-2 text-sm">
                <div className={i.cancelled ? "text-epi-ink-variant line-through" : "text-epi-ink"}>
                  {i.quantity}× {i.name}
                  {i.modifiers.length > 0 && (
                    <span className="block text-xs text-epi-ink-variant no-underline">+ {i.modifiers.join(", ")}</span>
                  )}
                </div>
                {i.cancelled ? (
                  <span className="shrink-0 rounded bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">
                    {i.cancelReason ?? "Cancelado"}
                  </span>
                ) : (
                  <span className="shrink-0 text-xs text-epi-ink-variant">{formatCOP(i.lineTotal)}</span>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </article>
  );
}

export default function TicketTracker({
  status,
  onRequestBill,
  onOrderMore,
}: {
  status: PublicTableStatus | null;
  onRequestBill: () => void;
  onOrderMore: () => void;
}) {
  if (!status) return <p className="mt-8 text-center text-sm text-epi-ink-variant">Cargando tu pedido…</p>;

  if (status.tickets.length === 0) {
    return (
      <div className="mt-10 text-center">
        <p className="font-display text-xl font-bold text-epi-ink">Aún no has pedido nada</p>
        <p className="mt-2 text-sm text-epi-ink-variant">Cuando envíes tu pedido, aquí verás cada paso en tiempo real.</p>
        <button onClick={onOrderMore} className="mt-6 rounded-lg bg-epi-ink px-6 py-3 text-sm font-semibold uppercase text-white">
          Ver la carta
        </button>
      </div>
    );
  }

  // La primera comanda que siga en curso va abierta con su linea de tiempo; las demas, resumidas.
  const firstOpen = status.tickets.find((t) => t.status !== "DELIVERED" && t.status !== "REJECTED")?.id;

  return (
    <div className="space-y-3">
      {status.tickets.map((t) => (
        <TicketCard key={t.id} ticket={t} expanded={t.id === firstOpen} />
      ))}

      {status.bill && (
        <section className="rounded-xl border border-epi-outline-variant/50 bg-epi-surface p-4">
          <h3 className="font-display text-lg font-bold text-epi-ink">La cuenta</h3>
          <div className="mt-2 space-y-1 text-sm">
            {status.bill.byDiner.map((d) => (
              <div key={d.name} className="flex justify-between text-epi-ink-variant">
                <span>{d.name}</span>
                <span>{formatCOP(d.amount)}</span>
              </div>
            ))}
            {status.bill.discount > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Descuento</span>
                <span>−{formatCOP(status.bill.discount)}</span>
              </div>
            )}
          </div>
          <div className="mt-3 flex items-end justify-between border-t border-epi-outline-variant/40 pt-3">
            <div>
              <p className="text-xs text-epi-ink-variant">Lo tuyo</p>
              <p className="font-display text-xl font-bold text-epi-ink">{formatCOP(status.bill.mine)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-epi-ink-variant">Toda la mesa</p>
              <p className="font-display text-xl font-bold text-epi-gold">{formatCOP(status.bill.table)}</p>
            </div>
          </div>
          <button
            onClick={onRequestBill}
            className="mt-4 w-full rounded-lg border border-epi-ink py-3 text-sm font-semibold uppercase tracking-wide text-epi-ink"
          >
            🧾 Pedir la cuenta
          </button>
          <p className="mt-2 text-center text-xs text-epi-ink-variant">Pagas en caja o con el mesero.</p>
        </section>
      )}

      <button onClick={onOrderMore} className="w-full rounded-lg bg-epi-ink py-3 text-sm font-semibold uppercase tracking-wide text-white">
        Pedir algo más
      </button>
    </div>
  );
}
