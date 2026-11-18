/** This business does not add automatic tax or service charges — the bill is exactly the sum
 * of the menu prices. Kept as named rates (rather than deleting the concept) so the fields
 * still exist end-to-end (DTOs, receipts) in case a future owner setting re-enables them. */
export const TAX_RATE = 0;
export const SERVICE_CHARGE_RATE = 0;

export const TIP_SUGGESTIONS = [0.1, 0.15, 0.2] as const;

export function computeBillTotals(subtotal: number, discountAmount = 0) {
  const discountedSubtotal = Math.max(0, subtotal - discountAmount);
  const tax = round2(discountedSubtotal * TAX_RATE);
  const serviceCharge = round2(discountedSubtotal * SERVICE_CHARGE_RATE);
  return { subtotal, discountAmount, discountedSubtotal, tax, serviceCharge };
}

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
