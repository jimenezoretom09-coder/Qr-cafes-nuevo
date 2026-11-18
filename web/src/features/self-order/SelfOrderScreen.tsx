import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { formatCOP, getDefaultMealPeriod, hasMealSplit, pickMealPeriod, type MealPeriod } from "@rms/shared";
import {
  fetchPublicMenu,
  fetchSelfOrderStatus,
  placeSelfOrder,
  type PublicMenuItem,
  type PublicMenuResponse,
  type SelfOrderStatus,
} from "./api";
import SelfModifierPicker, { type SelfModifierSelection } from "./SelfModifierPicker";
import AssistantWidget from "./AssistantWidget";
import DishMedia from "./DishMedia";

interface CartLine {
  key: string;
  menuItemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  modifierIds: string[];
  modifierNames: string[];
  modifiersPriceDelta: number;
  notes?: string;
}

const MEAL_PERIOD_LABELS: Record<Exclude<MealPeriod, "ALL">, string> = {
  BREAKFAST: "Desayuno",
  LUNCH: "Almuerzo",
};

const ITEM_STATUS_LABEL: Record<string, string> = {
  QUEUED: "En cola",
  IN_PREPARATION: "Preparando",
  READY: "¡Listo!",
  SERVED: "Servido",
};

const ITEM_STATUS_STYLE: Record<string, string> = {
  QUEUED: "bg-epi-ink-variant text-white",
  IN_PREPARATION: "bg-epi-gold text-white",
  READY: "bg-emerald-600 text-white animate-pulse",
  SERVED: "bg-epi-outline-variant text-epi-ink",
};

function orderStorageKey(tableLabel: string) {
  return `self-order-${tableLabel}`;
}

function BagIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-5 w-5">
      <path d="M6 8h12l-1 12.5a1.5 1.5 0 0 1-1.5 1.5h-7a1.5 1.5 0 0 1-1.5-1.5L6 8Z" strokeLinejoin="round" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" strokeLinecap="round" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-5 w-5">
      <path d="M4 5.5C4 4.7 4.7 4 5.5 4H12v16H5.5A1.5 1.5 0 0 1 4 18.5v-13Z" strokeLinejoin="round" />
      <path d="M20 5.5c0-.8-.7-1.5-1.5-1.5H12v16h6.5a1.5 1.5 0 0 0 1.5-1.5v-13Z" strokeLinejoin="round" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-5 w-5">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-3.6-3.6" strokeLinecap="round" />
    </svg>
  );
}

function TicketIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-5 w-5">
      <path
        d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v1.5a1.5 1.5 0 0 0 0 3V16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-3.5a1.5 1.5 0 0 0 0-3V8Z"
        strokeLinejoin="round"
      />
      <path d="M10 6v12" strokeDasharray="2 2" />
    </svg>
  );
}

