import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCategory,
  createMenuItem,
  deleteMenuItem,
  fetchMenuAdmin,
  fetchStationsAdmin,
  updateCategory,
  updateMenuItem,
} from "./api";
import { formatCOP, type Course, type MealPeriod } from "@rms/shared";
import StationManager from "./StationManager";

const COURSE_OPTIONS: { value: Course; label: string }[] = [
  { value: "STARTER", label: "Entrada" },
  { value: "MAIN", label: "Fuerte" },
  { value: "DESSERT", label: "Postre" },
  { value: "DRINK", label: "Bebida" },
];

const MEAL_PERIOD_OPTIONS: { value: MealPeriod; label: string }[] = [
  { value: "BREAKFAST", label: "Desayuno" },
  { value: "LUNCH", label: "Almuerzo" },
  { value: "ALL", label: "Todo el día" },
];

export default function MenuManager() {
  const queryClient = useQueryClient();
  const { data: categories = [] } = useQuery({ queryKey: ["menu"], queryFn: fetchMenuAdmin });
  const { data: stations = [] } = useQuery({ queryKey: ["stations"], queryFn: fetchStationsAdmin });

  const [newCategoryName, setNewCategoryName] = useState("");
  // "Todo el día" por defecto: una categoria de solo almuerzo, creada sin pensarlo, deja la carta
  // vacia en las mañanas.
  const [newCategoryPeriod, setNewCategoryPeriod] = useState<MealPeriod>("ALL");
  const [showItemForm, setShowItemForm] = useState<string | null>(null);
  const [itemForm, setItemForm] = useState({
    name: "",
    price: "",
    stationId: "",
    course: "MAIN" as Course,
    preparationTimeEstimateMin: "10",
  });

  const invalidateMenu = () => queryClient.invalidateQueries({ queryKey: ["menu"] });

  const categoryMutation = useMutation({
    mutationFn: () =>
      createCategory({ name: newCategoryName, sortOrder: categories.length + 1, mealPeriod: newCategoryPeriod }),
    onSuccess: () => {
      setNewCategoryName("");
      invalidateMenu();
    },
  });

  const categoryPeriodMutation = useMutation({
    mutationFn: ({ id, mealPeriod }: { id: string; mealPeriod: MealPeriod }) => updateCategory(id, { mealPeriod }),
    onSuccess: invalidateMenu,
  });

  const itemMutation = useMutation({
    mutationFn: (categoryId: string) =>
      createMenuItem({
        name: itemForm.name,
        price: Number(itemForm.price),
        categoryId,
        stationId: itemForm.stationId,
        course: itemForm.course,
        preparationTimeEstimateMin: Number(itemForm.preparationTimeEstimateMin),
      }),
    onSuccess: () => {
      setItemForm({ name: "", price: "", stationId: "", course: "MAIN", preparationTimeEstimateMin: "10" });
      setShowItemForm(null);
      invalidateMenu();
    },
  });

  const availabilityMutation = useMutation({
    mutationFn: ({ id, available }: { id: string; available: boolean }) => updateMenuItem(id, { available }),
    onSuccess: invalidateMenu,
  });

  const priceMutation = useMutation({
    mutationFn: ({ id, price }: { id: string; price: number }) => updateMenuItem(id, { price }),
    onSuccess: invalidateMenu,
  });

  const descriptionMutation = useMutation({
    mutationFn: ({ id, description }: { id: string; description: string }) =>
      updateMenuItem(id, { description }),
    onSuccess: invalidateMenu,
  });

  const mediaMutation = useMutation({
    mutationFn: ({ id, imageUrl, videoUrl }: { id: string; imageUrl?: string; videoUrl?: string }) =>
      updateMenuItem(id, { imageUrl, videoUrl }),
    onSuccess: invalidateMenu,
  });

  const allergensMutation = useMutation({
    mutationFn: ({ id, allergens }: { id: string; allergens: string[] }) => updateMenuItem(id, { allergens }),
    onSuccess: invalidateMenu,
  });

  const sobremesaMutation = useMutation({
    mutationFn: ({ id, ...campos }: { id: string; includesDrink?: boolean; isIncludedDrink?: boolean }) =>
      updateMenuItem(id, campos),
    onSuccess: invalidateMenu,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteMenuItem(id),
    onSuccess: invalidateMenu,
  });

  return (
    <div>
      <StationManager />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Gestión del menú</h1>
        <div className="flex flex-wrap gap-2">
          <input
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="Nueva categoría"
            className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm sm:flex-none"
          />
          <select
            value={newCategoryPeriod}
            onChange={(e) => setNewCategoryPeriod(e.target.value as MealPeriod)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            {MEAL_PERIOD_OPTIONS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => categoryMutation.mutate()}
            disabled={!newCategoryName.trim()}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            Agregar categoría
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {categories.map((category) => (
          <div key={category.id} className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-bold text-slate-800">{category.name}</h2>
              <div className="flex items-center gap-3">
                <select
                  value={category.mealPeriod}
                  onChange={(e) =>
                    categoryPeriodMutation.mutate({ id: category.id, mealPeriod: e.target.value as MealPeriod })
                  }
                  className="rounded border border-slate-300 px-2 py-1 text-sm"
                >
                  {MEAL_PERIOD_OPTIONS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => setShowItemForm(showItemForm === category.id ? null : category.id)}
                  className="text-sm font-semibold text-blue-600"
                >
                  + Agregar plato
                </button>
              </div>
            </div>

            {showItemForm === category.id && (
              <div className="mb-4 grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-3 sm:grid-cols-5">
                <input
                  placeholder="Nombre"
                  value={itemForm.name}
                  onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                  className="rounded border border-slate-300 px-2 py-1.5 text-sm"
                />
                <div>
                  <input
                    placeholder="Precio (ej: 25 = $25.000)"
                    type="number"
                    step="0.1"
                    value={itemForm.price}
                    onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })}
                    className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                  />
                  {itemForm.price && (
                    <p className="mt-0.5 text-xs text-slate-400">{formatCOP(Number(itemForm.price))}</p>
                  )}
                </div>
                <select
                  value={itemForm.stationId}
                  onChange={(e) => setItemForm({ ...itemForm, stationId: e.target.value })}
                  className="rounded border border-slate-300 px-2 py-1.5 text-sm"
                >
                  <option value="">Estación...</option>
                  {stations.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <select
                  value={itemForm.course}
                  onChange={(e) => setItemForm({ ...itemForm, course: e.target.value as Course })}
                  className="rounded border border-slate-300 px-2 py-1.5 text-sm"
                >
                  {COURSE_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => itemMutation.mutate(category.id)}
                  disabled={!itemForm.name || !itemForm.price || !itemForm.stationId}
                  className="rounded bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
                >
                  Guardar
                </button>
              </div>
            )}

            <div className="divide-y divide-slate-100 text-sm">
              {category.items.map((item) => (
                <div key={item.id} className="py-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {item.imageUrl && (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="h-10 w-10 rounded-lg object-cover"
                      />
                    )}
                    <span className="mr-auto font-medium text-slate-800">{item.name}</span>
                    <input
                      type="number"
                      step="0.1"
                      defaultValue={item.price}
                      onBlur={(e) => {
                        const value = Number(e.target.value);
                        if (value !== item.price) priceMutation.mutate({ id: item.id, price: value });
                      }}
                      className="w-20 rounded border border-slate-200 px-2 py-1"
                    />
                    <span className="text-xs text-slate-400">{formatCOP(item.price)}</span>
                    <label className="inline-flex cursor-pointer items-center gap-2">
                      <span className={item.available ? "text-emerald-600" : "text-red-500"}>
                        {item.available ? "Disponible" : "Agotado"}
                      </span>
                      <input
                        type="checkbox"
                        checked={item.available}
                        onChange={(e) => availabilityMutation.mutate({ id: item.id, available: e.target.checked })}
                      />
                    </label>
                    <button
                      onClick={() => {
                        if (confirm(`¿Eliminar "${item.name}" del menú?`)) deleteMutation.mutate(item.id);
                      }}
                      className="text-slate-300 hover:text-red-500"
                      title="Eliminar plato"
                    >
                      🗑
                    </button>
                  </div>
                  <input
                    placeholder="Descripción (ingredientes, lo que incluye el plato...)"
                    defaultValue={item.description ?? ""}
                    onBlur={(e) => {
                      if (e.target.value !== (item.description ?? "")) {
                        descriptionMutation.mutate({ id: item.id, description: e.target.value });
                      }
                    }}
                    className="mt-2 w-full rounded border border-slate-200 px-2 py-1 text-xs text-slate-500"
                  />
                  <div className="mt-2 flex flex-wrap gap-2">
                    <input
                      placeholder="Link de la foto (https://...)"
                      defaultValue={item.imageUrl ?? ""}
                      onBlur={(e) => {
                        if (e.target.value !== (item.imageUrl ?? "")) {
                          mediaMutation.mutate({ id: item.id, imageUrl: e.target.value });
                        }
                      }}
                      className="min-w-0 flex-1 rounded border border-slate-200 px-2 py-1 text-xs text-slate-500"
                    />
                    <input
                      placeholder="Link del video (https://...)"
                      defaultValue={item.videoUrl ?? ""}
                      onBlur={(e) => {
                        if (e.target.value !== (item.videoUrl ?? "")) {
                          mediaMutation.mutate({ id: item.id, videoUrl: e.target.value });
                        }
                      }}
                      className="min-w-0 flex-1 rounded border border-slate-200 px-2 py-1 text-xs text-slate-500"
                    />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-4 rounded bg-slate-50 px-2 py-1.5">
                    <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-slate-600">
                      <input
                        type="checkbox"
                        checked={item.includesDrink}
                        onChange={(e) =>
                          sobremesaMutation.mutate({ id: item.id, includesDrink: e.target.checked })
                        }
                      />
                      Es almuerzo (incluye sobremesa)
                    </label>
                    <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-slate-600">
                      <input
                        type="checkbox"
                        checked={item.isIncludedDrink}
                        onChange={(e) =>
                          sobremesaMutation.mutate({ id: item.id, isIncludedDrink: e.target.checked })
                        }
                      />
                      Es sobremesa incluida
                    </label>
                  </div>
                  <input
                    placeholder="Alérgenos, separados por coma (ej: gluten, lácteos, maní)"
                    defaultValue={item.allergens.join(", ")}
                    onBlur={(e) => {
                      const next = e.target.value
                        .split(",")
                        .map((a) => a.trim())
                        .filter(Boolean);
                      if (next.join(",") !== item.allergens.join(",")) {
                        allergensMutation.mutate({ id: item.id, allergens: next });
                      }
                    }}
                    className="mt-2 w-full rounded border border-slate-200 px-2 py-1 text-xs text-slate-500"
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
