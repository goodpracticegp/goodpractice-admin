/**
 * Pure mirror of the procurement rules enforced in the database
 * (compute_item_status, items_before_write, items_after_write, record_purchase,
 * adjust_stock). Kept side effect free so the rules can be unit tested and so
 * the UI can preview the outcome of an action before it is submitted.
 *
 * The database remains the single source of truth: these helpers must stay in
 * step with the SQL, and the Vitest suite in reorder-logic.test.ts is the guard.
 */

export const ITEM_STATUSES = [
  "In Stock",
  "Low Stock",
  "Out of Stock",
  "Reorder Required",
  "Discontinued",
] as const;

export type ItemStatus = (typeof ITEM_STATUSES)[number];

/** Low Stock band: within 25 percent above the reorder level. */
export const LOW_STOCK_MULTIPLIER = 1.25;

export function computeItemStatus(
  stock: number,
  reorderLevel: number,
  currentStatus: string,
): ItemStatus {
  if (currentStatus === "Discontinued") return "Discontinued";
  if (stock <= 0) return "Out of Stock";
  if (stock <= reorderLevel) return "Reorder Required";
  if (stock <= reorderLevel * LOW_STOCK_MULTIPLIER) return "Low Stock";
  return "In Stock";
}

export type LatchInput = {
  /** reorder_notified before the write. Ignored when isInsert is true. */
  previousNotified: boolean;
  stock: number;
  reorderLevel: number;
  /** Status after recomputation. */
  status: ItemStatus;
  isInsert?: boolean;
};

export type LatchResult = {
  /** reorder_notified after the write. */
  notified: boolean;
  /** True when exactly one reorder notification row must be written. */
  notify: boolean;
};

/**
 * The low stock event latch. A notification is raised only on the transition
 * into the at-or-below-reorder-level state, so one low stock event produces
 * exactly one email. Replenishing above the reorder level clears the latch.
 */
export function evaluateReorderLatch(input: LatchInput): LatchResult {
  if (input.status === "Discontinued") {
    return { notified: input.isInsert ? false : input.previousNotified, notify: false };
  }

  const atOrBelow = input.stock <= input.reorderLevel;
  if (!atOrBelow) return { notified: false, notify: false };

  if (input.isInsert) return { notified: true, notify: true };
  if (!input.previousNotified) return { notified: true, notify: true };
  return { notified: true, notify: false };
}

export type ItemState = {
  availableStock: number;
  reorderLevel: number;
  status: ItemStatus;
  reorderNotified: boolean;
};

export type WriteOutcome = ItemState & {
  /** Signed change applied to available stock. */
  quantityChange: number;
  /** True when this write raises a new reorder notification. */
  notify: boolean;
};

function settle(item: ItemState, nextStock: number, isInsert = false): WriteOutcome {
  const status = computeItemStatus(nextStock, item.reorderLevel, item.status);
  const latch = evaluateReorderLatch({
    previousNotified: item.reorderNotified,
    stock: nextStock,
    reorderLevel: item.reorderLevel,
    status,
    isInsert,
  });
  return {
    availableStock: nextStock,
    reorderLevel: item.reorderLevel,
    status,
    reorderNotified: latch.notified,
    quantityChange: nextStock - item.availableStock,
    notify: latch.notify,
  };
}

/** Purchase received: stock increases by the quantity received. */
export function applyPurchase(item: ItemState, quantity: number): WriteOutcome {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error("Quantity received must be a whole number greater than zero.");
  }
  return settle(item, item.availableStock + quantity);
}

/** Stock adjustment or usage: stock never falls below zero. */
export function applyAdjustment(item: ItemState, change: number): WriteOutcome {
  if (!Number.isInteger(change) || change === 0) {
    throw new Error("Please enter a stock change other than zero.");
  }
  return settle(item, Math.max(0, item.availableStock + change));
}

/** Movement type recorded for a manual adjustment. */
export function movementTypeForChange(change: number): "Usage" | "Stock Adjustment" {
  return change < 0 ? "Usage" : "Stock Adjustment";
}

/** Newly created item: the latch can fire immediately on the opening stock. */
export function applyInitialStock(item: ItemState): WriteOutcome {
  return settle({ ...item, availableStock: item.availableStock }, item.availableStock, true);
}
