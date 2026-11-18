import axios, { isAxiosError } from "axios";
import { useAuthStore } from "./auth-store";

// Falls back to the page's own hostname (not a hardcoded "localhost") so a tablet/phone
// on the same Wi-Fi reaching the app via the host machine's LAN IP still talks to the
// right backend instead of trying to hit its own localhost:4000.
export const API_BASE_URL = import.meta.env.VITE_API_URL ?? `http://${window.location.hostname}:4000`;

export const api = axios.create({ baseURL: API_BASE_URL });

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

/** Prefer the server's `{ error }` message over axios's generic "Request failed with status code N". */
export function getErrorMessage(error: unknown, fallback = "Ocurrió un error inesperado"): string {
  if (isAxiosError(error)) {
    return (error.response?.data as { error?: string } | undefined)?.error ?? error.message;
  }
  return error instanceof Error ? error.message : fallback;
}
