import { useEffect, useState } from "react";
import { useSocketEvent } from "../../lib/use-socket-event";
import { armarSonido, playAlerta } from "../../lib/sound";

interface Toast {
  id: string;
  tableLabel: string;
  itemName: string;
}

/** Mounted once at the top of the waiter area (not inside a specific screen) so the "plato
 * listo" alert fires no matter which screen the waitress currently has open — table map,
 * order-taking, or "Mis pedidos". Without this, she'd only find out by opening that panel. */
export default function WaiterNotifications() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Sin esto el navegador deja el audio suspendido y el aviso de "plato listo" no suena.
  useEffect(() => {
    armarSonido();
  }, []);

  useSocketEvent("order:item_status_changed", (payload) => {
    if (payload.status !== "READY") return;
    const id = `${payload.itemId}-${Date.now()}`;
    setToasts((prev) => [...prev, { id, tableLabel: payload.tableLabel, itemName: payload.itemName }]);
    playAlerta(2, 660);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 7000);
  });

  if (toasts.length === 0) return null;

  return (
    <div className="fixed right-4 top-4 z-50 flex w-80 flex-col gap-2">
      {toasts.map((t) => (
        <div key={t.id} className="rounded-xl border-2 border-emerald-300 bg-emerald-600 px-5 py-3 text-white shadow-2xl">
          <p className="text-lg font-bold">🔔 Mesa {t.tableLabel} — ¡listo!</p>
          <p className="text-sm text-emerald-50">{t.itemName}</p>
        </div>
      ))}
    </div>
  );
}
