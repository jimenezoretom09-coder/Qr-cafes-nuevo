import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { TicketAction, TicketDTO } from "@rms/shared";
import { fetchKitchenTickets, fetchStations, markItemSoldOut, ticketAction } from "./api";
import { getErrorMessage } from "../../lib/api";
import { useSocketEvent } from "../../lib/use-socket-event";
import { alCambiarEstadoDelSonido, armarSonido, playAlerta, playBeep, sonidoListo } from "../../lib/sound";
import KitchenTicketCard from "./KitchenTicketCard";
import SoldOutPanel from "./SoldOutPanel";

type Column = "new" | "kitchen" | "ready";

const COLUMNS: { key: Column; title: string; statuses: TicketDTO["status"][] }[] = [
  { key: "new", title: "Por confirmar", statuses: ["SENT", "SEEN"] },
  { key: "kitchen", title: "En cocina", statuses: ["CONFIRMED", "PREPARING"] },
  { key: "ready", title: "Listos", statuses: ["READY", "ON_THE_WAY"] },
];

/**
 * Tablero de comandas: una tarjeta por mesa (no por plato), en el orden en que llegaron. Cocina
 * confirma, prepara y marca "Todo listo" la mesa completa, asi se sirve una mesa entera antes
 * de pasar a la siguiente.
 */
