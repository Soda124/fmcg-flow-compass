import { describe, it, expect } from "vitest";
import { inr, units, perUnit, pctChange, safeDiv } from "./analytics";

describe("analytics formatting", () => {
  it("formats crores", () => expect(inr(22256400000)).toBe("₹2225.64 Cr"));
  it("formats lakhs", () => expect(inr(1240000)).toBe("₹12.40 L"));
  it("formats millions of units", () => expect(units(69560000)).toBe("69.56M"));
  it("formats realization", () => expect(perUnit(319.98)).toBe("₹319.98/u"));
});

describe("comparison guards", () => {
  it("returns null for zero baseline", () => expect(pctChange(100, 0)).toBeNull());
  it("returns null for NaN", () => expect(pctChange(NaN, 5)).toBeNull());
  it("computes growth", () => expect(pctChange(110, 100)).toBeCloseTo(10));
  it("safeDiv avoids Infinity", () => expect(safeDiv(5, 0)).toBe(0));
});
