import { api } from "./api";

export type PushState = "unsupported" | "needs-install" | "default" | "granted" | "denied";

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
}

export function getPushState(): PushState {
  // En iPhone los avisos solo funcionan con la app agregada a la pantalla de inicio.
  if (isIos() && !isStandalone()) return "needs-install";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return "unsupported";
  return Notification.permission as PushState;
}

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js");
  } catch {
    return null;
  }
}

/** Pide permiso (si hace falta) y deja este celular recibiendo los avisos del usuario actual. */
export async function enablePush(): Promise<PushState> {
  const state = getPushState();
  if (state === "unsupported" || state === "needs-install" || state === "denied") return state;

  const permission = state === "granted" ? "granted" : await Notification.requestPermission();
  if (permission !== "granted") return permission as PushState;

  const registration = (await registerServiceWorker()) ?? (await navigator.serviceWorker.ready);
  const { data } = await api.get<{ publicKey: string }>("/api/push/public-key");
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(data.publicKey),
    });
  }
  await api.post("/api/push/subscribe", subscription.toJSON());
  return "granted";
}