export default function KdsBoard() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"tickets" | "soldout">("tickets");
  const [mobileColumn, setMobileColumn] = useState<Column>("new");
  const [stationFilter, setStationFilter] = useState<string | null>(null);
  const [audioListo, setAudioListo] = useState(sonidoListo());
  const [error, setError] = useState<string | null>(null);

  const { data: stations = [] } = useQuery({ queryKey: ["stations"], queryFn: fetchStations });
  const stationById = useMemo(() => new Map(stations.map((s) => [s.id, s])), [stations]);
  const { data: tickets = [] } = useQuery({
    queryKey: ["kitchen-tickets"],
    queryFn: fetchKitchenTickets,
    refetchInterval: 15_000,
  });

  // La cocina deja esta pantalla abierta sin tocarla, y el navegador no deja sonar nada hasta
  // que alguien la toque. Se intenta habilitar de una y, si no se puede, se avisa en pantalla.
  useEffect(() => {
    armarSonido();
    setAudioListo(sonidoListo());
    return alCambiarEstadoDelSonido(setAudioListo);
  }, []);

  useSocketEvent("ticket:updated", (ticket) => {
    queryClient.invalidateQueries({ queryKey: ["kitchen-tickets"] });
    // Tres pitos: uno solo se pierde con el ruido de la cocina.
    if (ticket.status === "SENT") playAlerta(3, 880);
  });
  useSocketEvent("order:item_delayed", () => {
    playBeep(440, 300);
  });

  const mutation = useMutation({
    mutationFn: async (vars: { kind: "action"; ticketId: string; action: TicketAction; reason?: string } | { kind: "soldout"; itemId: string }) => {
      if (vars.kind === "action") await ticketAction(vars.ticketId, vars.action, vars.reason);
      else await markItemSoldOut(vars.itemId);
    },
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["kitchen-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["menu"] });
    },
    onError: (err) => {
      setError(getErrorMessage(err));
      queryClient.invalidateQueries({ queryKey: ["kitchen-tickets"] });
    },
  });

  function handleAction(ticket: TicketDTO, action: TicketAction) {
    if (action === "reject") {
      const reason = window.prompt(`¿Por qué no se puede preparar el pedido de la mesa ${ticket.tableLabel}?`, "Cocina cerrada");
      if (reason === null) return;
      mutation.mutate({ kind: "action", ticketId: ticket.id, action, reason });
      return;
    }
    mutation.mutate({ kind: "action", ticketId: ticket.id, action });
  }

  function handleSoldOut(itemId: string, itemName: string) {
    if (!window.confirm(`¿Marcar "${itemName}" como agotado?\n\nSe quita de este pedido (el cliente lo verá como "Agotado") y se apaga en la carta.`)) return;
    mutation.mutate({ kind: "soldout", itemId });
  }

  const visible = tickets.filter((t) => !stationFilter || t.items.some((i) => i.stationId === stationFilter && i.status !== "CANCELLED"));
  // El que sale primero: la comanda confirmada mas antigua (orden de llegada).
  const nextId = visible.find((t) => t.status === "CONFIRMED" || t.status === "PREPARING")?.id;

  return (
    <div className="flex h-full flex-col">
      {!audioListo && (
        <button
          onClick={() => {
            armarSonido();
            playBeep(880, 200);
            setAudioListo(sonidoListo());
          }}
          className="w-full bg-amber-500 px-4 py-3 text-center text-base font-bold text-white"
        >
          🔇 El sonido está apagado — toca aquí para activar los avisos de pedidos
        </button>
      )}

      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-3 py-2">
        <button
          onClick={() => setTab("tickets")}
          className={`rounded-lg px-3 py-1.5 text-sm font-bold ${tab === "tickets" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}
        >
          Pedidos ({tickets.filter((t) => t.status !== "ON_THE_WAY").length})
        </button>
        <button
          onClick={() => setTab("soldout")}
          className={`rounded-lg px-3 py-1.5 text-sm font-bold ${tab === "soldout" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}
        >
          Agotados
        </button>
        {tab === "tickets" && stations.length > 1 && (
          <div className="ml-auto flex flex-wrap gap-1.5">
            <button
              onClick={() => setStationFilter(null)}
              className={`rounded-full px-3 py-1 text-xs font-bold ${!stationFilter ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600"}`}
            >
              Todo
            </button>
            {stations.map((s) => (
              <button
                key={s.id}
                onClick={() => setStationFilter(s.id)}
                className="rounded-full px-3 py-1 text-xs font-bold"
                style={stationFilter === s.id ? { backgroundColor: s.color, color: "white" } : { backgroundColor: "#f1f5f9", color: s.color }}
              >
                {s.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && <p className="bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">{error}</p>}

      {tab === "soldout" ? (
        <div className="flex-1 overflow-hidden bg-slate-50">
          <SoldOutPanel />
        </div>
      ) : (
        <>
          {/* En celular se ve una columna a la vez. */}
          <div className="flex gap-1 bg-white px-3 pb-2 md:hidden">
            {COLUMNS.map((c) => {
              const count = visible.filter((t) => c.statuses.includes(t.status)).length;
              return (
                <button
                  key={c.key}
                  onClick={() => setMobileColumn(c.key)}
                  className={`flex-1 rounded-lg py-2 text-xs font-bold ${
                    mobileColumn === c.key ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {c.title} ({count})
                </button>
              );
            })}
          </div>
          <div className="flex flex-1 gap-px overflow-hidden bg-slate-200">
            {COLUMNS.map((col) => {
              const list = visible.filter((t) => col.statuses.includes(t.status));
              return (
                <div
                  key={col.key}
                  className={`h-full min-w-0 flex-1 flex-col overflow-y-auto bg-slate-50 p-3 ${
                    mobileColumn === col.key ? "flex" : "hidden"
                  } md:flex`}
                >
                  <h2 className="mb-3 hidden rounded-lg bg-slate-800 px-3 py-2 text-lg font-extrabold text-white md:block">
                    {col.title} <span className="text-sm font-semibold opacity-80">({list.length})</span>
                  </h2>
                  <div className="space-y-3">
                    {list.map((t) => (
                      <KitchenTicketCard
                        key={t.id}
                        ticket={t}
                        stations={stationById}
                        stationFilter={stationFilter}
                        isNext={t.id === nextId}
                        busy={mutation.isPending}
                        onAction={(a) => handleAction(t, a)}
                        onSoldOut={handleSoldOut}
                      />
                    ))}
                    {list.length === 0 && <p className="mt-8 text-center text-slate-400">Nada por aquí</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
