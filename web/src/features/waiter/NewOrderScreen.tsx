import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchMenu, submitOrder, type NewOrderItemPayload } from "./api";
import ModifierPicker, { type ModifierSelection } from "./ModifierPicker";
import { useSocketEvent } from "../../lib/use-socket-event";
import { formatCOP, getDefaultMealPeriod, hasMealSplit, pickMealPeriod, type MealPeriod, type MenuItemDTO } from "@rms/shared";

const MEAL_PERIOD_LABELS: Record<Exclude<MealPeriod, "ALL">, string> = {
  BREAKFAST: "Desayuno",
  LUNCH: "Almuerzo",
};

interface CartLine extends NewOrderItemPayload {
  key: string;
  name: string;
  unitPrice: number;
  modifiersPriceDelta: number;
  modifierNames: string[];
}

export default function NewOrderScreen() {
  const { tableId } = useParams<{ tableId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: categories = [] } = useQuery({ queryKey: ["menu"], queryFn: fetchMenu });
  useSocketEvent("menu:item_availability_changed", () => {
    queryClient.invalidateQueries({ queryKey: ["menu"] });
  });

  const [mealPeriod, setMealPeriod] = useState<Exclude<MealPeriod, "ALL">>(getDefaultMealPeriod());

  // Al cargar el menu por primera vez, si la pestaña de la hora no tiene platos se abre la otra.
  // Solo una vez: despues manda lo que elija el mesero.
  const periodoInicialFijado = useRef(false);
  useEffect(() => {
    if (periodoInicialFijado.current || categories.length === 0) return;
    periodoInicialFijado.current = true;
    setMealPeriod(pickMealPeriod(categories));
  }, [categories]);
  const visibleCategories = useMemo(
    () => categories.filter((c) => c.mealPeriod === mealPeriod || c.mealPeriod === "ALL"),
    [categories, mealPeriod]
  );

  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const activeCategory = visibleCategories.find((c) => c.id === activeCategoryId) ?? visibleCategories[0];

  const [pendingItem, setPendingItem] = useState<MenuItemDTO | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);

  const total = useMemo(
    () => cart.reduce((sum, line) => sum + line.quantity * (line.unitPrice + line.modifiersPriceDelta), 0),
    [cart]
  );

  const mutation = useMutation({
    mutationFn: () =>
      submitOrder(
        tableId!,
        cart.map(({ menuItemId, quantity, notes, modifierIds }) => ({ menuItemId, quantity, notes, modifierIds }))
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tables"] });
      queryClient.invalidateQueries({ queryKey: ["orders", "mine"] });
      navigate("/waiter");
    },
  });

  // Siempre se abre el picker (incluso sin modifierGroups configurados) para que el mesero
  // pueda escribir una nota — ej. "sin arroz", "aguacate adicional" — en cualquier plato, no
  // solo en los que tienen extras armables (desayunos). ModifierPicker ya maneja bien el caso
  // sin grupos: no muestra chips y el botón Agregar queda habilitado de una vez.
  function handleItemClick(item: MenuItemDTO) {
    if (!item.available) return;
    setPendingItem(item);
  }

  function addToCart(item: MenuItemDTO, selection: ModifierSelection) {
    const chosenModifiers = item.modifierGroups
      .flatMap((g) => g.modifiers)
      .filter((m) => selection.modifierIds.includes(m.id));

    setCart((prev) => [
      ...prev,
      {
        key: `${item.id}-${Date.now()}`,
        menuItemId: item.id,
        name: item.name,
        unitPrice: item.price,
        modifiersPriceDelta: chosenModifiers.reduce((sum, m) => sum + m.priceDelta, 0),
        quantity: selection.quantity,
        notes: selection.notes,
        modifierIds: selection.modifierIds,
        modifierNames: chosenModifiers.map((m) => m.name),
      },
    ]);
    setPendingItem(null);
  }

  function removeFromCart(key: string) {
    setCart((prev) => prev.filter((line) => line.key !== key));
  }

  return (
    <div className="flex h-screen flex-col bg-slate-50 md:flex-row">
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-4 flex items-center gap-3">
          <button onClick={() => navigate("/waiter")} className="text-slate-500 hover:text-slate-800">
            ← Volver
          </button>
          <h1 className="text-lg font-bold text-slate-800">Nuevo pedido</h1>
        </div>

        <div className={`mb-3 flex gap-2 ${hasMealSplit(categories) ? "" : "hidden"}`}>
          {(Object.keys(MEAL_PERIOD_LABELS) as Exclude<MealPeriod, "ALL">[]).map((period) => (
            <button
              key={period}
              onClick={() => {
                setMealPeriod(period);
                setActiveCategoryId(null);
              }}
              className={`flex-1 rounded-lg py-2 text-sm font-bold ${
                mealPeriod === period ? "bg-slate-800 text-white" : "bg-white border border-slate-300 text-slate-600"
              }`}
            >
              {MEAL_PERIOD_LABELS[period]}
            </button>
          ))}
        </div>

        <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
          {visibleCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategoryId(cat.id)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold ${
                (activeCategory?.id ?? visibleCategories[0]?.id) === cat.id
                  ? "bg-blue-600 text-white"
                  : "bg-white text-slate-600 border border-slate-200"
              }`}
            >
              {cat.name}
            </button>
          ))}
          {visibleCategories.length === 0 && (
            <p className="text-sm text-slate-400">No hay platos cargados en {MEAL_PERIOD_LABELS[mealPeriod].toLowerCase()} todavía.</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {activeCategory?.items.map((item) => (
            <button
              key={item.id}
              onClick={() => handleItemClick(item)}
              disabled={!item.available}
              className={`rounded-xl border p-4 text-left shadow-sm transition active:scale-95 ${
                item.available ? "bg-white border-slate-200" : "bg-slate-100 border-slate-200 opacity-50"
              }`}
            >
              <p className="font-semibold text-slate-800">{item.name}</p>
              <p className="text-sm text-slate-500">{formatCOP(item.price)}</p>
              {!item.available && <p className="mt-1 text-xs font-semibold text-red-500">Agotado</p>}
            </button>
          ))}
        </div>
      </div>

      <div className="w-full border-t border-slate-200 bg-white p-4 md:w-96 md:border-l md:border-t-0">
        <h2 className="mb-3 font-bold text-slate-800">Cuenta actual</h2>
        {cart.length === 0 && <p className="text-slate-400 text-sm">Aún no has agregado platos.</p>}
        <ul className="space-y-3">
          {cart.map((line) => (
            <li key={line.key} className="rounded-lg border border-slate-100 p-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-slate-800">
                    {line.quantity}× {line.name}
                  </p>
                  {line.modifierNames.length > 0 && (
                    <p className="text-xs text-slate-400">{line.modifierNames.join(", ")}</p>
                  )}
                  {line.notes && <p className="text-xs text-slate-400">Nota: {line.notes}</p>}
                </div>
                <button onClick={() => removeFromCart(line.key)} className="text-slate-300 hover:text-red-500">
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
          <span className="font-semibold text-slate-700">Total</span>
          <span className="font-bold text-slate-900">{formatCOP(total)}</span>
        </div>

        <button
          onClick={() => mutation.mutate()}
          disabled={cart.length === 0 || mutation.isPending}
          className="mt-4 w-full rounded-xl bg-blue-600 py-3 font-bold text-white disabled:opacity-40"
        >
          {mutation.isPending ? "Enviando..." : "Enviar a cocina"}
        </button>
        {mutation.isError && (
          <p className="mt-2 text-sm text-red-600">{(mutation.error as Error).message}</p>
        )}
      </div>

      {pendingItem && (
        <ModifierPicker
          item={pendingItem}
          onCancel={() => setPendingItem(null)}
          onConfirm={(selection) => addToCart(pendingItem, selection)}
        />
      )}
    </div>
  );
}
