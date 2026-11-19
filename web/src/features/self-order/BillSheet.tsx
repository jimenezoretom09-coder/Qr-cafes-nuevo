import { useState } from "react";
import { formatCOP } from "@rms/shared";

type Scope = "ALL" | "MINE";
type Hint = "CASH" | "CARD" | "TRANSFER";

/**
 * Pedir la cuenta: de toda la mesa o solo lo mio, como piensa pagar (orientativo para caja) y
 * si incluye la propina voluntaria sugerida. En Colombia la propina es voluntaria y hay que
 * preguntarla: aqui el cliente la decide sin tener que decirsela en voz alta al mesero.
 */
export default function BillSheet({
  sending,
  tipSuggestionPercent,
  amounts,
  onCancel,
  onSend,
}: {
  sending: boolean;
  tipSuggestionPercent: number;
  amounts: { mine: number; table: number } | null;
  onCancel: () => void;
  onSend: (scope: Scope, hint: Hint, tipPercent: number | undefined) => void;
}) {
  const [scope, setScope] = useState<Scope>("ALL");
  const [hint, setHint] = useState<Hint>("CASH");
  const askTip = tipSuggestionPercent > 0;
  const [tip, setTip] = useState<number>(tipSuggestionPercent);
  const base = amounts ? (scope === "ALL" ? amounts.table : amounts.mine) : null;

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

        {askTip && (
          <>
            <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-epi-ink-variant">
              Propina voluntaria
            </p>
            <div className="mt-2 flex gap-2">
              <button className={option(tip === tipSuggestionPercent)} onClick={() => setTip(tipSuggestionPercent)}>
                Incluir {tipSuggestionPercent}%
                {base ? <span className="block text-[11px] font-normal opacity-80">{formatCOP((base * tipSuggestionPercent) / 100)}</span> : null}
              </button>
              <button className={option(tip === 0)} onClick={() => setTip(0)}>
                No incluir
              </button>
            </div>
            <p className="mt-1 text-[11px] text-epi-ink-variant">
              Es 100% para el equipo. Puedes cambiarla o quitarla al pagar.
            </p>
          </>
        )}

        {base !== null && (
          <p className="mt-4 text-center text-sm text-epi-ink">
            Total aproximado:{" "}
            <strong>{formatCOP(base + (askTip ? (base * tip) / 100 : 0))}</strong>
          </p>
        )}

        <div className="mt-5 flex gap-2">
          <button onClick={onCancel} className="rounded-lg bg-epi-surface-low px-4 py-3 text-sm font-semibold text-epi-ink">
            Cancelar
          </button>
          <button
            disabled={sending}
            onClick={() => onSend(scope, hint, askTip ? tip : undefined)}
            className="flex-1 rounded-lg bg-epi-ink py-3 text-sm font-semibold uppercase tracking-wide text-white disabled:opacity-50"
          >
            {sending ? "Enviando…" : "Pedir la cuenta"}
          </button>
        </div>
      </div>
    </div>
  );
}
