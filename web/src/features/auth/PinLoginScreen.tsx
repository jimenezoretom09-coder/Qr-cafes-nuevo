import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { useAuthStore } from "../../lib/auth-store";
import type { AuthUserDTO } from "@rms/shared";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "borrar", "0", "entrar"];

export default function PinLoginScreen() {
  const [pin, setPin] = useState("");
  const login = useAuthStore((s) => s.login);

  const mutation = useMutation({
    mutationFn: async (pinValue: string) => {
      const { data } = await api.post<{ token: string; user: AuthUserDTO }>("/api/auth/login-pin", {
        pin: pinValue,
      });
      return data;
    },
    onSuccess: (data) => {
      login(data.token, data.user);
    },
    onError: () => {
      setPin("");
    },
  });

  function handleKey(key: string) {
    if (mutation.isPending) return;
    if (key === "borrar") {
      setPin((p) => p.slice(0, -1));
      return;
    }
    if (key === "entrar") {
      if (pin.length >= 4) mutation.mutate(pin);
      return;
    }
    if (pin.length < 6) setPin((p) => p + key);
  }

  return (
    <div className="flex h-screen items-center justify-center bg-slate-900">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl">
        <h1 className="text-center text-2xl font-bold text-slate-800">Iniciar sesión</h1>
        <p className="text-center text-slate-500 mt-1 mb-6">Ingresa tu PIN</p>

        <div className="flex justify-center gap-3 mb-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className={`h-4 w-4 rounded-full border-2 ${
                i < pin.length ? "bg-slate-800 border-slate-800" : "border-slate-300"
              }`}
            />
          ))}
        </div>

        {mutation.isError && (
          <p className="text-center text-red-600 font-medium mb-4">PIN incorrecto, intenta de nuevo</p>
        )}

        <div className="grid grid-cols-3 gap-3">
          {KEYS.map((key) => (
            <button
              key={key}
              onClick={() => handleKey(key)}
              disabled={mutation.isPending}
              className={`h-16 rounded-xl text-xl font-semibold active:scale-95 transition ${
                key === "entrar"
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : key === "borrar"
                  ? "bg-slate-200 text-slate-700 hover:bg-slate-300"
                  : "bg-slate-100 text-slate-800 hover:bg-slate-200"
              }`}
            >
              {key === "borrar" ? "⌫" : key === "entrar" ? "Entrar" : key}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
