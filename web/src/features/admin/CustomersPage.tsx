import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatCOP } from "@rms/shared";
import { fetchCustomers } from "./api";
import { createCustomer } from "../cashier/api";
import { getErrorMessage } from "../../lib/api";

export default function CustomersPage() {
  const queryClient = useQueryClient();
  const { data: customers = [] } = useQuery({ queryKey: ["customers"], queryFn: fetchCustomers });
  const [form, setForm] = useState({ name: "", phone: "", email: "" });

  const createMutation = useMutation({
    mutationFn: () =>
      createCustomer({
        name: form.name,
        phone: form.phone || undefined,
        email: form.email || undefined,
      }),
    onSuccess: () => {
      setForm({ name: "", phone: "", email: "" });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-800">Clientes y fidelización</h1>

      <div className="mb-6 grid grid-cols-1 gap-2 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-4">
        <input
          placeholder="Nombre"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="rounded border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          placeholder="Teléfono"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          className="rounded border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          placeholder="Email (opcional)"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="rounded border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          onClick={() => createMutation.mutate()}
          disabled={!form.name || createMutation.isPending}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          Registrar cliente
        </button>
      </div>
      {createMutation.isError && (
        <p className="mb-4 text-sm font-medium text-red-600">{getErrorMessage(createMutation.error)}</p>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th className="p-3">Nombre</th>
              <th className="p-3">Teléfono</th>
              <th className="p-3 text-right">Visitas</th>
              <th className="p-3 text-right">Puntos</th>
              <th className="p-3 text-right">Total gastado</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id} className="border-b border-slate-100 last:border-0">
                <td className="p-3 font-medium text-slate-800">{c.name}</td>
                <td className="p-3 text-slate-600">{c.phone ?? "—"}</td>
                <td className="p-3 text-right text-slate-600">{c.visitCount}</td>
                <td className="p-3 text-right font-semibold text-emerald-600">{c.points}</td>
                <td className="p-3 text-right font-semibold text-slate-800">{formatCOP(c.totalSpent)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
