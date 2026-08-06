import { describe, expect, it } from "vitest";
import {
  applyAdjustment,
  applyInitialStock,
  applyPurchase,
  computeItemStatus,
  evaluateReorderLatch,
  movementTypeForChange,
  type ItemState,
} from "./reorder-logic";

const base: ItemState = {
  availableStock: 40,
  reorderLevel: 20,
  status: "In Stock",
  reorderNotified: false,
};

describe("computeItemStatus", () => {
  it("reports Out of Stock at zero or below", () => {
    expect(computeItemStatus(0, 20, "In Stock")).toBe("Out of Stock");
    expect(computeItemStatus(-3, 20, "In Stock")).toBe("Out of Stock");
  });

  it("reports Reorder Required at or below the reorder level", () => {
    expect(computeItemStatus(20, 20, "In Stock")).toBe("Reorder Required");
    expect(computeItemStatus(19, 20, "In Stock")).toBe("Reorder Required");
  });

  it("reports Low Stock within 25 percent above the reorder level", () => {
    expect(computeItemStatus(21, 20, "In Stock")).toBe("Low Stock");
    expect(computeItemStatus(25, 20, "In Stock")).toBe("Low Stock");
  });

  it("reports In Stock above the low stock band", () => {
    expect(computeItemStatus(26, 20, "In Stock")).toBe("In Stock");
  });

  it("never changes a Discontinued item automatically", () => {
    expect(computeItemStatus(0, 20, "Discontinued")).toBe("Discontinued");
    expect(computeItemStatus(500, 20, "Discontinued")).toBe("Discontinued");
  });

  it("treats a zero reorder level as Reorder Required only at zero stock", () => {
    expect(computeItemStatus(0, 0, "In Stock")).toBe("Out of Stock");
    expect(computeItemStatus(1, 0, "In Stock")).toBe("In Stock");
  });
});

describe("evaluateReorderLatch", () => {
  it("raises exactly one notification on entering the low stock event", () => {
    const first = evaluateReorderLatch({
      previousNotified: false,
      stock: 20,
      reorderLevel: 20,
      status: "Reorder Required",
    });
    expect(first).toEqual({ notified: true, notify: true });

    const second = evaluateReorderLatch({
      previousNotified: true,
      stock: 18,
      reorderLevel: 20,
      status: "Reorder Required",
    });
    expect(second).toEqual({ notified: true, notify: false });
  });

  it("clears the latch once stock is replenished above the reorder level", () => {
    expect(
      evaluateReorderLatch({
        previousNotified: true,
        stock: 30,
        reorderLevel: 20,
        status: "In Stock",
      }),
    ).toEqual({ notified: false, notify: false });
  });

  it("never notifies for a Discontinued item", () => {
    expect(
      evaluateReorderLatch({
        previousNotified: false,
        stock: 0,
        reorderLevel: 20,
        status: "Discontinued",
      }),
    ).toEqual({ notified: false, notify: false });
  });

  it("notifies immediately for a new item created at or below its reorder level", () => {
    expect(
      evaluateReorderLatch({
        previousNotified: false,
        stock: 5,
        reorderLevel: 10,
        status: "Reorder Required",
        isInsert: true,
      }),
    ).toEqual({ notified: true, notify: true });
  });
});

