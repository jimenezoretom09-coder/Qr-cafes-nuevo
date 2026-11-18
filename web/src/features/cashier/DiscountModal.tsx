import { useState } from "react";

export interface DiscountInput {
  discountType: "PERCENT" | "FIXED";
  value: number;
  reason?: string;
}

export default function DiscountModal({
  onCancel,
  onConfirm,
  isPending,
  error,
}: {
  onCancel: () => void;
  onConfirm: (input: DiscountInput) => void;
  isPending: boolean;
  error: string | null;
}) {
  const [discountType, setDiscountType] = useState<"PERCENT" | "FIXED">("PERCENT");
  const [value, setValue] = useState("");
  const [reason, setReason] = useState("");

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4" onClick={onCancel}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-slate-800">Solicitar descuento</h2>
        <p className="mt-1 text-sm text-slate-500">
          Si no tienes permiso de aprobación, se enviará al gerente/administrador para su aprobación.
        </p>

        <div className="mt-4 flex gap-2">
          <button
            onClick={() => setDiscountType("PERCENT")}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold ${
              discountType === "PERCENT" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
            }`}
          >
            Porcentaje
          </button>
          <button
            onClick={() => setDiscountType("FIXED")}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold ${
              discountType === "FIXED" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
            }`}
          >
            Monto fijo
          </button>
        </div>

        <input
          type="number"
          min={0}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={discountType === "PERCENT" ? "% de descuento" : "Monto en $"}
          className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2"
        />

        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Motivo del descuento"
          className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          rows={2}
        />

        {error && <p className="mt-2 text-sm font-medium text-red-600">{error}</p>}

        <div className="mt-4 flex gap-2">
          <button onClick={onCancel} className="flex-1 rounded-lg bg-slate-100 py-2 font-semibold text-slate-600">
            Cancelar
          </button>
          <button
            onClick={() => onConfirm({ discountType, value: Number(value), reason: reason.trim() || undefined })}
            disabled={!value || isPending}
            className="flex-1 rounded-lg bg-blue-600 py-2 font-semibold text-white disabled:opacity-40"
          >
            {isPending ? "Enviando..." : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}
