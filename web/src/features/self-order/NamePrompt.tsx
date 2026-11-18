import { useState } from "react";

/**
 * Se pregunta el nombre al entrar: asi cocina ve "Mesa 4 · Laura: capuchino" y el mesero sabe
 * a quien entregarle cada cosa, y la cuenta se puede dividir por persona. Es opcional: quien
 * no quiera escribirlo queda como "Invitado".
 */
export default function NamePrompt({
  businessName,
  tableLabel,
  logoUrl,
  initialName,
  onDone,
}: {
  businessName: string;
  tableLabel: string;
  logoUrl: string | null;
  initialName?: string;
  onDone: (name: string) => void;
}) {
  const [name, setName] = useState(initialName ?? "");

  function submit() {
    onDone(name.trim().slice(0, 40) || "Invitado");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div className="animate-pop w-full max-w-sm rounded-2xl bg-epi-surface p-6 font-body shadow-2xl">
        <div className="mb-4 flex flex-col items-center text-center">
          {logoUrl ? (
            <img src={logoUrl} alt={businessName} className="mb-3 h-16 w-16 rounded-full object-cover" />
          ) : (
            <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-epi-ink font-display text-2xl font-bold text-white">
              {businessName.charAt(0)}
            </div>
          )}
          <p className="text-xs font-semibold uppercase tracking-widest text-epi-gold">Mesa {tableLabel}</p>
          <h2 className="mt-1 font-display text-2xl font-bold text-epi-ink">¡Bienvenido a {businessName}!</h2>
          <p className="mt-2 text-sm text-epi-ink-variant">
            ¿Cómo te llamas? Así sabremos qué es de cada quien en la mesa.
          </p>
        </div>
        <input
          autoFocus
          value={name}
          maxLength={40}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Tu nombre"
          className="w-full rounded-lg border border-epi-outline-variant px-4 py-3 text-base text-epi-ink outline-none focus:border-epi-ink"
        />
        <button
          onClick={submit}
          className="mt-3 w-full rounded-lg bg-epi-ink py-3 text-sm font-semibold uppercase tracking-wide text-white active:scale-[0.99]"
        >
          {name.trim() ? `Continuar como ${name.trim()}` : "Ver la carta"}
        </button>
        {!name.trim() && (
          <button onClick={() => onDone("Invitado")} className="mt-2 w-full py-2 text-xs text-epi-ink-variant">
            Prefiero no decirlo
          </button>
        )}
      </div>
    </div>
  );
}
