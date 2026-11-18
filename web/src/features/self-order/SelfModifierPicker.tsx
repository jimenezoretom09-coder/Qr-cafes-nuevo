import { useState } from "react";
import { formatCOP } from "@rms/shared";
import type { PublicMenuItem } from "./api";
import DishMedia from "./DishMedia";

export interface SelfModifierSelection {
  modifierIds: string[];
  notes?: string;
  quantity: number;
}

export default function SelfModifierPicker({
  item,
  onConfirm,
  onCancel,
}: {
  item: PublicMenuItem;
  onConfirm: (selection: SelfModifierSelection) => void;
  onCancel: () => void;
}) {
  const [selectedByGroup, setSelectedByGroup] = useState<Record<string, string[]>>({});
  const [notes, setNotes] = useState("");
  const [quantity, setQuantity] = useState(1);

  function toggleModifier(groupId: string, modifierId: string, maxSelect: number) {
    setSelectedByGroup((prev) => {
      const current = prev[groupId] ?? [];
      if (current.includes(modifierId)) {
        return { ...prev, [groupId]: current.filter((id) => id !== modifierId) };
      }
      const next = maxSelect === 1 ? [modifierId] : [...current, modifierId].slice(0, maxSelect);
      return { ...prev, [groupId]: next };
    });
  }

  const canConfirm = item.modifierGroups.every(
    (group) => (selectedByGroup[group.id]?.length ?? 0) >= group.minSelect
  );

  function handleConfirm() {
    onConfirm({ modifierIds: Object.values(selectedByGroup).flat(), notes: notes.trim() || undefined, quantity });
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 sm:items-center sm:p-4" onClick={onCancel}>
      <div
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-epi-surface p-5 font-body shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {(item.videoUrl || item.imageUrl) && (
          <div className="-mx-5 -mt-5 mb-4 sm:mx-0 sm:mt-0 sm:overflow-hidden sm:rounded-xl">
            <DishMedia imageUrl={item.imageUrl} videoUrl={item.videoUrl} alt={item.name} />
          </div>
        )}

        <h2 className="font-display text-xl font-semibold text-epi-ink">{item.name}</h2>
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
        {item.description && <p className="mt-2 text-sm text-epi-ink-variant">{item.description}</p>}
        <p className="mt-1 text-sm font-semibold text-epi-gold">{formatCOP(item.price)}</p>

        {item.modifierGroups.map((group) => (
          <div key={group.id} className="mt-4">
            <p className="font-semibold text-epi-ink">
              {group.name}{" "}
              <span className="text-xs font-normal text-epi-ink-variant">
                ({group.minSelect > 0 ? `elige ${group.minSelect}` : `hasta ${group.maxSelect}`})
              </span>
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {group.modifiers.map((mod) => {
                const isSelected = (selectedByGroup[group.id] ?? []).includes(mod.id);
                return (
                  <button
                    key={mod.id}
                    onClick={() => toggleModifier(group.id, mod.id, group.maxSelect)}
                    className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                      isSelected
                        ? "border-epi-ink bg-epi-ink text-white"
                        : "border-epi-outline-variant bg-epi-surface text-epi-ink"
                    }`}
                  >
                    {mod.name}
                    {mod.priceDelta > 0 && ` (+${formatCOP(mod.priceDelta)})`}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <div className="mt-4">
          <p className="font-semibold text-epi-ink">¿Algo más para este plato?</p>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={200}
            placeholder="Ej: sin cebolla (opcional)"
            className="mt-2 w-full rounded-lg border border-epi-outline-variant px-3 py-2 text-sm"
          />
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="h-10 w-10 rounded-full bg-epi-surface-low text-lg font-bold text-epi-ink"
            >
              −
            </button>
            <span className="w-6 text-center text-lg font-semibold">{quantity}</span>
            <button
              onClick={() => setQuantity((q) => q + 1)}
              className="h-10 w-10 rounded-full bg-epi-surface-low text-lg font-bold text-epi-ink"
            >
              +
            </button>
          </div>
          <div className="flex gap-2">
            <button onClick={onCancel} className="rounded-lg bg-epi-surface-low px-4 py-2 font-semibold text-epi-ink">
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={!canConfirm}
              className="rounded-lg bg-epi-ink px-4 py-2 font-semibold text-white disabled:opacity-40"
            >
              Agregar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
