import { io, Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "@rms/shared";
import { API_BASE_URL } from "./api";
import { useAuthStore } from "./auth-store";

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

export function getSocket() {
  const token = useAuthStore.getState().token;
  if (!token) throw new Error("No autenticado");
  if (!socket) {
    socket = io(API_BASE_URL, { auth: { token } });
  }
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

useAuthStore.subscribe((state, prevState) => {
  if (prevState.token && !state.token) {
    disconnectSocket();
  }
});
