import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { formatCOP, type CashSessionDTO } from "@rms/shared";
import { closeCashSession } from "./api";
import { getErrorMessage } from "../../lib/api";

export default function CloseSessionModal({ session, onClose }: { session: CashSessionDTO; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [countedAmount, setCountedAmount] = useState("");
  const [closedSummary, setClosedSummary] = useState<CashSessionDTO | null>(null);

  const mutation = useMutation({
    mutationFn: () => closeCashSession(session.id, Number(countedAmount)),
    onSuccess: (result) => setClosedSummary(result),
  });

  function handleFinish() {
    queryClient.invalidateQueries({ queryKey: ["cash-session", "current"] });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        {!closedSummary ? (
          <>
            <h2 className="text-lg font-bold text-slate-800">Cerrar caja</h2>
            <p className="mt-1 text-sm text-slate-500">
              Efectivo esperado: apertura ({formatCOP(session.openingAmount)}) + ventas en efectivo (
              {formatCOP(session.totalsByMethod.CASH)})
            </p>
            <p className="mt-3 text-sm font-semibold text-slate-600">Monto contado en caja</p>
            <input
              type="number"
              min={0}
              step="0.01"
              value={countedAmount}
              onChange={(e) => setCountedAmount(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-3 text-center text-2xl font-bold"
              autoFocus
            />
            {mutation.isError && (
              <p className="mt-2 text-sm font-medium text-red-600">{getErrorMessage(mutation.error)}</p>
            )}
            <div className="mt-4 flex gap-2">
              <button onClick={onClose} className="flex-1 rounded-lg bg-slate-100 py-2 font-semibold text-slate-600">
                Cancelar
              </button>
              <button
                onClick={() => mutation.mutate()}
                disabled={!countedAmount || mutation.isPending}
                className="flex-1 rounded-lg bg-red-600 py-2 font-semibold text-white disabled:opacity-40"
              >
                {mutation.isPending ? "Cerrando..." : "Cerrar caja"}
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-lg font-bold text-slate-800">Cuadre de caja</h2>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Esperado</span>
                <span className="font-semibold">{formatCOP(closedSummary.closingAmountExpected ?? 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>Contado</span>
                <span className="font-semibold">{formatCOP(closedSummary.closingAmountCounted ?? 0)}</span>
              </div>
              <div
                className={`flex justify-between rounded-lg p-2 font-bold ${
                  Math.abs(closedSummary.discrepancy ?? 0) < 0.01
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-red-50 text-red-700"
                }`}
              >
                <span>Diferencia</span>
                <span>{formatCOP(closedSummary.discrepancy ?? 0)}</span>
              </div>
            </div>
            <button onClick={handleFinish} className="mt-4 w-full rounded-lg bg-slate-800 py-2 font-semibold text-white">
              Continuar
            </button>
          </>
        )}
      </div>
    </div>
  );
}
