import { useState } from "react";
import { formatCOP, type MenuItemDTO } from "@rms/shared";

export interface ModifierSelection {
  modifierIds: string[];
  notes: string;
  quantity: number;
}

export default function ModifierPicker({
  item,
  onConfirm,
  onCancel,
}: {
  item: MenuItemDTO;
  onConfirm: (selection: ModifierSelection) => void;
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
    const modifierIds = Object.values(selectedByGroup).flat();
    onConfirm({ modifierIds, notes: notes.trim() || undefined as unknown as string, quantity });
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4" onClick={onCancel}>
      <div
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold text-slate-800">{item.name}</h2>
        {item.description && <p className="text-sm text-slate-500 mt-1">{item.description}</p>}

        {item.modifierGroups.map((group) => (
          <div key={group.id} className="mt-5">
            <p className="font-semibold text-slate-700">
              {group.name}{" "}
              <span className="text-xs font-normal text-slate-400">
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
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                      isSelected
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-slate-300 bg-white text-slate-700"
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

        <div className="mt-5">
          <p className="font-semibold text-slate-700">Nota especial</p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ej: sin cebolla, alergia a maní..."
            className="mt-2 w-full rounded-lg border border-slate-300 p-2 text-sm"
            rows={2}
          />
        </div>

        <div className="mt-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="h-10 w-10 rounded-full bg-slate-100 text-lg font-bold"
            >
              −
            </button>
            <span className="w-6 text-center text-lg font-semibold">{quantity}</span>
            <button
              onClick={() => setQuantity((q) => q + 1)}
              className="h-10 w-10 rounded-full bg-slate-100 text-lg font-bold"
            >
              +
            </button>
          </div>
          <div className="flex gap-2">
            <button onClick={onCancel} className="rounded-lg bg-slate-200 px-4 py-2 font-semibold text-slate-700">
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={!canConfirm}
              className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white disabled:opacity-40"
            >
              Agregar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
