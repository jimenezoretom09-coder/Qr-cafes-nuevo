import { create } from "zustand";
import type { AuthUserDTO } from "@rms/shared";

const STORAGE_KEY = "rms.auth";

interface StoredAuth {
  token: string;
  user: AuthUserDTO;
}

function loadStoredAuth(): StoredAuth | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredAuth;
  } catch {
    return null;
  }
}

interface AuthState {
  token: string | null;
  user: AuthUserDTO | null;
  login: (token: string, user: AuthUserDTO) => void;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
}

const initial = loadStoredAuth();

export const useAuthStore = create<AuthState>((set, get) => ({
  token: initial?.token ?? null,
  user: initial?.user ?? null,
  login: (token, user) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user }));
    set({ token, user });
  },
  logout: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ token: null, user: null });
  },
  hasPermission: (permission) => get().user?.permissions.includes(permission) ?? false,
}));
