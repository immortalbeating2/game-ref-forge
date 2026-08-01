// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ReferenceDetail } from "../app/workspace/reference-detail";
import { uiCopy } from "../lib/localization";
import { makeReference } from "./fixtures/backup";

afterEach(cleanup);

function makeProps() {
  return {
    copy: uiCopy("en"),
    deleteCopy: {
      title: "Delete reference?",
      body: "This cannot be undone.",
      cancel: "Cancel",
      confirm: "Delete",
    },
    isDeleting: false,
    language: "en" as const,
    onCancelDelete: vi.fn(),
    onConfirmDelete: vi.fn(),
    onRequestDelete: vi.fn(),
    onStartQualityEditing: vi.fn(),
    pendingDelete: false,
    reference: makeReference({
      title: "Material study",
      site_name: "Poly Haven",
      rating: 4,
    }),
  };
}

describe("ReferenceDetail", () => {
  it("uses the approved section order and keeps source safety open", () => {
    const { container } = render(<ReferenceDetail {...makeProps()} />);

    const titles = Array.from(
      container.querySelectorAll<HTMLElement>(".detail-section__title"),
    ).map((node) => node.textContent);

    expect(titles).toEqual([
      "Source and safety",
      "Score matrix",
      "Quality checklist",
      "Tag axes",
      "Inspiration extraction",
    ]);
    expect(screen.getByText("Poly Haven")).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Source and safety" }),
    ).toBeNull();
  });

  it("keeps exact score values alongside an accessible derived profile", () => {
    render(
      <ReferenceDetail
        {...makeProps()}
        reference={makeReference({
          rating: 4,
          reference_value_score: 5,
          transformability_score: 3,
          production_readiness_score: 2,
          copyright_risk_score: 1,
        })}
      />,
    );

    expect(
      screen.getByRole("img", {
        name: /Score profile.*Rating 4.*Safety 5/,
      }),
    ).toBeTruthy();
    expect(screen.getByText("Copyright risk: 1")).toBeTruthy();
    expect(screen.getByText("Production readiness: 2")).toBeTruthy();
  });

  it("keeps the numeric matrix and shows a localized incomplete radar fallback", () => {
    const { container } = render(
      <ReferenceDetail
        {...makeProps()}
        reference={makeReference({ rating: null })}
      />,
    );

    expect(screen.getByText("Rating: -")).toBeTruthy();
    expect(screen.getByText("Complete all five scores to view the profile.")).toBeTruthy();
    expect(container.querySelector("polygon[data-score-polygon]")).toBeNull();
  });

  it("collapses a long section with aria state", async () => {
    const user = userEvent.setup();
    render(<ReferenceDetail {...makeProps()} />);

    const scores = screen.getByRole("button", { name: "Score matrix" });
    expect(scores.getAttribute("aria-expanded")).toBe("true");
    const scoreContentId = scores.getAttribute("aria-controls");
    expect(scoreContentId).toBeTruthy();
    expect(document.getElementById(scoreContentId ?? "")).toBeTruthy();
    expect(screen.getByText("Rating: 4")).toBeTruthy();

    await user.click(scores);

    expect(scores.getAttribute("aria-expanded")).toBe("false");
    expect(document.getElementById(scoreContentId ?? "")).toBeNull();
    expect(screen.queryByText("Rating: 4")).toBeNull();
  });

  it("preserves quality navigation and delete events", async () => {
    const user = userEvent.setup();
    const props = makeProps();
    render(
      <ReferenceDetail
        {...props}
        reference={makeReference({ author: null })}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Complete: Add author" }));
    expect(props.onStartQualityEditing).toHaveBeenCalledWith({
      field: "author",
      group: "source",
    });

    await user.click(screen.getByRole("button", { name: "Delete reference" }));
    expect(props.onRequestDelete).toHaveBeenCalledOnce();
  });

  it("keeps the quality issue count visible while details are collapsed", async () => {
    const user = userEvent.setup();
    render(
      <ReferenceDetail
        {...makeProps()}
        reference={makeReference({ author: null })}
      />,
    );

    const quality = screen.getByRole("button", { name: "Quality checklist" });
    expect(quality.textContent).toMatch(/Incomplete: \d+/);
    await user.click(quality);
    expect(quality.textContent).toMatch(/Incomplete: \d+/);
  });

  it("renders the four inspiration extraction groups from existing fields", () => {
    render(<ReferenceDetail {...makeProps()} />);

    expect(screen.getByText("Observation")).toBeTruthy();
    expect(screen.getByText("Reusable principles")).toBeTruthy();
    expect(screen.getAllByText("Avoid copying").length).toBeGreaterThan(0);
    expect(screen.getByText("Transformation direction")).toBeTruthy();
  });
});
