import { describe, expect, it } from "vitest";

import * as PageModule from "../app/page";

type ComparisonSelectionControls = {
  comparisonReferenceIds: string[];
  isStartComparisonDisabled: boolean;
  canEnterSynthesis: boolean;
};

const getComparisonSelectionControls = (
  PageModule as typeof PageModule & {
    getComparisonSelectionControls?: (
      comparisonReferenceIds: string[],
      isUsingSeedReferences: boolean,
    ) => ComparisonSelectionControls;
  }
).getComparisonSelectionControls;

describe("synthesis page comparison selection state", () => {
  it("preserves selected IDs when the visible filter set changes", () => {
    const controls = getComparisonSelectionControls?.(["reference-a", "reference-b"], false);

    expect(controls?.comparisonReferenceIds).toEqual(["reference-a", "reference-b"]);
  });

  it("keeps four selections as the maximum", () => {
    const controls = getComparisonSelectionControls?.(
      ["reference-a", "reference-b", "reference-c", "reference-d", "reference-e"],
      false,
    );

    expect(controls?.canEnterSynthesis).toBe(false);
  });

  it("allows entering synthesis only with two to four selected references", () => {
    expect(getComparisonSelectionControls?.(["reference-a"], false)?.canEnterSynthesis).toBe(false);
    expect(getComparisonSelectionControls?.(["reference-a", "reference-b"], false)?.canEnterSynthesis).toBe(true);
    expect(getComparisonSelectionControls?.(["reference-a", "reference-b", "reference-c", "reference-d"], false)?.canEnterSynthesis).toBe(true);
  });

  it("disables comparison start while only seed examples are available", () => {
    expect(getComparisonSelectionControls?.([], true)?.isStartComparisonDisabled).toBe(true);
    expect(getComparisonSelectionControls?.([], false)?.isStartComparisonDisabled).toBe(false);
  });
});
