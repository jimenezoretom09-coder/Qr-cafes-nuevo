import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatCOP } from "@rms/shared";
import { fetchKitchenReport, fetchSalesReport } from "./api";

// toISOString() converts to UTC first, which can land on the wrong calendar day for users
// behind UTC (e.g. 7pm local can already be "tomorrow" in UTC) — build the string from the
// local date components instead so "today" matches the user's own calendar day.
function todayISO() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function ReportsPage() {
  const [from, setFrom] = useState(todayISO());
  const [to, setTo] = useState(todayISO());

  const salesQuery = useQuery({
    queryKey: ["reports", "sales", from, to],
    queryFn: () => fetchSalesReport(from, to),
  });
  const kitchenQuery = useQuery({
    queryKey: ["reports", "kitchen", from, to],
    queryFn: () => fetchKitchenReport(from, to),
  });

  const sales = salesQuery.data;
  const kitchen = kitchenQuery.data;
  const maxHourTotal = Math.max(1, ...(sales?.byHour.map((h) => h.total) ?? [0]));

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Reportes</h1>
        <div className="flex flex-wrap items-center gap-2">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm sm:flex-none" />
          <span className="text-slate-400">a</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm sm:flex-none" />
        </div>
      </div>

      {sales && (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <SummaryCard label="Ventas totales" value={formatCOP(sales.totalRevenue)} />
            <SummaryCard label="Cuentas cerradas" value={sales.totalOrders} />
            <SummaryCard label="Ticket promedio" value={formatCOP(sales.averageTicket)} />
            <SummaryCard label="Propinas" value={formatCOP(sales.totalTips)} />
          </div>

          <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="mb-4 font-bold text-slate-800">Ventas por hora</h2>
            {sales.byHour.length === 0 && <p className="text-slate-400">Sin ventas en este rango.</p>}
            <div className="space-y-1.5">
              {sales.byHour.map((h) => (
                <div key={h.hour} className="flex items-center gap-3">
                  <span className="w-14 text-sm text-slate-500">{h.hour}:00</span>
                  <div className="h-5 flex-1 rounded bg-slate-100">
                    <div
                      className="h-5 rounded bg-blue-500"
                      style={{ width: `${(h.total / maxHourTotal) * 100}%` }}
                    />
                  </div>
                  <span className="w-20 text-right text-sm font-semibold text-slate-700">{formatCOP(h.total)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="mb-3 font-bold text-slate-800">Ventas por categoría (bruto)</h2>
              <table className="w-full text-sm">
                <tbody>
                  {sales.byCategory.map((c) => (
                    <tr key={c.categoryId} className="border-t border-slate-100">
                      <td className="py-2 text-slate-700">{c.categoryName}</td>
                      <td className="py-2 text-right text-slate-500">{c.itemCount} platos</td>
                      <td className="py-2 text-right font-semibold text-slate-800">{formatCOP(c.grossTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="mb-3 font-bold text-slate-800">Ventas por mesero</h2>
              <table className="w-full text-sm">
                <tbody>
                  {sales.byWaiter.map((w) => (
                    <tr key={w.waiterId} className="border-t border-slate-100">
                      <td className="py-2 text-slate-700">{w.waiterName}</td>
                      <td className="py-2 text-right text-slate-500">{w.orderCount} cuentas</td>
                      <td className="py-2 text-right font-semibold text-slate-800">{formatCOP(w.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {kitchen && (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-3 font-bold text-slate-800">Rendimiento de cocina por estación</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="pb-2">Estación</th>
                <th className="pb-2 text-right">Platos</th>
                <th className="pb-2 text-right">Tiempo prom.</th>
                <th className="pb-2 text-right">Demorados</th>
              </tr>
            </thead>
            <tbody>
              {kitchen.byStation.map((s) => (
                <tr key={s.stationId} className="border-t border-slate-100">
                  <td className="py-2 text-slate-700">{s.stationName}</td>
                  <td className="py-2 text-right text-slate-500">{s.itemCount}</td>
                  <td className="py-2 text-right text-slate-500">{s.avgPrepMinutes.toFixed(1)} min</td>
                  <td className={`py-2 text-right font-semibold ${s.delayedCount > 0 ? "text-red-600" : "text-emerald-600"}`}>
                    {s.delayedCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <p className="text-2xl font-bold text-slate-800">{value}</p>
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  );
}
