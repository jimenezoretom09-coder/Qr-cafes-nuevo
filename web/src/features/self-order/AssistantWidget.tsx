import { useEffect, useRef, useState } from "react";
import { api } from "../../lib/api";

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

function getOrCreateVisitorId(): string {
  const key = "self-order-assistant-visitor-id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

export default function AssistantWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const messagesRef = useRef<HTMLDivElement>(null);
  const visitorId = useRef(getOrCreateVisitorId());

  useEffect(() => {
    messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight });
  }, [messages, isOpen]);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text }]);
    setSending(true);

    try {
      const { data } = await api.post<{ reply: string }>("/api/public/asistente/mensaje", {
        visitorId: visitorId.current,
        message: text,
      });
      setMessages((prev) => [...prev, { role: "assistant", text: data.reply }]);
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
            <p className="font-display font-bold">Pregúntanos algo</p>
            <p className="text-xs text-epi-outline-variant">Sobre el menú, horarios, o lo que necesites</p>
          </div>

          <div ref={messagesRef} className="flex-1 space-y-2 overflow-y-auto bg-epi-surface-low p-3">
            {messages.length === 0 && (
              <p className="p-2 text-center text-sm text-epi-ink-variant">
                ¡Hola! 👋 Pregúntame sobre los platos, ingredientes, horarios, o cualquier duda del restaurante.
              </p>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                  m.role === "user"
                    ? "ml-auto rounded-br-sm bg-epi-ink text-white"
                    : "rounded-bl-sm bg-epi-surface-container text-epi-ink"
                }`}
              >
                {m.text}
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
              placeholder="Escribe tu pregunta..."
              className="min-w-0 flex-1 rounded-full border border-epi-outline-variant px-3 py-2 text-sm"
            />
            <button
              onClick={send}
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
