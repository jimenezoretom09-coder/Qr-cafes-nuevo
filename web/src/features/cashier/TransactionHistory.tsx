import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatCOP, type PaymentMethod } from "@rms/shared";
import { fetchSessionPayments } from "./api";
import { useSocketEvent } from "../../lib/use-socket-event";

const METHOD_LABELS: Record<PaymentMethod, string> = { CASH: "Efectivo", CARD: "Tarjeta", DIGITAL: "Digital" };

export default function TransactionHistory({ sessionId }: { sessionId: string }) {
  const queryClient = useQueryClient();
  const { data: payments = [] } = useQuery({
    queryKey: ["session-payments", sessionId],
    queryFn: () => fetchSessionPayments(sessionId),
  });

  useSocketEvent("order:payment_recorded", () => {
    queryClient.invalidateQueries({ queryKey: ["session-payments", sessionId] });
  });

  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-bold text-slate-800">Historial de transacciones (turno actual)</h1>

      {payments.length === 0 && <p className="text-slate-400">Aún no hay pagos registrados en este turno.</p>}

      <table className="w-full rounded-xl border border-slate-200 bg-white text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-slate-500">
            <th className="p-3">Hora</th>
            <th className="p-3">Mesa</th>
            <th className="p-3">Cajero</th>
            <th className="p-3">Método</th>
            <th className="p-3 text-right">Propina</th>
            <th className="p-3 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((p) => (
            <tr key={p.id} className={`border-b border-slate-100 last:border-0 ${p.refunded ? "opacity-50" : ""}`}>
              <td className="p-3 text-slate-500">{new Date(p.createdAt).toLocaleTimeString("es")}</td>
              <td className="p-3 font-medium text-slate-800">
                Mesa {p.tableLabel} {p.splitLabel ? `(${p.splitLabel})` : ""}
              </td>
              <td className="p-3 text-slate-600">{p.createdByName}</td>
              <td className="p-3 text-slate-600">{METHOD_LABELS[p.method]}</td>
              <td className="p-3 text-right text-slate-600">{formatCOP(p.tipAmount)}</td>
              <td className="p-3 text-right font-semibold text-slate-800">
                {formatCOP(p.amount)} {p.refunded && <span className="text-red-500">(reembolsado)</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
