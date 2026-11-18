import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createTable, deleteTable, fetchTablesAdmin, updateTable } from "./api";
import { getErrorMessage } from "../../lib/api";

export default function TableManager() {
  const queryClient = useQueryClient();
  const { data: tables = [] } = useQuery({ queryKey: ["tables"], queryFn: fetchTablesAdmin });
  const [form, setForm] = useState({ label: "", capacity: "4" });
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const invalidateTables = () => queryClient.invalidateQueries({ queryKey: ["tables"] });

  const createMutation = useMutation({
    mutationFn: () => createTable({ label: form.label.trim(), capacity: Number(form.capacity) || 4 }),
    onSuccess: () => {
      setForm({ label: "", capacity: "4" });
      invalidateTables();
    },
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, label }: { id: string; label: string }) => updateTable(id, { label }),
    onSuccess: () => {
      setRenamingId(null);
      invalidateTables();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTable(id),
    onSuccess: invalidateTables,
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-800">Mesas</h1>

      <div className="mb-6 flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-white p-4">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-500">Nombre de la mesa</label>
          <input
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
            placeholder="Ej: M9, Terraza 1, Barra 2..."
            className="min-w-0 rounded border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-500">Personas</label>
          <input
            type="number"
            min={1}
            value={form.capacity}
            onChange={(e) => setForm({ ...form, capacity: e.target.value })}
            className="w-20 rounded border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <button
          onClick={() => createMutation.mutate()}
          disabled={!form.label.trim() || createMutation.isPending}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          Agregar mesa
        </button>
      </div>
      {createMutation.isError && (
        <p className="mb-4 text-sm font-medium text-red-600">{getErrorMessage(createMutation.error)}</p>
      )}
      {deleteMutation.isError && (
        <p className="mb-4 text-sm font-medium text-red-600">{getErrorMessage(deleteMutation.error)}</p>
      )}

      <p className="mb-3 text-xs text-slate-500">
        El QR de cada mesa no depende del nombre: puedes renombrarla sin reimprimir. Los QR se imprimen desde
        "Códigos QR".
      </p>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th className="p-3">Mesa</th>
              <th className="p-3">Personas</th>
              <th className="p-3">Estado</th>
              <th className="p-3 text-right">​</th>
            </tr>
          </thead>
          <tbody>
            {tables.map((t) => (
              <tr key={t.id} className="border-b border-slate-100 last:border-0">
                <td className="p-3 font-medium text-slate-800">
                  {renamingId === t.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        className="w-32 rounded border border-slate-300 px-2 py-1"
                        autoFocus
                      />
                      <button
                        onClick={() => renameMutation.mutate({ id: t.id, label: renameValue.trim() })}
                        disabled={!renameValue.trim()}
                        className="text-xs font-semibold text-emerald-600 disabled:opacity-40"
                      >
                        Guardar
                      </button>
                      <button
                        onClick={() => setRenamingId(null)}
                        className="text-xs font-semibold text-slate-400"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    t.label
                  )}
                </td>
                <td className="p-3 text-slate-600">{t.capacity}</td>
                <td className="p-3 text-slate-600">{t.status}</td>
                <td className="p-3 text-right">
                  {renamingId !== t.id && (
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setRenamingId(t.id);
                          setRenameValue(t.label);
                        }}
                        className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200"
                      >
                        Renombrar
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`¿Quitar la mesa "${t.label}"?`)) deleteMutation.mutate(t.id);
                        }}
                        className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-red-50 hover:text-red-600"
                      >
                        Quitar
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
