import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { openCashSession } from "./api";
import { useAuthStore } from "../../lib/auth-store";
import { getErrorMessage } from "../../lib/api";

export default function OpenSessionScreen() {
  const [openingAmount, setOpeningAmount] = useState("");
  const queryClient = useQueryClient();
  const logout = useAuthStore((s) => s.logout);

  const mutation = useMutation({
    mutationFn: () => openCashSession(Number(openingAmount)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cash-session", "current"] }),
  });

  return (
    <div className="flex h-screen items-center justify-center bg-slate-900">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl">
        <h1 className="text-center text-2xl font-bold text-slate-800">Abrir caja</h1>
        <p className="text-center text-slate-500 mt-1 mb-6">Ingresa el monto inicial en efectivo</p>

        <input
          type="number"
          min="0"
          step="0.01"
          value={openingAmount}
          onChange={(e) => setOpeningAmount(e.target.value)}
          placeholder="0.00"
          className="w-full rounded-lg border border-slate-300 px-4 py-3 text-center text-2xl font-bold"
        />

        {mutation.isError && (
          <p className="mt-3 text-center text-sm font-medium text-red-600">{getErrorMessage(mutation.error)}</p>
        )}

        <button
          onClick={() => mutation.mutate()}
          disabled={!openingAmount || mutation.isPending}
          className="mt-6 w-full rounded-xl bg-emerald-600 py-3 font-bold text-white disabled:opacity-40"
        >
          {mutation.isPending ? "Abriendo..." : "Abrir caja"}
        </button>
        <button onClick={logout} className="mt-3 w-full rounded-xl bg-slate-100 py-2 text-sm font-semibold text-slate-600">
          Salir
        </button>
      </div>
    </div>
  );
}
