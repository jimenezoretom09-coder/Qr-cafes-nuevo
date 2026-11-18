import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getErrorMessage } from "../../lib/api";
import { useSocketEvent } from "../../lib/use-socket-event";
import { fetchMenuTree, setItemAvailability } from "./api";

/** Encender y apagar platos de la carta en un toque (lo que se acaba en el dia). */
export default function SoldOutPanel() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const { data: categories = [] } = useQuery({ queryKey: ["menu"], queryFn: fetchMenuTree });

  useSocketEvent("menu:item_availability_changed", () => {
    queryClient.invalidateQueries({ queryKey: ["menu"] });
  });

  const mutation = useMutation({
    mutationFn: ({ id, available }: { id: string; available: boolean }) => setItemAvailability(id, available),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["menu"] }),
  });

  const q = query.trim().toLowerCase();
  const soldOutCount = categories.flatMap((c) => c.items).filter((i) => !i.available).length;

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="mx-auto max-w-2xl">
        <p className="mb-3 text-sm text-slate-600">
          Lo que apagues aquí desaparece al instante de la carta de los clientes.{" "}
          {soldOutCount > 0 && <strong className="text-red-600">{soldOutCount} agotado(s) ahora.</strong>}
        </p>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar plato…"
          className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2"
        />
        {mutation.isError && <p className="mb-3 text-sm font-semibold text-red-600">{getErrorMessage(mutation.error)}</p>}
        {categories.map((cat) => {
          const items = cat.items.filter((i) => !q || i.name.toLowerCase().includes(q));
          if (items.length === 0) return null;
          return (
            <section key={cat.id} className="mb-5">
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">{cat.name}</h3>
              <div className="divide-y divide-slate-100 overflow-hidden rounded-xl bg-white shadow-sm">
                {items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => mutation.mutate({ id: item.id, available: !item.available })}
                    disabled={mutation.isPending}
                    className="flex w-full items-center justify-between px-4 py-3 text-left"
                  >
                    <span className={`font-semibold ${item.available ? "text-slate-800" : "text-slate-400 line-through"}`}>
                      {item.name}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        item.available ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-700"
                      }`}
                    >
                      {item.available ? "Disponible" : "Agotado"}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
