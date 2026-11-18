import { useEffect, useState } from "react";
import { useAuthStore } from "../../lib/auth-store";
import { enablePush, getPushState, type PushState } from "../../lib/push";

/**
 * Para el personal: ofrece activar los avisos en este celular (nuevo pedido, plato listo,
 * "me llaman de la mesa 4") para que suenen aunque el celular este bloqueado. Si ya los
 * activo, vuelve a asociar el celular al usuario que acaba de entrar, en silencio.
 */
export default function PushPrompt() {
  const user = useAuthStore((s) => s.user);
  const [state, setState] = useState<PushState>(() => getPushState());
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem("rms-push-dismissed") === "1";
    } catch {
      return false;
    }
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user && getPushState() === "granted") {
      enablePush().then(setState).catch(() => undefined);
    }
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!user || dismissed || state === "granted" || state === "unsupported") return null;

  function dismiss() {
    setDismissed(true);
    try {
      sessionStorage.setItem("rms-push-dismissed", "1");
    } catch {
      /* nada */
    }
  }

  return (
    <div className="fixed inset-x-3 bottom-20 z-[45] mx-auto max-w-md rounded-2xl bg-slate-900 p-4 text-white shadow-2xl">
      {state === "needs-install" ? (
        <p className="text-sm">
          📲 Para recibir avisos con el celular bloqueado en iPhone: toca <strong>Compartir</strong> →{" "}
          <strong>Agregar a pantalla de inicio</strong>, y abre la app desde ese ícono.
        </p>
      ) : state === "denied" ? (
        <p className="text-sm">
          🔕 Los avisos están bloqueados en este navegador. Actívalos en la configuración del sitio (candado junto a la
          dirección) → Notificaciones → Permitir.
        </p>
      ) : (
        <p className="text-sm">
          🔔 Activa los avisos en este celular para enterarte de pedidos y llamados de las mesas, incluso con la pantalla
          bloqueada.
        </p>
      )}
      <div className="mt-3 flex gap-2">
        <button onClick={dismiss} className="rounded-lg bg-slate-700 px-3 py-2 text-sm font-semibold">
          Ahora no
        </button>
        {state === "default" && (
          <button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                setState(await enablePush());
              } catch {
                setState(getPushState());
              } finally {
                setBusy(false);
              }
            }}
            className="flex-1 rounded-lg bg-emerald-500 py-2 text-sm font-bold"
          >
            {busy ? "Activando…" : "Activar avisos"}
          </button>
        )}
      </div>
    </div>
  );
}
