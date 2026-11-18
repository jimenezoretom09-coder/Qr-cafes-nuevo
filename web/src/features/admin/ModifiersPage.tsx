import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatCOP } from "@rms/shared";
import { fetchMenuAdmin } from "./api";
import {
  addModifier,
  createModifierGroup,
  deleteModifier,
  deleteModifierGroup,
  fetchModifierGroups,
  setModifierGroupItems,
  updateModifierGroup,
} from "./modifiers-api";

/**
 * Extras y adicionales: define con que se puede pedir cada plato.
 *
 * Un grupo agrupa opciones que van juntas ("¿Con qué proteína?" con carne de res, cerdo,
 * costilla...) y se conecta a los platos donde aplica. Al pedir ese plato, el mesero ve esas
 * opciones y lo que elija sale impreso en cocina.
 */
export default function ModifiersPage() {
  const queryClient = useQueryClient();
  const { data: grupos = [] } = useQuery({ queryKey: ["modifier-groups"], queryFn: fetchModifierGroups });
  const { data: categorias = [] } = useQuery({ queryKey: ["menu"], queryFn: fetchMenuAdmin });

  const invalidar = () => queryClient.invalidateQueries({ queryKey: ["modifier-groups"] });

  const [nuevoGrupo, setNuevoGrupo] = useState({ name: "", minSelect: 0, maxSelect: 1 });
  const [opcionPorGrupo, setOpcionPorGrupo] = useState<Record<string, { name: string; priceDelta: string }>>({});
  const [editandoPlatos, setEditandoPlatos] = useState<string | null>(null);

  const crearGrupo = useMutation({
    mutationFn: () => createModifierGroup(nuevoGrupo),
    onSuccess: () => {
      setNuevoGrupo({ name: "", minSelect: 0, maxSelect: 1 });
      invalidar();
    },
  });
  const borrarGrupo = useMutation({ mutationFn: deleteModifierGroup, onSuccess: invalidar });
  const cambiarGrupo = useMutation({
    mutationFn: ({ id, ...campos }: { id: string; minSelect?: number; maxSelect?: number; name?: string }) =>
      updateModifierGroup(id, campos),
    onSuccess: invalidar,
  });
  const agregarOpcion = useMutation({
    mutationFn: ({ groupId, name, priceDelta }: { groupId: string; name: string; priceDelta: number }) =>
      addModifier(groupId, { name, priceDelta }),
    onSuccess: (_d, vars) => {
      setOpcionPorGrupo((prev) => ({ ...prev, [vars.groupId]: { name: "", priceDelta: "" } }));
      invalidar();
    },
  });
  const borrarOpcion = useMutation({ mutationFn: deleteModifier, onSuccess: invalidar });
  const guardarPlatos = useMutation({
    mutationFn: ({ groupId, itemIds }: { groupId: string; itemIds: string[] }) =>
      setModifierGroupItems(groupId, itemIds),
    onSuccess: () => {
      setEditandoPlatos(null);
      invalidar();
    },
  });

  const todosLosPlatos = categorias.flatMap((c) => c.items.map((i) => ({ ...i, categoria: c.name })));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Extras y adicionales</h1>
        <p className="mt-1 text-sm text-slate-500">
          Define con qué se puede pedir cada plato. Lo que el mesero elija sale impreso en cocina.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 font-bold text-slate-800">Nuevo grupo de opciones</h2>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[220px] flex-1">
            <label className="mb-1 block text-xs font-semibold text-slate-500">Nombre del grupo</label>
            <input
              value={nuevoGrupo.name}
              onChange={(e) => setNuevoGrupo({ ...nuevoGrupo, name: e.target.value })}
              placeholder="Ej: ¿Con qué proteína? / Adicionales"
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">Mínimo a elegir</label>
            <input
              type="number"
              min={0}
              value={nuevoGrupo.minSelect}
              onChange={(e) => setNuevoGrupo({ ...nuevoGrupo, minSelect: Number(e.target.value) })}
              className="w-24 rounded border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">Máximo a elegir</label>
            <input
              type="number"
              min={1}
              value={nuevoGrupo.maxSelect}
              onChange={(e) => setNuevoGrupo({ ...nuevoGrupo, maxSelect: Number(e.target.value) })}
              className="w-24 rounded border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <button
            onClick={() => crearGrupo.mutate()}
            disabled={!nuevoGrupo.name.trim()}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            Crear grupo
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Mínimo 1 obliga a elegir (ej: la proteína de los frijoles). Mínimo 0 lo deja opcional (ej:
          adicionales). El máximo define cuántas opciones puede marcar el mesero.
        </p>
      </div>

      {grupos.length === 0 && (
        <p className="text-sm text-slate-400">Todavía no hay grupos de extras.</p>
      )}

      {grupos.map((grupo) => {
        const borrador = opcionPorGrupo[grupo.id] ?? { name: "", priceDelta: "" };
        return (
          <div key={grupo.id} className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-bold text-slate-800">{grupo.name}</h2>
                <p className="text-xs text-slate-400">
                  {grupo.minSelect > 0 ? `Obligatorio: elige ${grupo.minSelect}` : "Opcional"} · hasta{" "}
                  {grupo.maxSelect}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-500">
                  Mín
                  <input
                    type="number"
                    min={0}
                    defaultValue={grupo.minSelect}
                    onBlur={(e) =>
                      Number(e.target.value) !== grupo.minSelect &&
                      cambiarGrupo.mutate({ id: grupo.id, minSelect: Number(e.target.value) })
                    }
                    className="ml-1 w-14 rounded border border-slate-200 px-2 py-1"
                  />
                </label>
                <label className="text-xs text-slate-500">
                  Máx
                  <input
                    type="number"
                    min={1}
                    defaultValue={grupo.maxSelect}
                    onBlur={(e) =>
                      Number(e.target.value) !== grupo.maxSelect &&
                      cambiarGrupo.mutate({ id: grupo.id, maxSelect: Number(e.target.value) })
                    }
                    className="ml-1 w-14 rounded border border-slate-200 px-2 py-1"
                  />
                </label>
                <button
                  onClick={() => {
                    if (confirm(`¿Eliminar el grupo "${grupo.name}"? Las cuentas ya cobradas no cambian.`)) {
                      borrarGrupo.mutate(grupo.id);
                    }
                  }}
                  className="text-slate-300 hover:text-red-500"
                  title="Eliminar grupo"
                >
                  🗑
                </button>
              </div>
            </div>

            <div className="mb-3 flex flex-wrap gap-2">
              {grupo.modifiers.map((op) => (
                <span
                  key={op.id}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm"
                >
                  <span className="font-medium text-slate-700">{op.name}</span>
                  <span className="text-xs text-slate-500">
                    {op.priceDelta > 0 ? `+${formatCOP(op.priceDelta)}` : "sin costo"}
                  </span>
                  <button
                    onClick={() => borrarOpcion.mutate(op.id)}
                    className="text-slate-300 hover:text-red-500"
                    title="Quitar opción"
                  >
                    ✕
                  </button>
                </span>
              ))}
              {grupo.modifiers.length === 0 && (
                <span className="text-sm text-slate-400">Sin opciones todavía.</span>
              )}
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              <input
                value={borrador.name}
                onChange={(e) =>
                  setOpcionPorGrupo((prev) => ({ ...prev, [grupo.id]: { ...borrador, name: e.target.value } }))
                }
                placeholder="Nueva opción (ej: Costilla)"
                className="min-w-0 flex-1 rounded border border-slate-300 px-3 py-2 text-sm"
              />
              <input
                type="number"
                step="0.1"
                min={0}
                value={borrador.priceDelta}
                onChange={(e) =>
                  setOpcionPorGrupo((prev) => ({
                    ...prev,
                    [grupo.id]: { ...borrador, priceDelta: e.target.value },
                  }))
                }
                placeholder="Precio (4 = $4.000)"
                className="w-40 rounded border border-slate-300 px-3 py-2 text-sm"
              />
              <button
                onClick={() =>
                  agregarOpcion.mutate({
                    groupId: grupo.id,
                    name: borrador.name,
                    priceDelta: Number(borrador.priceDelta) || 0,
                  })
                }
                disabled={!borrador.name.trim()}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
              >
                Agregar opción
              </button>
            </div>

            <div className="border-t border-slate-100 pt-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-slate-600">
                  <span className="font-semibold">Aparece en:</span>{" "}
                  {grupo.itemNames.length > 0 ? grupo.itemNames.join(", ") : "ningún plato todavía"}
                </p>
                <button
                  onClick={() => setEditandoPlatos(editandoPlatos === grupo.id ? null : grupo.id)}
                  className="text-sm font-semibold text-blue-600"
                >
                  {editandoPlatos === grupo.id ? "Cerrar" : "Elegir platos"}
                </button>
              </div>

              {editandoPlatos === grupo.id && (
                <PlatosSelector
                  platos={todosLosPlatos}
                  seleccionados={grupo.itemIds}
                  onGuardar={(itemIds) => guardarPlatos.mutate({ groupId: grupo.id, itemIds })}
                  guardando={guardarPlatos.isPending}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PlatosSelector({
  platos,
  seleccionados,
  onGuardar,
  guardando,
}: {
  platos: { id: string; name: string; categoria: string }[];
  seleccionados: string[];
  onGuardar: (itemIds: string[]) => void;
  guardando: boolean;
}) {
  const [marcados, setMarcados] = useState<string[]>(seleccionados);

  const porCategoria = platos.reduce<Record<string, typeof platos>>((acc, plato) => {
    (acc[plato.categoria] ??= []).push(plato);
    return acc;
  }, {});

  return (
    <div className="mt-3 rounded-lg bg-slate-50 p-3">
      <div className="max-h-72 space-y-3 overflow-y-auto">
        {Object.entries(porCategoria).map(([categoria, items]) => (
          <div key={categoria}>
            <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">{categoria}</p>
            <div className="flex flex-wrap gap-2">
              {items.map((plato) => {
                const activo = marcados.includes(plato.id);
                return (
                  <button
                    key={plato.id}
                    onClick={() =>
                      setMarcados((prev) =>
                        activo ? prev.filter((id) => id !== plato.id) : [...prev, plato.id]
                      )
                    }
                    className={`rounded-full border px-3 py-1 text-sm transition ${
                      activo
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-slate-300 bg-white text-slate-600"
                    }`}
                  >
                    {plato.name}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={() => onGuardar(marcados)}
        disabled={guardando}
        className="mt-3 rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
      >
        {guardando ? "Guardando..." : `Guardar (${marcados.length} platos)`}
      </button>
    </div>
  );
}
