/** Estado de la cuenta completa a partir del estado de cada plato. */
export function deriveOrderStatus(items: { status: string }[]): string {
  const statuses = items.map((i) => i.status);
  if (statuses.every((s) => s === "CANCELLED")) return "CANCELLED";
  const active = statuses.filter((s) => s !== "CANCELLED");
  if (active.length === 0) return "CANCELLED";
  if (active.every((s) => s === "SERVED")) return "SERVED";
  if (active.every((s) => s === "READY" || s === "SERVED")) return "READY";
  if (active.some((s) => s === "IN_PREPARATION" || s === "READY" || s === "SERVED")) return "IN_PROGRESS";
  return "OPEN";
}
