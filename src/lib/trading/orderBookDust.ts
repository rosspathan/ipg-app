/**
 * Order book dust threshold.
 *
 * Any aggregated price level whose total quantity is below this value is
 * considered "dust": it is not meaningfully tradable and would render as a
 * rounded `0.00000` amount in the UI. Such levels are excluded from the order
 * book everywhere (RPC `get_public_order_book` uses the same 0.00001 value via
 * its HAVING clause, and the settlement engine auto-closes remainders at or
 * below it). Keep this in sync with the DB constant.
 */
export const ORDER_BOOK_DUST_THRESHOLD = 0.00001;

interface QtyLevel {
  quantity: number;
}

/**
 * Returns true when a level has a real, displayable, tradable quantity.
 * Filters out non-finite, zero, negative and dust amounts.
 */
export const isTradableLevel = (level: QtyLevel): boolean => {
  const q = Number(level.quantity);
  return Number.isFinite(q) && q >= ORDER_BOOK_DUST_THRESHOLD;
};
