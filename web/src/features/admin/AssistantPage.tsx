import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getErrorMessage } from "../../lib/api";
import {
  createFaq,
  deleteFaq,
  dismissUnansweredQuestion,
  fetchAssistantHours,
  fetchAssistantProfile,
  fetchFaq,
  fetchUnansweredQuestions,
  promoteUnansweredToFaq,
  saveAssistantHour,
  updateAssistantProfile,
} from "./assistant-api";

const DAY_LABELS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export default function AssistantPage() {
  const queryClient = useQueryClient();

  const { data: profile } = useQuery({ queryKey: ["assistant-profile"], queryFn: fetchAssistantProfile });
  const { data: hours = [] } = useQuery({ queryKey: ["assistant-hours"], queryFn: fetchAssistantHours });
  const { data: faq = [] } = useQuery({ queryKey: ["assistant-faq"], queryFn: fetchFaq });
  const { data: unanswered = [] } = useQuery({
    queryKey: ["assistant-unanswered"],
    queryFn: fetchUnansweredQuestions,
    refetchInterval: 30_000,
  });

  const [profileForm, setProfileForm] = useState({
    name: "",
    description: "",
    tone: "",
    address: "",
    phone: "",
    policies: "",
    logoUrl: "",
    primaryColor: "#1b1c1c",
    accentColor: "#775a19",
  });
  useEffect(() => {
    if (profile) {
      setProfileForm({
        name: profile.name,
        description: profile.description ?? "",
        tone: profile.tone ?? "",
        address: profile.address ?? "",
        phone: profile.phone ?? "",
        policies: profile.policies ?? "",
        logoUrl: profile.logoUrl ?? "",
        primaryColor: profile.primaryColor,
        accentColor: profile.accentColor,
      });
    }
  }, [profile]);

  const profileMutation = useMutation({
    mutationFn: () => updateAssistantProfile({ ...profileForm, logoUrl: profileForm.logoUrl.trim() || null }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["assistant-profile"] }),
  });

  const hourMutation = useMutation({
    mutationFn: ({ dayOfWeek, opensAt, closesAt, closed }: {
      dayOfWeek: number;
      opensAt: string;
      closesAt: string;
      closed: boolean;
    }) => saveAssistantHour(dayOfWeek, { opensAt, closesAt, closed }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["assistant-hours"] }),
  });

  const [faqForm, setFaqForm] = useState({ question: "", answer: "" });
  const faqMutation = useMutation({
    mutationFn: () => createFaq(faqForm),
    onSuccess: () => {
      setFaqForm({ question: "", answer: "" });
      queryClient.invalidateQueries({ queryKey: ["assistant-faq"] });
    },
  });
  const deleteFaqMutation = useMutation({
    mutationFn: (id: string) => deleteFaq(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["assistant-faq"] }),
  });

  const [answeringId, setAnsweringId] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState("");
  const promoteMutation = useMutation({
    mutationFn: ({ id, answer }: { id: string; answer: string }) => promoteUnansweredToFaq(id, answer),
    onSuccess: () => {
      setAnsweringId(null);
      setAnswerText("");
      queryClient.invalidateQueries({ queryKey: ["assistant-unanswered"] });
      queryClient.invalidateQueries({ queryKey: ["assistant-faq"] });
    },
  });
  const dismissMutation = useMutation({
    mutationFn: (id: string) => dismissUnansweredQuestion(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["assistant-unanswered"] }),
  });

  function hourFor(dayOfWeek: number) {
    return hours.find((h) => h.dayOfWeek === dayOfWeek);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Asistente de IA</h1>

      {unanswered.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="font-bold text-amber-900">
            Preguntas sin responder ({unanswered.length})
          </h2>
          <p className="mb-3 text-sm text-amber-800">
            El asistente no supo responder estas preguntas. Enséñale la respuesta correcta y quedará disponible
            para la próxima vez.
          </p>
          <div className="space-y-2">
            {unanswered.map((q) => (
              <div key={q.id} className="rounded-lg bg-white p-3 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-slate-800">
                    {q.question}{" "}
                    {q.timesAsked > 1 && (
                      <span className="text-xs font-normal text-slate-400">(preguntada {q.timesAsked} veces)</span>
                    )}
                  </p>
                  {answeringId !== q.id && (
                    <div className="flex shrink-0 gap-2">
                      <button
                        onClick={() => {
                          setAnsweringId(q.id);
                          setAnswerText("");
                        }}
                        className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white"
                      >
                        Convertir en FAQ
                      </button>
                      <button
                        onClick={() => dismissMutation.mutate(q.id)}
                        className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600"
                      >
                        Descartar
                      </button>
                    </div>
                  )}
                </div>
                {answeringId === q.id && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <input
                      value={answerText}
                      onChange={(e) => setAnswerText(e.target.value)}
                      placeholder="Escribe la respuesta correcta..."
                      className="min-w-0 flex-1 rounded border border-slate-300 px-2 py-1.5 text-sm"
                      autoFocus
                    />
                    <button
                      onClick={() => promoteMutation.mutate({ id: q.id, answer: answerText })}
                      disabled={!answerText.trim()}
                      className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
                    >
                      Guardar
                    </button>
                    <button
                      onClick={() => setAnsweringId(null)}
                      className="rounded bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 font-bold text-slate-800">Perfil y marca del café</h2>
        <p className="mb-3 text-xs text-slate-500">
          El nombre, el logo y los colores son los que ven los clientes en la carta y en los QR. El resto lo usa el
          asistente para responder preguntas sobre el negocio.
        </p>
        <div className="mb-4 grid grid-cols-1 gap-3 rounded-lg bg-slate-50 p-3 sm:grid-cols-3">
          <label className="text-xs font-semibold text-slate-600 sm:col-span-3">
            Logo (dirección de la imagen, ej. /medios/logo.png)
            <input
              placeholder="https://… o /medios/logo.png"
              value={profileForm.logoUrl}
              onChange={(e) => setProfileForm({ ...profileForm, logoUrl: e.target.value })}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm font-normal"
            />
          </label>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <input
              type="color"
              value={profileForm.primaryColor}
              onChange={(e) => setProfileForm({ ...profileForm, primaryColor: e.target.value })}
              className="h-9 w-12 rounded border border-slate-300"
            />
            Color principal (oscuro: botones y textos)
          </label>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <input
              type="color"
              value={profileForm.accentColor}
              onChange={(e) => setProfileForm({ ...profileForm, accentColor: e.target.value })}
              className="h-9 w-12 rounded border border-slate-300"
            />
            Color de acento (precios y detalles)
          </label>
          <div className="flex items-center gap-2">
            {profileForm.logoUrl && <img src={profileForm.logoUrl} alt="" className="h-10 w-10 rounded-full object-cover" />}
            <span className="rounded px-3 py-2 text-xs font-bold text-white" style={{ backgroundColor: profileForm.primaryColor }}>
              Agregar al pedido
            </span>
            <span className="text-sm font-bold" style={{ color: profileForm.accentColor }}>$8.500</span>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <input
            placeholder="Nombre del café"
            value={profileForm.name}
            onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
            className="rounded border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            placeholder="Teléfono"
            value={profileForm.phone}
            onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
            className="rounded border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            placeholder="Dirección"
            value={profileForm.address}
            onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
            className="rounded border border-slate-300 px-3 py-2 text-sm sm:col-span-2"
          />
          <textarea
            placeholder="Descripción breve del café"
            value={profileForm.description}
            onChange={(e) => setProfileForm({ ...profileForm, description: e.target.value })}
            className="rounded border border-slate-300 px-3 py-2 text-sm sm:col-span-2"
            rows={2}
          />
          <input
            placeholder="Tono (ej: cercano y familiar, formal...)"
            value={profileForm.tone}
            onChange={(e) => setProfileForm({ ...profileForm, tone: e.target.value })}
            className="rounded border border-slate-300 px-3 py-2 text-sm sm:col-span-2"
          />
          <textarea
            placeholder="Políticas (ej: no se aceptan mascotas, parqueadero gratis...)"
            value={profileForm.policies}
            onChange={(e) => setProfileForm({ ...profileForm, policies: e.target.value })}
            className="rounded border border-slate-300 px-3 py-2 text-sm sm:col-span-2"
            rows={2}
          />
        </div>
        <button
          onClick={() => profileMutation.mutate()}
          disabled={profileMutation.isPending}
          className="mt-3 rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          Guardar perfil
        </button>
        {profileMutation.isError && (
          <p className="mt-2 text-sm font-medium text-red-600">{getErrorMessage(profileMutation.error)}</p>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 font-bold text-slate-800">Horario</h2>
        <div className="space-y-2">
          {DAY_LABELS.map((label, dayOfWeek) => {
            const existing = hourFor(dayOfWeek);
            return (
              <div key={dayOfWeek} className="flex flex-wrap items-center gap-2 text-sm">
                <span className="w-24 shrink-0 font-medium text-slate-700">{label}</span>
                <label className="flex items-center gap-1.5 text-xs text-slate-500">
                  <input
                    type="checkbox"
                    checked={existing?.closed ?? false}
                    onChange={(e) =>
                      hourMutation.mutate({
                        dayOfWeek,
                        opensAt: existing?.opensAt ?? "08:00",
                        closesAt: existing?.closesAt ?? "20:00",
                        closed: e.target.checked,
                      })
                    }
                  />
                  Cerrado
                </label>
                {!(existing?.closed ?? false) && (
                  <>
                    <input
                      type="time"
                      defaultValue={existing?.opensAt ?? "08:00"}
                      onBlur={(e) =>
                        hourMutation.mutate({
                          dayOfWeek,
                          opensAt: e.target.value,
                          closesAt: existing?.closesAt ?? "20:00",
                          closed: false,
                        })
                      }
                      className="rounded border border-slate-300 px-2 py-1"
                    />
                    <span className="text-slate-400">a</span>
                    <input
                      type="time"
                      defaultValue={existing?.closesAt ?? "20:00"}
                      onBlur={(e) =>
                        hourMutation.mutate({
                          dayOfWeek,
                          opensAt: existing?.opensAt ?? "08:00",
                          closesAt: e.target.value,
                          closed: false,
                        })
                      }
                      className="rounded border border-slate-300 px-2 py-1"
                    />
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 font-bold text-slate-800">Preguntas frecuentes</h2>
        <div className="mb-3 flex flex-wrap gap-2">
          <input
            placeholder="Pregunta"
            value={faqForm.question}
            onChange={(e) => setFaqForm({ ...faqForm, question: e.target.value })}
            className="min-w-0 flex-1 rounded border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            placeholder="Respuesta"
            value={faqForm.answer}
            onChange={(e) => setFaqForm({ ...faqForm, answer: e.target.value })}
            className="min-w-0 flex-1 rounded border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            onClick={() => faqMutation.mutate()}
            disabled={!faqForm.question.trim() || !faqForm.answer.trim()}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            Agregar
          </button>
        </div>
        <div className="divide-y divide-slate-100">
          {faq.map((f) => (
            <div key={f.id} className="flex items-start justify-between gap-2 py-2">
              <div>
                <p className="text-sm font-medium text-slate-800">{f.question}</p>
                <p className="text-sm text-slate-500">{f.answer}</p>
              </div>
              <button
                onClick={() => deleteFaqMutation.mutate(f.id)}
                className="shrink-0 text-slate-300 hover:text-red-500"
                title="Eliminar"
              >
                🗑
              </button>
            </div>
          ))}
          {faq.length === 0 && <p className="py-2 text-sm text-slate-400">Todavía no hay preguntas frecuentes.</p>}
        </div>
      </div>
    </div>
  );
}
