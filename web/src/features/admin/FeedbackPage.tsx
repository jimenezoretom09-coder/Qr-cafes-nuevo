import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";

interface FeedbackResponse {
  count: number;
  average: number | null;
  byRating: { stars: number; count: number }[];
  items: { id: string; tableLabel: string; dinerName: string | null; rating: number; comment: string | null; createdAt: string }[];
}

const stars = (n: number) => "★".repeat(n) + "☆".repeat(5 - n);

/** Lo que dicen los clientes al terminar su visita (desde el celular, despues de pagar). */
export default function FeedbackPage() {
  const { data } = useQuery({
    queryKey: ["feedback"],
    queryFn: async () => (await api.get<FeedbackResponse>("/api/feedback")).data,
    refetchInterval: 60_000,
  });

  if (!data) return <p className="text-slate-400">Cargando…</p>;

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-800">Opiniones de los clientes</h2>
      <p className="mb-4 text-sm text-slate-500">
        Cada cliente puede calificar su visita desde el celular al pagar. Las de 3 estrellas o menos te llegan como aviso
        al celular.
      </p>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase text-slate-500">Promedio</p>
          <p className="text-3xl font-extrabold text-slate-800">{data.average ? data.average.toFixed(1) : "—"}</p>
          <p className="text-amber-500">{data.average ? stars(Math.round(data.average)) : ""}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase text-slate-500">Opiniones</p>
          <p className="text-3xl font-extrabold text-slate-800">{data.count}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
          {data.byRating.map((r) => (
            <div key={r.stars} className="flex items-center gap-2">
              <span className="w-20 text-amber-500">{"★".repeat(r.stars)}</span>
              <div className="h-2 flex-1 overflow-hidden rounded bg-slate-100">
                <div className="h-full bg-amber-400" style={{ width: `${data.count ? (r.count / data.count) * 100 : 0}%` }} />
              </div>
              <span className="w-6 text-right text-slate-500">{r.count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {data.items.map((f) => (
          <div key={f.id} className={`rounded-xl border bg-white p-4 ${f.rating <= 3 ? "border-red-200" : "border-slate-200"}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-lg text-amber-500">{stars(f.rating)}</span>
              <span className="text-xs text-slate-500">
                Mesa {f.tableLabel} · {f.dinerName ?? "Cliente"} · {new Date(f.createdAt).toLocaleString("es-CO")}
              </span>
            </div>
            {f.comment && <p className="mt-1 text-slate-700">{f.comment}</p>}
          </div>
        ))}
        {data.items.length === 0 && <p className="text-slate-400">Todavía no hay opiniones.</p>}
      </div>
    </div>
  );
}
