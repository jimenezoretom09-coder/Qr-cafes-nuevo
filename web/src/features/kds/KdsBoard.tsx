import { useEffect, useState } from "react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchStationQueue, fetchStations, updateItemStatus } from "./api";
import { getSocket } from "../../lib/socket";
import { useSocketEvent } from "../../lib/use-socket-event";
import { alCambiarEstadoDelSonido, armarSonido, playAlerta, playBeep, sonidoListo } from "../../lib/sound";
import OrderTicketCard from "./OrderTicketCard";

export default function KdsBoard() {
  const queryClient = useQueryClient();
  const { data: stations = [] } = useQuery({ queryKey: ["stations"], queryFn: fetchStations });
  const [delayedIds, setDelayedIds] = useState<Set<string>>(new Set());
  const [audioListo, setAudioListo] = useState(sonidoListo());

  // La cocina deja esta pantalla abierta sin tocarla, y el navegador no deja sonar nada hasta
  // que alguien la toque. Se intenta habilitar de una y, si no se puede, se avisa en pantalla.
  useEffect(() => {
    armarSonido();
    setAudioListo(sonidoListo());
    return alCambiarEstadoDelSonido(setAudioListo);
  }, []);

  useEffect(() => {
    if (stations.length === 0) return;
    const socket = getSocket();
    stations.forEach((s) => socket.emit("subscribe:station", s.id));
  }, [stations]);

  function invalidateAllQueues() {
    stations.forEach((s) => queryClient.invalidateQueries({ queryKey: ["kds-queue", s.id] }));
  }

  useSocketEvent("order:item_created", () => {
    invalidateAllQueues();
    // Tres pitos: uno solo se pierde con el ruido de la cocina.
    playAlerta(3, 880);
  });
  useSocketEvent("order:item_status_changed", () => {
    invalidateAllQueues();
  });
  useSocketEvent("order:item_delayed", (payload) => {
    setDelayedIds((prev) => new Set(prev).add(payload.itemId));
    playBeep(440, 300);
  });

  const stationQueries = useQueries({
    queries: stations.map((station) => ({
      queryKey: ["kds-queue", station.id],
      queryFn: () => fetchStationQueue(station.id),
      refetchInterval: 20_000,
    })),
  });

  const mutation = useMutation({
    mutationFn: ({ itemId, status }: { itemId: string; status: "IN_PREPARATION" | "READY" }) =>
      updateItemStatus(itemId, status),
    onSuccess: (_data, vars) => {
      invalidateAllQueues();
      setDelayedIds((prev) => {
        const next = new Set(prev);
        next.delete(vars.itemId);
        return next;
      });
    },
  });

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
      <div className="flex flex-1 gap-px overflow-x-auto bg-slate-200">
      {stations.map((station, idx) => (
        <div
          key={station.id}
          className="flex h-full min-w-[260px] flex-1 flex-col overflow-y-auto bg-slate-50 p-3"
        >
          <h2
            className="mb-3 rounded-lg px-3 py-2 text-lg font-extrabold text-white"
            style={{ backgroundColor: station.color }}
          >
            {station.name}
            <span className="ml-2 text-sm font-semibold opacity-80">
              ({stationQueries[idx].data?.length ?? 0})
            </span>
          </h2>
          <div className="space-y-3">
            {(stationQueries[idx].data ?? []).map((item) => (
              <OrderTicketCard
                key={item.id}
                item={item}
                delayed={delayedIds.has(item.id)}
                onAdvance={(nextStatus) => mutation.mutate({ itemId: item.id, status: nextStatus })}
              />
            ))}
            {(stationQueries[idx].data ?? []).length === 0 && (
              <p className="text-center text-slate-400 mt-8">Sin pedidos pendientes</p>
            )}
          </div>
        </div>
      ))}
      </div>
    </div>
  );
}
