/**
 * Prices are entered and stored in thousands of Colombian pesos as shorthand (e.g. `25` means
 * $25.000, `2.5` means $2.500) — this matches how the menu has already been entered, so keep
 * typing prices the same way. This formatter is the only place that expands to full pesos.
 */
export function formatCOP(value: number): string {
  const pesos = Math.round(value * 1000);
  return `$${pesos.toLocaleString("es-CO")}`;
}