export default function SelfOrderScreen() {
  const { tableLabel = "" } = useParams();
  const [menu, setMenu] = useState<PublicMenuResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mealPeriod, setMealPeriod] = useState<Exclude<MealPeriod, "ALL">>(getDefaultMealPeriod());
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [screen, setScreen] = useState<"menu" | "search">("menu");
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [pendingItem, setPendingItem] = useState<PublicMenuItem | null>(null);
  const [view, setView] = useState<"ordering" | "review" | "confirmed">("ordering");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderStatus, setOrderStatus] = useState<SelfOrderStatus | null>(null);

  useEffect(() => {
    fetchPublicMenu(tableLabel)
      .then((data) => {
        setMenu(data);
        const period = pickMealPeriod(data.categories);
        setMealPeriod(period);
        const firstMatch = data.categories.find((c) => c.mealPeriod === period || c.mealPeriod === "ALL");
        setActiveCategoryId(firstMatch?.id ?? data.categories[0]?.id ?? null);
      })
      .catch(() => setLoadError("No pudimos encontrar esta mesa. Pide ayuda a un mesero."));

    const savedOrderId = localStorage.getItem(orderStorageKey(tableLabel));
    if (savedOrderId) {
      setOrderId(savedOrderId);
      setView("confirmed");
    }
  }, [tableLabel]);

  useEffect(() => {
    if (view !== "confirmed" || !orderId) return;
    let cancelled = false;

    async function poll() {
      try {
        const status = await fetchSelfOrderStatus(orderId!);
        if (!cancelled) setOrderStatus(status);
      } catch {
        /* transient network hiccup — next poll will retry */
      }
    }
    poll();
    const interval = setInterval(poll, 6000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [view, orderId]);

  const visibleCategories = useMemo(
    () => (menu?.categories ?? []).filter((c) => c.mealPeriod === mealPeriod || c.mealPeriod === "ALL"),
    [menu, mealPeriod]
  );

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return visibleCategories.flatMap((c) => c.items).filter((item) => item.name.toLowerCase().includes(q));
  }, [visibleCategories, searchQuery]);

  function selectMealPeriod(period: Exclude<MealPeriod, "ALL">) {
    setMealPeriod(period);
    const stillVisible = (menu?.categories ?? []).some(
      (c) => c.id === activeCategoryId && (c.mealPeriod === period || c.mealPeriod === "ALL")
    );
    if (!stillVisible) {
      const firstMatch = (menu?.categories ?? []).find((c) => c.mealPeriod === period || c.mealPeriod === "ALL");
      setActiveCategoryId(firstMatch?.id ?? null);
    }
  }

  const cartCount = cart.reduce((sum, line) => sum + line.quantity, 0);
  const cartTotal = cart.reduce((sum, line) => sum + line.quantity * (line.unitPrice + line.modifiersPriceDelta), 0);

  function handleItemTap(item: PublicMenuItem) {
    if (item.modifierGroups.length > 0) {
      setPendingItem(item);
      return;
    }
    addSimpleItem(item);
  }

  function addSimpleItem(item: PublicMenuItem) {
    setCart((prev) => {
      const existing = prev.find((l) => l.menuItemId === item.id && l.modifierIds.length === 0 && !l.notes);
      if (existing) {
        return prev.map((l) => (l.key === existing.key ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [
        ...prev,
        {
          key: `${item.id}-${Date.now()}`,
          menuItemId: item.id,
          name: item.name,
          unitPrice: item.price,
          quantity: 1,
          modifierIds: [],
          modifierNames: [],
          modifiersPriceDelta: 0,
          notes: undefined,
        },
      ];
    });
  }

  function addWithModifiers(item: PublicMenuItem, selection: SelfModifierSelection) {
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
        quantity: selection.quantity,
        modifierIds: selection.modifierIds,
        modifierNames: chosenModifiers.map((m) => m.name),
        modifiersPriceDelta: chosenModifiers.reduce((sum, m) => sum + m.priceDelta, 0),
        notes: selection.notes,
      },
    ]);
    setPendingItem(null);
  }

  function simpleItemQuantity(itemId: string) {
    return cart
      .filter((l) => l.menuItemId === itemId && l.modifierIds.length === 0 && !l.notes)
      .reduce((sum, l) => sum + l.quantity, 0);
  }

  function incrementLine(key: string) {
    setCart((prev) => prev.map((l) => (l.key === key ? { ...l, quantity: l.quantity + 1 } : l)));
  }
  function decrementLine(key: string) {
    setCart((prev) =>
      prev.flatMap((l) => (l.key === key ? (l.quantity <= 1 ? [] : [{ ...l, quantity: l.quantity - 1 }]) : [l]))
    );
  }
  function removeSimpleItem(itemId: string) {
    const line = cart.find((l) => l.menuItemId === itemId && l.modifierIds.length === 0 && !l.notes);
    if (line) decrementLine(line.key);
  }

  async function confirmOrder() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const items = cart.map((line) => ({
        menuItemId: line.menuItemId,
        quantity: line.quantity,
        notes: line.notes,
        modifierIds: line.modifierIds,
      }));
      const order = await placeSelfOrder(tableLabel, items);
      localStorage.setItem(orderStorageKey(tableLabel), order.id);
      setOrderId(order.id);
      setCart([]);
      setView("confirmed");
    } catch {
      setSubmitError("No pudimos enviar tu pedido. Intenta de nuevo o avísale a un mesero.");
    } finally {
      setSubmitting(false);
    }
  }

  function orderMore() {
    localStorage.removeItem(orderStorageKey(tableLabel));
    setOrderId(null);
    setOrderStatus(null);
    setView("ordering");
  }

  if (loadError) {
    return (
      <div className="flex h-screen items-center justify-center bg-epi-ink p-6 text-center font-body text-epi-bg">
        <p>{loadError}</p>
      </div>
    );
  }

  if (!menu) {
    return (
      <div className="flex h-screen items-center justify-center bg-epi-bg font-body text-epi-ink-variant">
        Cargando menú…
      </div>
    );
  }

  function renderItemCard(item: PublicMenuItem) {
    const hasExtras = item.modifierGroups.length > 0;
    const hasMedia = Boolean(item.imageUrl || item.videoUrl);
    const qty = simpleItemQuantity(item.id);

    return (
      <article
        key={item.id}
        className={`overflow-hidden rounded-lg border border-epi-outline-variant/50 bg-epi-surface ${
          hasMedia ? "mb-8" : "mb-4"
        }`}
      >
        {/* La foto/video NO agrega al pedido: antes tocarla equivalia a pedir el plato, asi que
            un comensal que solo queria ver el video terminaba con el plato en la cuenta. */}
        {hasMedia && <DishMedia imageUrl={item.imageUrl} videoUrl={item.videoUrl} alt={item.name} />}

        <div className={hasMedia ? "p-5" : "p-4"}>
          <div className="flex items-start justify-between gap-3">
            <h3 className={`font-display font-semibold text-epi-ink ${hasMedia ? "text-2xl" : "text-base"}`}>
              {item.name}
            </h3>
            <span className="shrink-0 font-body font-semibold text-epi-gold">{formatCOP(item.price)}</span>
          </div>

          {item.allergens.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {item.allergens.map((a) => (
                <span
                  key={a}
                  className="rounded border border-epi-ink/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-epi-ink-variant"
                >
                  {a}
                </span>
              ))}
            </div>
          )}

          {item.description && (
            <p
              className={`mt-2 font-body text-epi-ink-variant ${
                hasMedia ? "text-sm leading-relaxed" : "text-xs"
              }`}
            >
              {item.description}
            </p>
          )}

          {hasExtras ? (
            <button
              onClick={() => handleItemTap(item)}
              className="mt-4 w-full rounded bg-epi-ink py-3 text-center font-body text-xs font-semibold uppercase tracking-wide text-white active:scale-[0.99]"
            >
              Ver opciones
            </button>
          ) : qty > 0 ? (
            <div className="mt-4 flex items-center justify-center gap-4 rounded bg-epi-surface-low py-2">
              <button
                onClick={() => removeSimpleItem(item.id)}
                aria-label="Quitar uno"
                className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-base font-bold text-epi-ink shadow-sm"
              >
                −
              </button>
              <span className="font-body text-sm font-semibold">{qty} en tu pedido</span>
              <button
                onClick={() => handleItemTap(item)}
                aria-label="Agregar otro"
                className="flex h-7 w-7 items-center justify-center rounded-full bg-epi-ink text-base font-bold text-white shadow-sm"
              >
                +
              </button>
            </div>
          ) : (
            <button
              onClick={() => handleItemTap(item)}
              className="mt-4 w-full rounded bg-epi-ink py-3 text-center font-body text-xs font-semibold uppercase tracking-wide text-white active:scale-[0.99]"
            >
              Agregar al Pedido
            </button>
          )}
        </div>
      </article>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-epi-bg font-body text-epi-ink">
      <header className="sticky top-0 z-20 border-b border-epi-outline-variant/50 bg-epi-bg/95 px-4 pb-3 pt-4 backdrop-blur">
        <div className="flex items-center justify-between gap-2">
          <span className="w-9 shrink-0 text-xs font-semibold text-epi-ink-variant">{menu.table.label}</span>
          <h1 className="flex-1 truncate text-center font-display text-lg font-bold uppercase tracking-wide">
            {menu.business.name}
          </h1>
          <button
            onClick={() => cartCount > 0 && setView("review")}
            aria-label="Ver pedido"
            className="relative flex h-9 w-9 shrink-0 items-center justify-center text-epi-ink"
          >
            <BagIcon />
            {cartCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-epi-gold text-[10px] font-bold text-white">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 pb-28 pt-4">
        {view === "ordering" && screen === "menu" && (
          <>
            <div className={`mb-4 flex gap-2 ${hasMealSplit(menu.categories) ? "" : "hidden"}`}>
              {(Object.keys(MEAL_PERIOD_LABELS) as Exclude<MealPeriod, "ALL">[]).map((period) => (
                <button
                  key={period}
                  onClick={() => selectMealPeriod(period)}
                  className={`flex-1 rounded py-2 font-body text-sm font-bold transition ${
                    mealPeriod === period
                      ? "bg-epi-ink text-white"
                      : "border border-epi-outline-variant bg-epi-surface text-epi-ink-variant"
                  }`}
                >
                  {MEAL_PERIOD_LABELS[period]}
                </button>
              ))}
            </div>

            <div className="mb-6 flex flex-wrap gap-2">
              {visibleCategories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategoryId(cat.id)}
                  className={`rounded-full px-4 py-1.5 font-body text-sm font-semibold transition ${
                    activeCategoryId === cat.id
                      ? "bg-epi-ink text-white"
                      : "border border-epi-outline-variant text-epi-ink-variant"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {visibleCategories
              .filter((c) => c.id === activeCategoryId)
              .map((cat) => <div key={cat.id}>{cat.items.map((item) => renderItemCard(item))}</div>)}
          </>
        )}

        {view === "ordering" && screen === "search" && (
          <>
            <div className="mb-6 flex items-center gap-2 rounded border border-epi-outline-variant bg-epi-surface px-3 py-2.5">
              <span className="text-epi-ink-variant">
                <SearchIcon />
              </span>
              <input
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar en el menú..."
                className="w-full bg-transparent font-body text-sm text-epi-ink outline-none placeholder:text-epi-ink-variant"
              />
            </div>
            {searchQuery.trim() === "" && (
              <p className="mt-8 text-center font-body text-sm text-epi-ink-variant">
                Escribe el nombre de un plato o bebida.
              </p>
            )}
            {searchQuery.trim() !== "" && searchResults.length === 0 && (
              <p className="mt-8 text-center font-body text-sm text-epi-ink-variant">
                No encontramos nada con "{searchQuery}".
              </p>
            )}
            {searchResults.map((item) => renderItemCard(item))}
          </>
        )}

        {view === "review" && (
          <div>
            <h2 className="mb-4 font-display text-xl font-bold">Tu pedido</h2>
            <div className="space-y-2">
              {cart.map((line) => (
                <div key={line.key} className="rounded-lg border border-epi-outline-variant/50 bg-epi-surface p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-body font-semibold text-epi-ink">
                        {line.quantity}× {line.name}
                      </p>
                      {line.modifierNames.length > 0 && (
                        <p className="text-xs text-epi-ink-variant">+ {line.modifierNames.join(", ")}</p>
                      )}
                      {line.notes && <p className="text-xs text-epi-ink-variant">Nota: {line.notes}</p>}
                      <p className="text-sm font-medium text-epi-gold">
                        {formatCOP((line.unitPrice + line.modifiersPriceDelta) * line.quantity)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => decrementLine(line.key)}
                        className="h-8 w-8 rounded-full bg-epi-surface-low text-lg font-bold text-epi-ink"
                      >
                        −
                      </button>
                      <span className="w-5 text-center font-semibold">{line.quantity}</span>
                      <button
                        onClick={() => incrementLine(line.key)}
                        className="h-8 w-8 rounded-full bg-epi-ink text-lg font-bold text-white"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {submitError && <p className="mt-3 text-sm text-epi-error">{submitError}</p>}
          </div>
        )}

        {view === "confirmed" && (
          <div>
            <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 font-body text-sm text-emerald-900">
              ¡Pedido enviado a cocina! Te avisamos aquí mismo cuando esté listo.
            </div>
            <div className="space-y-2">
              {(orderStatus?.items ?? []).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border border-epi-outline-variant/50 bg-epi-surface p-3"
                >
                  <p className="font-body font-semibold text-epi-ink">
                    {item.quantity}× {item.name}
                  </p>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      ITEM_STATUS_STYLE[item.status] ?? "bg-epi-surface-low text-epi-ink"
                    }`}
                  >
                    {ITEM_STATUS_LABEL[item.status] ?? item.status}
                  </span>
                </div>
              ))}
              {!orderStatus && <p className="text-sm text-epi-ink-variant">Cargando estado del pedido…</p>}
            </div>
            <button
              onClick={orderMore}
              className="mt-4 w-full rounded bg-epi-ink py-3 font-body text-sm font-semibold uppercase tracking-wide text-white"
            >
              Pedir algo más
            </button>
          </div>
        )}
      </div>

      {view === "ordering" && (
        <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-epi-outline-variant/50 bg-epi-surface">
          <button
            onClick={() => setScreen("menu")}
            className={`flex flex-1 flex-col items-center gap-1 py-2.5 font-body text-[11px] font-semibold ${
              screen === "menu" ? "text-epi-ink" : "text-epi-ink-variant"
            }`}
          >
            <BookIcon />
            Menú
          </button>
          <button
            onClick={() => setScreen("search")}
            className={`flex flex-1 flex-col items-center gap-1 py-2.5 font-body text-[11px] font-semibold ${
              screen === "search" ? "text-epi-ink" : "text-epi-ink-variant"
            }`}
          >
            <SearchIcon />
            Buscar
          </button>
          <button
            onClick={() => cartCount > 0 && setView("review")}
            className="relative flex flex-1 flex-col items-center gap-1 py-2.5 font-body text-[11px] font-semibold text-epi-ink-variant"
          >
            <TicketIcon />
            Mi Pedido
            {cartCount > 0 && (
              <span className="absolute right-[28%] top-1 flex h-4 w-4 items-center justify-center rounded-full bg-epi-gold text-[10px] font-bold text-white">
                {cartCount}
              </span>
            )}
          </button>
        </nav>
      )}

      {view === "review" && (
        <div className="fixed inset-x-0 bottom-0 flex gap-2 border-t border-epi-outline-variant/50 bg-epi-surface p-3">
          <button
            onClick={() => setView("ordering")}
            className="rounded bg-epi-surface-low px-4 py-3 font-body text-sm font-semibold text-epi-ink"
          >
            Seguir viendo
          </button>
          <button
            onClick={confirmOrder}
            disabled={submitting || cart.length === 0}
            className="flex-1 rounded bg-epi-ink py-3 font-body text-sm font-semibold uppercase tracking-wide text-white disabled:opacity-50"
          >
            {submitting ? "Enviando…" : `Confirmar pedido · ${formatCOP(cartTotal)}`}
          </button>
        </div>
      )}

      {pendingItem && (
        <SelfModifierPicker
          item={pendingItem}
          onCancel={() => setPendingItem(null)}
          onConfirm={(selection) => addWithModifiers(pendingItem, selection)}
        />
      )}

      {!pendingItem && <AssistantWidget />}
    </div>
  );
}
