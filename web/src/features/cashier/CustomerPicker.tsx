import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { attachCustomerToOrder, createCustomer, searchCustomers } from "./api";
import { getErrorMessage } from "../../lib/api";
import type { OrderDTO } from "@rms/shared";

export default function CustomerPicker({ order }: { order: OrderDTO }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showNewForm, setShowNewForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: "", phone: "" });

  const searchQuery = useQuery({
    queryKey: ["customer-search", search],
    queryFn: () => searchCustomers(search),
    enabled: search.length >= 2,
  });

  const invalidateOrder = () => {
    queryClient.invalidateQueries({ queryKey: ["order", order.id] });
    queryClient.invalidateQueries({ queryKey: ["orders", "open"] });
  };

  const attachMutation = useMutation({
    mutationFn: (customerId: string | null) => attachCustomerToOrder(order.id, customerId),
    onSuccess: () => {
      setSearch("");
      invalidateOrder();
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const customer = await createCustomer({ name: newCustomer.name, phone: newCustomer.phone || undefined });
      await attachCustomerToOrder(order.id, customer.id);
    },
    onSuccess: () => {
      setShowNewForm(false);
      setNewCustomer({ name: "", phone: "" });
      invalidateOrder();
    },
  });

  if (order.customerId) {
    return (
      <div className="mb-4 flex items-center justify-between rounded-lg bg-emerald-50 px-4 py-2">
        <span className="text-sm font-semibold text-emerald-800">👤 {order.customerName}</span>
        <button
          onClick={() => attachMutation.mutate(null)}
          className="text-xs font-semibold text-emerald-700 hover:underline"
        >
          Quitar
        </button>
      </div>
    );
  }

  return (
    <div className="mb-4 rounded-lg border border-dashed border-slate-300 p-3">
      {!showNewForm ? (
        <>
          <p className="mb-2 text-sm font-semibold text-slate-600">Cliente (opcional, para puntos de fidelización)</p>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o teléfono..."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          {searchQuery.data && searchQuery.data.length > 0 && (
            <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto">
              {searchQuery.data.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => attachMutation.mutate(c.id)}
                    className="w-full rounded bg-slate-50 px-3 py-1.5 text-left text-sm hover:bg-slate-100"
                  >
                    {c.name} {c.phone ? `— ${c.phone}` : ""} <span className="text-emerald-600">({c.points} pts)</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button onClick={() => setShowNewForm(true)} className="mt-2 text-xs font-semibold text-blue-600 hover:underline">
            + Registrar cliente nuevo
          </button>
        </>
      ) : (
        <>
          <p className="mb-2 text-sm font-semibold text-slate-600">Nuevo cliente</p>
          <input
            value={newCustomer.name}
            onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
            placeholder="Nombre"
            className="mb-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            value={newCustomer.phone}
            onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
            placeholder="Teléfono (opcional)"
            className="mb-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          {createMutation.isError && (
            <p className="mb-2 text-xs font-medium text-red-600">{getErrorMessage(createMutation.error)}</p>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => setShowNewForm(false)}
              className="flex-1 rounded-lg bg-slate-100 py-1.5 text-sm font-semibold text-slate-600"
            >
              Cancelar
            </button>
            <button
              onClick={() => createMutation.mutate()}
              disabled={!newCustomer.name || createMutation.isPending}
              className="flex-1 rounded-lg bg-blue-600 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
            >
              Registrar y asociar
            </button>
          </div>
        </>
      )}
    </div>
  );
}
