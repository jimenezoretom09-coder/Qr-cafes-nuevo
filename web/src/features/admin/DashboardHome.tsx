import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchTablesAdmin } from "./api";
import { useSocketEvent } from "../../lib/use-socket-event";

export default function DashboardHome() {
  const queryClient = useQueryClient();
  const { data: tables = [], isFetched } = useQuery({ queryKey: ["tables"], queryFn: fetchTablesAdmin });

  useSocketEvent("table:status_changed", () => {
    queryClient.invalidateQueries({ queryKey: ["tables"] });
  });

  const counts = {
    FREE: tables.filter((t) => t.status === "FREE").length,
    OCCUPIED: tables.filter((t) => t.status === "OCCUPIED").length,
    BILL_REQUESTED: tables.filter((t) => t.status === "BILL_REQUESTED").length,
    RESERVED: tables.filter((t) => t.status === "RESERVED").length,
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-800">Resumen en vivo</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Mesas libres" value={counts.FREE} color="bg-emerald-500" />
        <StatCard label="Mesas ocupadas" value={counts.OCCUPIED} color="bg-amber-500" />
        <StatCard label="Cuenta pedida" value={counts.BILL_REQUESTED} color="bg-red-500" />
        <StatCard label="Reservadas" value={counts.RESERVED} color="bg-slate-500" />
      </div>

      {isFetched && tables.length === 0 ? (
        // Restaurante recien instalado, todavia sin configurar: en vez de un tablero en ceros,
        // se le muestra al dueño el orden en que conviene armar todo.
        <div className="mt-8 rounded-xl border border-blue-200 bg-blue-50 p-6">
          <p className="font-semibold text-blue-900">Primeros pasos para dejar listo tu restaurante</p>
          <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-blue-900">
            <li>
              <b>Menú</b>: crea tus estaciones de cocina (ej: Parrilla, Barra), tus categorías y tus platos con
              precio.
            </li>
            <li>
              <b>Mesas</b>: agrega cada mesa con su nombre — de ahí salen los códigos QR.
            </li>
            <li>
              <b>Extras</b> (opcional): opciones como "¿con qué proteína?" o adicionales con precio.
            </li>
            <li>
              <b>Usuarios</b>: crea a tus meseros, cocina y caja, cada uno con su PIN. Cambia también el PIN del
              Administrador.
            </li>
            <li>
              <b>Asistente IA</b>: dirección, teléfono y horario, para que el asistente responda bien a los
              comensales.
            </li>
          </ol>
        </div>
      ) : (
        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6">
          <p className="font-semibold text-slate-700">Reportes de ventas, cocina y fidelización de clientes</p>
          <p className="mt-1 text-sm text-slate-500">
            Las ventas del día, los tiempos de cocina y los clientes frecuentes están en "Reportes" y
            "Clientes".
          </p>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className={`mb-2 h-2 w-10 rounded-full ${color}`} />
      <p className="text-3xl font-bold text-slate-800">{value}</p>
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  );
}
