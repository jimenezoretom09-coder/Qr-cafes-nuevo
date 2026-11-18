import { useElapsedMinutes } from "./useElapsedMinutes";
import type { StationQueueItem } from "./api";

const COURSE_LABELS: Record<string, string> = {
  STARTER: "Entrada",
  MAIN: "Fuerte",
  DESSERT: "Postre",
  DRINK: "Bebida",
};

export default function OrderTicketCard({
  item,
  delayed,
  onAdvance,
}: {
  item: StationQueueItem;
  delayed: boolean;
  onAdvance: (nextStatus: "IN_PREPARATION" | "READY") => void;
}) {
  const { label: elapsedLabel, minutes } = useElapsedMinutes(item.sentToKitchenAt);

  const urgency = delayed || minutes > 12 ? "red" : minutes > 5 ? "amber" : "green";
  const borderColor = { green: "border-emerald-400", amber: "border-amber-400", red: "border-red-500" }[urgency];
  const timerColor = { green: "text-emerald-600", amber: "text-amber-600", red: "text-red-600" }[urgency];

  return (
    <div
      className={`rounded-xl border-2 bg-white p-4 shadow-sm ${borderColor} ${
        urgency === "red" ? "animate-pulse" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-slate-800 px-3 py-1 text-sm font-bold text-white">Mesa {item.tableLabel}</span>
        <span className={`font-mono text-lg font-bold ${timerColor}`}>{elapsedLabel}</span>
      </div>
      <p className="mt-1 text-sm font-semibold text-blue-600">👤 {item.waiterName}</p>

      <p className="mt-3 text-lg font-bold text-slate-800">
        {item.quantity}× {item.name}
      </p>
      <p className="text-xs font-semibold uppercase text-slate-400">{COURSE_LABELS[item.course] ?? item.course}</p>

      {item.modifiers.length > 0 && (
        <ul className="mt-2 space-y-0.5">
          {item.modifiers.map((m) => (
            <li key={m.modifierId} className="text-sm text-slate-600">
              • {m.name}
            </li>
          ))}
        </ul>
      )}

      {item.notes && <p className="mt-2 rounded bg-amber-50 p-2 text-sm font-medium text-amber-800">📝 {item.notes}</p>}

      <div className="mt-4">
        {item.status === "QUEUED" && (
          <button
            onClick={() => onAdvance("IN_PREPARATION")}
            className="w-full rounded-lg bg-slate-800 py-2 font-bold text-white active:scale-95"
          >
            Empezar
          </button>
        )}
        {item.status === "IN_PREPARATION" && (
          <button
            onClick={() => onAdvance("READY")}
            className="w-full rounded-lg bg-emerald-600 py-2 font-bold text-white active:scale-95"
          >
            Marcar listo
          </button>
        )}
        {item.status === "READY" && (
          <p className="w-full rounded-lg bg-emerald-50 py-2 text-center font-bold text-emerald-700">
            Listo — esperando entrega
          </p>
        )}
      </div>
    </div>
  );
}
