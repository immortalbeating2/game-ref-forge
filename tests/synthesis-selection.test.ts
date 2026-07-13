import { describe, expect, it } from "vitest";
import {
  canEnterSynthesisComparison,
  toggleSynthesisSelection,
} from "../lib/synthesis-selection";

describe("temporary synthesis selection", () => {
  it("toggles a reference while preserving insertion order", () => {
    expect(toggleSynthesisSelection([], "a")).toEqual(["a"]);
    expect(toggleSynthesisSelection(["a"], "a")).toEqual([]);
    expect(toggleSynthesisSelection(["a", "b"], "c")).toEqual(["a", "b", "c"]);
  });

  it("does not add a fifth reference", () => {
    expect(toggleSynthesisSelection(["a", "b", "c", "d"], "e")).toEqual([
      "a",
      "b",
      "c",
      "d",
    ]);
  });

  it("allows comparison only for two to four unique references", () => {
    expect(canEnterSynthesisComparison(["a", "b"])).toBe(true);
    expect(canEnterSynthesisComparison(["a", "b", "c", "d"])).toBe(true);
    expect(canEnterSynthesisComparison(["a"])).toBe(false);
    expect(canEnterSynthesisComparison(["a", "a"])).toBe(false);
    expect(canEnterSynthesisComparison(["a", "b", "c", "d", "e"])).toBe(false);
  });
});
