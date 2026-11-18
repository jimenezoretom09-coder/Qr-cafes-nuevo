import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createStation, deleteStation, fetchStationsAdmin, updateStation } from "./api";

const COLOR_OPTIONS = [
  { value: "#dc2626", label: "Rojo" },
  { value: "#2563eb", label: "Azul" },
  { value: "#16a34a", label: "Verde" },
  { value: "#d97706", label: "Naranja" },
  { value: "#7c3aed", label: "Morado" },
  { value: "#64748b", label: "Gris" },
];

/**
 * Las estaciones de cocina (Parrilla, Barra, etc.) deciden en qué pantalla de Cocina aparece
 * cada plato. Antes solo se podían crear por script — sin esto, un restaurante nuevo no podía
 * agregar ni un plato, porque el formulario exige elegir una estación y no existía ninguna.
 */
export default function StationManager() {
  const queryClient = useQueryClient();
  const { data: stations, isSuccess } = useQuery({ queryKey: ["stations"], queryFn: fetchStationsAdmin });
  const [nombre, setNombre] = useState("");
  const [color, setColor] = useState(COLOR_OPTIONS[0].value);
  const [open, setOpen] = useState(false);

  // Se abre solo la primera vez que se confirma que no hay ninguna estación — es el bloqueo
  // real que impide agregar platos, así que conviene que salte a la vista sin que haya que
  // buscarlo.
  useEffect(() => {
    if (isSuccess && stations.length === 0) setOpen(true);
  }, [isSuccess, stations]);

  const invalidar = () => queryClient.invalidateQueries({ queryKey: ["stations"] });

  const crear = useMutation({
    mutationFn: () => createStation({ name: nombre, color }),
    onSuccess: () => {
      setNombre("");
      invalidar();
    },
  });

  const renombrar = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => updateStation(id, { name }),
    onSuccess: invalidar,
  });

  const cambiarColor = useMutation({
    mutationFn: ({ id, color }: { id: string; color: string }) => updateStation(id, { color }),
    onSuccess: invalidar,
  });

  const eliminar = useMutation({
    mutationFn: deleteStation,
    onSuccess: invalidar,
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        "No se pudo eliminar la estación.";
      alert(msg);
    },
  });

  return (
    <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-left"
      >
        <div>
          <h2 className="font-bold text-slate-800">Estaciones de cocina</h2>
          <p className="text-xs text-slate-500">
            A qué pantalla de Cocina llega cada plato (Parrilla, Barra, Postres...).
          </p>
        </div>
        <span className="text-sm font-semibold text-blue-600">{open ? "Ocultar" : "Ver / editar"}</span>
      </button>

      {open && (
        <div className="mt-4">
          <div className="flex flex-wrap gap-2">
            {(stations ?? []).map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-2 rounded-full border border-slate-200 py-1 pl-1 pr-3"
              >
                <span
                  className="h-5 w-5 shrink-0 rounded-full"
                  style={{ backgroundColor: s.color }}
                  title={s.color}
                />
                <input
                  defaultValue={s.name}
                  onBlur={(e) => {
                    if (e.target.value.trim() && e.target.value !== s.name) {
                      renombrar.mutate({ id: s.id, name: e.target.value.trim() });
                    }
                  }}
                  className="w-28 border-none bg-transparent text-sm font-medium text-slate-700 focus:outline-none"
                />
                <select
                  value={s.color}
                  onChange={(e) => cambiarColor.mutate({ id: s.id, color: e.target.value })}
                  className="rounded border-none bg-transparent text-xs text-slate-400"
                >
                  {COLOR_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => eliminar.mutate(s.id)}
                  className="text-slate-300 hover:text-red-500"
                  title="Eliminar estación"
                >
                  ✕
                </button>
              </div>
            ))}
            {(stations ?? []).length === 0 && (
              <p className="text-sm text-slate-400">
                Todavía no hay estaciones — crea la primera abajo para poder agregar platos.
              </p>
            )}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nueva estación (ej: Parrilla, Barra, Postres)"
              className="min-w-0 flex-1 rounded border border-slate-300 px-3 py-2 text-sm"
            />
            <select
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="rounded border border-slate-300 px-3 py-2 text-sm"
            >
              {COLOR_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            <button
              onClick={() => crear.mutate()}
              disabled={!nombre.trim()}
              className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              Crear estación
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
