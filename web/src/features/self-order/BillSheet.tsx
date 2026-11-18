import { useState } from "react";

type Scope = "ALL" | "MINE";
type Hint = "CASH" | "CARD" | "TRANSFER";

/** Pedir la cuenta: de toda la mesa o solo lo mio, y como piensa pagar (orientativo para caja). */
export default function BillSheet({
  sending,
  onCancel,
  onSend,
}: {
  sending: boolean;
  onCancel: () => void;
  onSend: (scope: Scope, hint: Hint) => void;
}) {
  const [scope, setScope] = useState<Scope>("ALL");
  const [hint, setHint] = useState<Hint>("CASH");

  const option = (active: boolean) =>
    `flex-1 rounded-lg border px-3 py-3 text-sm font-semibold transition ${
      active ? "border-epi-ink bg-epi-ink text-white" : "border-epi-outline-variant text-epi-ink"
    }`;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={onCancel}>
      <div className="animate-pop w-full max-w-md rounded-t-2xl bg-epi-surface p-5 font-body" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-xl font-bold text-epi-ink">Pedir la cuenta</h2>

        <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-epi-ink-variant">¿Qué cuenta?</p>
        <div className="mt-2 flex gap-2">
          <button className={option(scope === "ALL")} onClick={() => setScope("ALL")}>Toda la mesa</button>
          <button className={option(scope === "MINE")} onClick={() => setScope("MINE")}>Solo lo mío</button>
        </div>

        <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-epi-ink-variant">¿Cómo vas a pagar?</p>
        <div className="mt-2 flex gap-2">
          <button className={option(hint === "CASH")} onClick={() => setHint("CASH")}>💵 Efectivo</button>
          <button className={option(hint === "CARD")} onClick={() => setHint("CARD")}>💳 Tarjeta</button>
          <button className={option(hint === "TRANSFER")} onClick={() => setHint("TRANSFER")}>📲 Transfer.</button>
        </div>

        <div className="mt-5 flex gap-2">
          <button onClick={onCancel} className="rounded-lg bg-epi-surface-low px-4 py-3 text-sm font-semibold text-epi-ink">
            Cancelar
          </button>
          <button
            disabled={sending}
            onClick={() => onSend(scope, hint)}
            className="flex-1 rounded-lg bg-epi-ink py-3 text-sm font-semibold uppercase tracking-wide text-white disabled:opacity-50"
          >
            {sending ? "Enviando…" : "Pedir la cuenta"}
          </button>
        </div>
      </div>
    </div>
  );
}
