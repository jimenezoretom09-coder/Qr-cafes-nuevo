import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createUser, fetchRoles, fetchUsers, setUserActive } from "./api";

export default function UserManager() {
  const queryClient = useQueryClient();
  const { data: users = [] } = useQuery({ queryKey: ["admin-users"], queryFn: fetchUsers });
  const { data: roles = [] } = useQuery({ queryKey: ["roles"], queryFn: fetchRoles });

  const [form, setForm] = useState({ name: "", roleId: "", pin: "" });
  const [showInactive, setShowInactive] = useState(false);

  const invalidateUsers = () => queryClient.invalidateQueries({ queryKey: ["admin-users"] });

  const createMutation = useMutation({
    mutationFn: () => createUser(form),
    onSuccess: () => {
      setForm({ name: "", roleId: "", pin: "" });
      invalidateUsers();
    },
  });

  const activeMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => setUserActive(id, active),
    onSuccess: invalidateUsers,
  });

  const visibleUsers = showInactive ? users : users.filter((u) => u.active);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Usuarios y roles</h1>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
          />
          Mostrar también los que quité ({users.filter((u) => !u.active).length})
        </label>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-4">
        <input
          placeholder="Nombre completo"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="rounded border border-slate-300 px-3 py-2 text-sm"
        />
        <select
          value={form.roleId}
          onChange={(e) => setForm({ ...form, roleId: e.target.value })}
          className="rounded border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Rol...</option>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <input
          placeholder="PIN (4-6 dígitos)"
          value={form.pin}
          onChange={(e) => setForm({ ...form, pin: e.target.value })}
          className="rounded border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          onClick={() => createMutation.mutate()}
          disabled={!form.name || !form.roleId || form.pin.length < 4}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          Crear usuario
        </button>
      </div>

      <table className="w-full rounded-xl border border-slate-200 bg-white text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-slate-500">
            <th className="p-3">Nombre</th>
            <th className="p-3">Rol</th>
            <th className="p-3 text-right">​</th>
          </tr>
        </thead>
        <tbody>
          {visibleUsers.map((u) => (
            <tr key={u.id} className="border-b border-slate-100 last:border-0">
              <td className={`p-3 font-medium ${u.active ? "text-slate-800" : "text-slate-400 line-through"}`}>
                {u.name}
              </td>
              <td className="p-3 text-slate-600">{u.roleName}</td>
              <td className="p-3 text-right">
                {u.active ? (
                  <button
                    onClick={() => activeMutation.mutate({ id: u.id, active: false })}
                    className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-red-50 hover:text-red-600"
                  >
                    Quitar
                  </button>
                ) : (
                  <button
                    onClick={() => activeMutation.mutate({ id: u.id, active: true })}
                    className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                  >
                    Reactivar
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
