import { describe, expect, it } from "vitest";
import { buildReferenceScoreProfile } from "../lib/reference-score-profile";
import { makeReference } from "./fixtures/backup";

const labels = {
  rating: "Rating",
  referenceValue: "Reference value",
  transformability: "Transformability",
  productionReadiness: "Production readiness",
  safety: "Safety",
};

describe("buildReferenceScoreProfile", () => {
  it("orders the five axes and inverts copyright risk into safety", () => {
    const profile = buildReferenceScoreProfile(
      makeReference({
        rating: 4,
        reference_value_score: 5,
        transformability_score: 3,
        production_readiness_score: 2,
        copyright_risk_score: 1,
      }),
      labels,
    );

    expect(profile.axes.map((axis) => axis.key)).toEqual([
      "rating",
      "reference_value",
      "transformability",
      "production_readiness",
      "safety",
    ]);
    expect(profile.axes.map((axis) => axis.value)).toEqual([4, 5, 3, 2, 5]);
    expect(profile.complete).toBe(true);
  });

  it("marks the profile incomplete for missing or invalid scores", () => {
    expect(
      buildReferenceScoreProfile(makeReference({ rating: null }), labels).complete,
    ).toBe(false);
    expect(
      buildReferenceScoreProfile(
        makeReference({ copyright_risk_score: 0 }),
        labels,
      ).axes.at(-1)?.value,
    ).toBeNull();
    expect(
      buildReferenceScoreProfile(
        makeReference({ production_readiness_score: 2.5 }),
        labels,
      ).complete,
    ).toBe(false);
  });
});
