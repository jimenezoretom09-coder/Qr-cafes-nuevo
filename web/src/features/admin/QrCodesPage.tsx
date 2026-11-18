import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import QRCode from "qrcode";
import type { TableDTO } from "@rms/shared";
import { api, getErrorMessage } from "../../lib/api";
import { fetchAssistantProfile } from "./assistant-api";
import { fetchTablesAdmin } from "./api";

function tableUrl(t: TableDTO) {
  return `${window.location.origin}/m/${t.publicToken}`;
}

function naturalSort(a: TableDTO, b: TableDTO) {
  return a.label.localeCompare(b.label, undefined, { numeric: true });
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/**
 * Codigos QR de las mesas, con el logo y los colores del cafe, listos para imprimir. Cada QR
 * lleva el codigo secreto de su mesa; si uno se filtra, "Cambiar código" invalida el viejo.
 */
export default function QrCodesPage() {
  const queryClient = useQueryClient();
  const { data: tables = [] } = useQuery({ queryKey: ["tables"], queryFn: fetchTablesAdmin });
  const { data: profile } = useQuery({ queryKey: ["assistant-profile"], queryFn: fetchAssistantProfile });
  const [images, setImages] = useState<Record<string, string>>({});

  const sorted = [...tables].sort(naturalSort);
  const color = profile?.primaryColor ?? "#1b1c1c";

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      sorted.map(async (t) => [t.id, await QRCode.toDataURL(tableUrl(t), { width: 600, margin: 1, color: { dark: color } })] as const)
    ).then((pairs) => {
      if (!cancelled) setImages(Object.fromEntries(pairs));
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tables, color]);

  const regenerate = useMutation({
    mutationFn: (id: string) => api.post(`/api/tables/${id}/regenerate-qr`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tables"] }),
  });

  function printAll() {
    const name = escapeHtml(profile?.name ?? "");
    const logo = profile?.logoUrl ? `<img class="logo" src="${escapeHtml(profile.logoUrl)}" />` : "";
    const cards = sorted
      .map(
        (t) => `<div class="card">
          ${logo}
          <p class="brand">${name}</p>
          <img class="qr" src="${images[t.id] ?? ""}" />
          <p class="table">Mesa ${escapeHtml(t.label)}</p>
          <p class="hint">Escanea con la cámara para ver la carta,<br/>pedir y seguir tu pedido en vivo</p>
        </div>`
      )
      .join("");
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"/><title>QR de las mesas</title>
      <style>
        body{font-family:system-ui,sans-serif;margin:0;padding:16px;background:#fff}
        .grid{display:grid;grid-template-columns:repeat(2,1fr);gap:16px}
        .card{border:3px solid ${color};border-radius:24px;padding:20px;text-align:center;page-break-inside:avoid}
        .logo{height:56px;width:56px;object-fit:cover;border-radius:50%}
        .brand{margin:6px 0 10px;font-weight:800;font-size:22px;color:${color}}
        .qr{width:100%;max-width:260px}
        .table{margin:10px 0 4px;font-size:30px;font-weight:900;color:${color}}
        .hint{margin:0;font-size:13px;color:#555}
      </style></head><body><div class="grid">${cards}</div>
      <script>window.onload=()=>setTimeout(()=>window.print(),300)</script></body></html>`);
    win.document.close();
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Códigos QR de las mesas</h2>
          <p className="text-sm text-slate-500">Cada mesa tiene su propio código. Imprímelos y pégalos en cada mesa.</p>
        </div>
        <button
          onClick={printAll}
          disabled={sorted.length === 0 || Object.keys(images).length < sorted.length}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          🖨 Imprimir todos
        </button>
      </div>
      {regenerate.isError && <p className="mb-3 text-sm font-medium text-red-600">{getErrorMessage(regenerate.error)}</p>}
      {sorted.length === 0 && <p className="text-slate-500">Primero crea las mesas en la sección Mesas.</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map((t) => (
          <div key={t.id} className="rounded-xl border border-slate-200 bg-white p-4 text-center">
            <p className="text-lg font-bold text-slate-800">Mesa {t.label}</p>
            {images[t.id] ? (
              <img src={images[t.id]} alt={`QR mesa ${t.label}`} className="mx-auto my-2 w-44" />
            ) : (
              <div className="mx-auto my-2 h-44 w-44 animate-pulse rounded bg-slate-100" />
            )}
            <div className="flex justify-center gap-2">
              <a
                href={tableUrl(t)}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700"
              >
                Probar
              </a>
              <button
                onClick={() => {
                  if (confirm(`¿Cambiar el código de la mesa ${t.label}? El QR impreso actual dejará de funcionar.`)) {
                    regenerate.mutate(t.id);
                  }
                }}
                className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-red-50 hover:text-red-600"
              >
                Cambiar código
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
