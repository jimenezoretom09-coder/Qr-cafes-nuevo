import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ApprovalType } from "@rms/shared";
import { decideApprovalRequest, fetchApprovals } from "./api";
import { useSocketEvent } from "../../lib/use-socket-event";
import { playBeep } from "../../lib/sound";

const TYPE_LABELS: Record<ApprovalType, string> = {
  DISCOUNT: "Descuento",
  VOID_ITEM: "Anular plato",
  VOID_ORDER: "Anular cuenta completa",
  REFUND: "Reembolso",
};

export default function ApprovalQueue() {
  const queryClient = useQueryClient();
  const { data: approvals = [] } = useQuery({
    queryKey: ["approvals", "pending"],
    queryFn: () => fetchApprovals("PENDING"),
  });

  useSocketEvent("approval:requested", () => {
    queryClient.invalidateQueries({ queryKey: ["approvals", "pending"] });
    playBeep(520, 250);
  });
  useSocketEvent("approval:decided", () => {
    queryClient.invalidateQueries({ queryKey: ["approvals", "pending"] });
  });

  const decideMutation = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: "APPROVED" | "DENIED" }) =>
      decideApprovalRequest(id, decision),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["approvals", "pending"] }),
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-800">Aprobaciones pendientes</h1>

      {approvals.length === 0 && <p className="text-slate-400">No hay solicitudes pendientes.</p>}

      <div className="space-y-3">
        {approvals.map((req) => (
          <div key={req.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4">
            <div>
              <p className="font-semibold text-slate-800">{TYPE_LABELS[req.type]}</p>
              <p className="text-sm text-slate-500">Solicitado por {req.requestedByName}</p>
              {req.reason && <p className="text-sm text-slate-500">Motivo: {req.reason}</p>}
              {req.payload && (
                <p className="text-sm text-slate-500">
                  {req.type === "DISCOUNT" &&
                    `${req.payload.discountType === "PERCENT" ? `${req.payload.value}%` : `$${req.payload.value}`}`}
                </p>
              )}
              <p className="text-xs text-slate-400">{new Date(req.createdAt).toLocaleString("es")}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => decideMutation.mutate({ id: req.id, decision: "DENIED" })}
                disabled={decideMutation.isPending}
                className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200"
              >
                Rechazar
              </button>
              <button
                onClick={() => decideMutation.mutate({ id: req.id, decision: "APPROVED" })}
                disabled={decideMutation.isPending}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Aprobar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
