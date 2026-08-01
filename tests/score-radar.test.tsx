// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ScoreRadar } from "../app/workspace/score-radar";
import type { ReferenceScoreProfile } from "../lib/reference-score-profile";

afterEach(cleanup);

const completeProfile: ReferenceScoreProfile = {
  complete: true,
  axes: [
    { key: "rating", label: "Rating", value: 4 },
    { key: "reference_value", label: "Reference value", value: 5 },
    { key: "transformability", label: "Transformability", value: 3 },
    { key: "production_readiness", label: "Production readiness", value: 2 },
    { key: "safety", label: "Safety", value: 5 },
  ],
};

describe("ScoreRadar", () => {
  it("renders a labeled five-axis SVG for a complete profile", () => {
    const { container } = render(
      <ScoreRadar
        profile={completeProfile}
        title="Score profile"
        incompleteLabel="Complete all five scores"
      />,
    );

    const radar = screen.getByRole("img", {
      name: /Score profile.*Rating 4.*Safety 5/,
    });
    expect(radar.getAttribute("viewBox")).toBe("0 0 200 180");
    expect(container.querySelectorAll("polygon[data-score-grid]")).toHaveLength(5);
    expect(container.querySelectorAll("line[data-score-axis]")).toHaveLength(5);
    expect(container.querySelectorAll("text[data-score-label]")).toHaveLength(5);
    expect(container.querySelector("polygon[data-score-polygon]")).toBeTruthy();
  });

  it("shows only the fallback when any score is incomplete", () => {
    const incompleteProfile: ReferenceScoreProfile = {
      ...completeProfile,
      complete: false,
      axes: completeProfile.axes.map((axis, index) =>
        index === 0 ? { ...axis, value: null } : axis,
      ),
    };
    const { container } = render(
      <ScoreRadar
        profile={incompleteProfile}
        title="Score profile"
        incompleteLabel="Complete all five scores"
      />,
    );

    expect(screen.getByText("Complete all five scores")).toBeTruthy();
    expect(container.querySelector("svg")).toBeNull();
    expect(container.querySelector("polygon[data-score-polygon]")).toBeNull();
  });
});