describe("applyPurchase", () => {
  it("adds the quantity received and recomputes the status", () => {
    const result = applyPurchase({ ...base, availableStock: 5, status: "Reorder Required" }, 60);
    expect(result.availableStock).toBe(65);
    expect(result.quantityChange).toBe(60);
    expect(result.status).toBe("In Stock");
  });

  it("resets the reorder latch when stock rises above the reorder level", () => {
    const result = applyPurchase(
      { availableStock: 4, reorderLevel: 20, status: "Reorder Required", reorderNotified: true },
      50,
    );
    expect(result.reorderNotified).toBe(false);
    expect(result.notify).toBe(false);
  });

  it("keeps the latch set when the delivery is still not enough", () => {
    const result = applyPurchase(
      { availableStock: 2, reorderLevel: 20, status: "Reorder Required", reorderNotified: true },
      5,
    );
    expect(result.availableStock).toBe(7);
    expect(result.status).toBe("Reorder Required");
    expect(result.reorderNotified).toBe(true);
    expect(result.notify).toBe(false);
  });

  it("rejects a quantity that is not a positive whole number", () => {
    expect(() => applyPurchase(base, 0)).toThrow(/greater than zero/);
    expect(() => applyPurchase(base, -5)).toThrow(/greater than zero/);
    expect(() => applyPurchase(base, 2.5)).toThrow(/whole number/);
  });
});

describe("applyAdjustment", () => {
  it("raises one notification when usage takes stock to the reorder level", () => {
    const result = applyAdjustment(base, -20);
    expect(result.availableStock).toBe(20);
    expect(result.status).toBe("Reorder Required");
    expect(result.notify).toBe(true);
    expect(result.reorderNotified).toBe(true);
  });

  it("does not notify twice for the same low stock event", () => {
    const first = applyAdjustment(base, -20);
    const second = applyAdjustment(
      {
        availableStock: first.availableStock,
        reorderLevel: first.reorderLevel,
        status: first.status,
        reorderNotified: first.reorderNotified,
      },
      -5,
    );
    expect(second.notify).toBe(false);
  });

  it("notifies again after a replenish and a second dip", () => {
    const dip = applyAdjustment(base, -25);
    expect(dip.notify).toBe(true);

    const replenished = applyPurchase(
      {
        availableStock: dip.availableStock,
        reorderLevel: dip.reorderLevel,
        status: dip.status,
        reorderNotified: dip.reorderNotified,
      },
      60,
    );
    expect(replenished.reorderNotified).toBe(false);

    const secondDip = applyAdjustment(
      {
        availableStock: replenished.availableStock,
        reorderLevel: replenished.reorderLevel,
        status: replenished.status,
        reorderNotified: replenished.reorderNotified,
      },
      -60,
    );
    expect(secondDip.availableStock).toBe(15);
    expect(secondDip.notify).toBe(true);
  });

  it("never drives stock below zero", () => {
    const result = applyAdjustment({ ...base, availableStock: 3 }, -10);
    expect(result.availableStock).toBe(0);
    expect(result.quantityChange).toBe(-3);
    expect(result.status).toBe("Out of Stock");
  });

  it("leaves a Discontinued item untouched in status and latch", () => {
    const result = applyAdjustment(
      { availableStock: 10, reorderLevel: 20, status: "Discontinued", reorderNotified: false },
      -10,
    );
    expect(result.status).toBe("Discontinued");
    expect(result.notify).toBe(false);
  });

  it("rejects a zero or fractional change", () => {
    expect(() => applyAdjustment(base, 0)).toThrow(/other than zero/);
    expect(() => applyAdjustment(base, 1.5)).toThrow(/other than zero/);
  });

  it("labels negative changes as Usage and positive changes as Stock Adjustment", () => {
    expect(movementTypeForChange(-4)).toBe("Usage");
    expect(movementTypeForChange(4)).toBe("Stock Adjustment");
  });
});

describe("applyInitialStock", () => {
  it("flags a new item that opens at or below its reorder level", () => {
    const result = applyInitialStock({
      availableStock: 5,
      reorderLevel: 10,
      status: "In Stock",
      reorderNotified: false,
    });
    expect(result.status).toBe("Reorder Required");
    expect(result.notify).toBe(true);
  });

  it("leaves a healthy new item alone", () => {
    const result = applyInitialStock({
      availableStock: 100,
      reorderLevel: 10,
      status: "In Stock",
      reorderNotified: false,
    });
    expect(result.status).toBe("In Stock");
    expect(result.notify).toBe(false);
  });
});
