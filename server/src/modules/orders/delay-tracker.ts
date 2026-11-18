/** In-memory set of OrderItem ids already flagged as delayed, so we alert once per delay episode. */
export const alertedItemIds = new Set<string>();

export function clearAlert(orderItemId: string) {
  alertedItemIds.delete(orderItemId);
}
