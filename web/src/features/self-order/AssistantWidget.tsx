import { useEffect, useRef, useState } from "react";
import { formatCOP } from "@rms/shared";
import { api } from "../../lib/api";
import { getDinerId } from "./brand";
import type { CartLine } from "./SelfOrderScreen";

type CartAddition = Omit<CartLine, "key">;

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  added?: CartAddition[];
}

const SUGGESTIONS = ["¿Qué me recomiendas?", "Quiero un capuchino", "¿Cómo va mi pedido?"];

export default function AssistantWidget({
  tableToken,
  dinerName,
  onCartAdditions,
  onOpenCart,
}: {
  tableToken?: string;
  dinerName?: string | null;
  onCartAdditions?: (lines: CartAddition[]) => void;
  onOpenCart?: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const messagesRef = useRef<HTMLDivElement>(null);
  const visitorId = useRef(getDinerId());

  useEffect(() => {
    messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight });
  }, [messages, isOpen]);

  async function send(preset?: string) {
    const text = (preset ?? input).trim();
    if (!text || sending) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text }]);
    setSending(true);

    try {
      const { data } = await api.post<{ reply: string; cartAdditions?: CartAddition[] }>(
        "/api/public/asistente/mensaje",
        {
          visitorId: visitorId.current,
          message: text,
          tableToken,
          dinerName: dinerName ?? undefined,
        }
      );
      const added = data.cartAdditions ?? [];
      setMessages((prev) => [...prev, { role: "assistant", text: data.reply, added }]);
      if (added.length > 0) onCartAdditions?.(added);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "No pude responder en este momento. Intenta de nuevo o pregúntale a un mesero." },
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen((v) => !v)}
        aria-label="Abrir asistente"
        className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-epi-ink text-2xl text-white shadow-lg transition active:scale-95"
      >
        {isOpen ? "✕" : "💬"}
      </button>

      {isOpen && (
        <div className="fixed inset-x-4 bottom-40 z-40 flex max-h-[60vh] flex-col overflow-hidden rounded-2xl bg-epi-surface font-body shadow-2xl sm:inset-x-auto sm:right-4 sm:w-96">
          <div className="bg-epi-ink px-4 py-3 text-white">
            <p className="font-display font-bold">Asistente</p>
            <p className="text-xs text-epi-outline-variant">Pregunta, pide o consulta tu pedido</p>
          </div>

          <div ref={messagesRef} className="flex-1 space-y-2 overflow-y-auto bg-epi-surface-low p-3">
            {messages.length === 0 && (
              <div className="p-2 text-center text-sm text-epi-ink-variant">
                <p>¡Hola{dinerName && dinerName !== "Invitado" ? ` ${dinerName}` : ""}! 👋 Puedo recomendarte algo, tomarte el pedido o contarte cómo va.</p>
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  {SUGGESTIONS.map((sug) => (
                    <button
                      key={sug}
                      onClick={() => send(sug)}
                      className="rounded-full border border-epi-outline-variant bg-epi-surface px-3 py-1 text-xs text-epi-ink"
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i}>
                <div
                  className={`max-w-[85%] whitespace-pre-line rounded-2xl px-3 py-2 text-sm ${
                    m.role === "user"
                      ? "ml-auto rounded-br-sm bg-epi-ink text-white"
                      : "rounded-bl-sm bg-epi-surface-container text-epi-ink"
                  }`}
                >
                  {m.text}
                </div>
                {m.added && m.added.length > 0 && (
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      onOpenCart?.();
                    }}
                    className="mt-1 max-w-[85%] rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-left text-xs text-emerald-900"
                  >
                    🛒 En tu pedido:{" "}
                    {m.added
                      .map((a) => `${a.quantity}× ${a.name} (${formatCOP((a.unitPrice + a.modifiersPriceDelta) * a.quantity)})`)
                      .join(", ")}
                    <span className="mt-1 block font-bold">Ver y confirmar →</span>
                  </button>
                )}
              </div>
            ))}
            {sending && (
              <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-epi-surface-container px-3 py-2 text-sm text-epi-ink-variant">
                …
              </div>
            )}
          </div>

          <div className="flex gap-2 border-t border-epi-outline-variant/50 bg-epi-surface p-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Escribe aquí..."
              className="min-w-0 flex-1 rounded-full border border-epi-outline-variant px-3 py-2 text-sm"
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || sending}
              className="rounded-full bg-epi-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              Enviar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
