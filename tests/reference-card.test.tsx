// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ReferenceCard } from "../app/workspace/reference-card";
import { uiCopy } from "../lib/localization";
import { makeReference } from "./fixtures/backup";

afterEach(cleanup);

function makeProps() {
  return {
    copy: uiCopy("en"),
    density: "compact" as const,
    disabled: false,
    isComparisonMode: false,
    isComparisonSelected: false,
    comparisonPosition: null,
    isPinned: false,
    isSelected: false,
    language: "en" as const,
    limitReached: false,
    onActivate: vi.fn(),
    onTogglePinned: vi.fn(),
    reference: makeReference({
      title: "Kenney UI Pack",
      site_name: "Kenney",
      preview_url: null,
      asset_category: "ui_hud",
      license_status: "cc0_or_public_domain",
      public_status: "review",
      quality_status: "analyzed",
    }),
  };
}

describe("ReferenceCard", () => {
  it("keeps safety and quality visible in compact density", () => {
    render(<ReferenceCard {...makeProps()} />);

    const card = screen.getByRole("button", { name: "Kenney UI Pack" });
    expect(card.classList.contains("reference-card__select")).toBe(true);
    expect(card.closest("article")?.classList.contains("reference-card--compact")).toBe(true);
    expect(card.querySelector(".reference-preview")).toBeTruthy();
    expect(card.querySelector(".reference-card__preview")).toBeTruthy();
    expect(card.querySelector(".accent-ui_hud")).toBeNull();
    expect(screen.getByText("UI/HUD")).toBeTruthy();
    expect(screen.getByText("cc0 or public domain")).toBeTruthy();
    expect(screen.getByText("review")).toBeTruthy();
    expect(screen.getByText("analyzed")).toBeTruthy();
  });

  it("uses checkbox semantics and a visible selected marker in comparison mode", () => {
    render(
      <ReferenceCard
        {...makeProps()}
        isComparisonMode
        isComparisonSelected
        comparisonPosition={2}
      />,
    );

    expect(
      screen.getByRole("checkbox", { name: "Kenney UI Pack" }).getAttribute("aria-checked"),
    ).toBe("true");
    expect(
      screen.getByText("2", { selector: ".reference-card__comparison-position" }),
    ).toBeTruthy();
    expect(screen.getByText("Selected")).toBeTruthy();
  });

  it("keeps pinning separate from card activation", async () => {
    const user = userEvent.setup();
    const props = makeProps();

    render(<ReferenceCard {...props} />);
    await user.click(screen.getByRole("button", { name: "Pin reference" }));

    expect(props.onTogglePinned).toHaveBeenCalledTimes(1);
    expect(props.onActivate).not.toHaveBeenCalled();
  });

  it("retries the preview when the URL changes for the same reference", () => {
    const props = makeProps();
    props.reference = {
      ...props.reference,
      preview_url: "https://example.com/broken.jpg",
    };

    const { container, rerender } = render(<ReferenceCard {...props} />);
    fireEvent.error(
      container.querySelector("img.reference-preview__remote") as HTMLImageElement,
    );

    expect(container.querySelector("img.reference-preview__remote")).toBeNull();
    expect(
      container.querySelector("img.reference-preview__local")?.getAttribute("src"),
    ).toBe("/art/reference-ui-hud.svg");
    expect(screen.getByText("UI/HUD")).toBeTruthy();

    props.reference = {
      ...props.reference,
      preview_url: "https://example.com/repaired.jpg",
    };
    rerender(<ReferenceCard {...props} />);

    expect(
      container
        .querySelector("img.reference-preview__remote")
        ?.getAttribute("src"),
    ).toBe("https://example.com/repaired.jpg");
  });

  it("keeps a long bilingual title, source, three states, and three scores in the card body", () => {
    const props = makeProps();
    const source = "A very long source name that must remain judgeable";
    props.reference = makeReference({
      ...props.reference,
      title: "超长中文参考标题用于验证两行层级与 English research source context",
      site_name: source,
      reference_value_score: 5,
      transformability_score: 4,
      copyright_risk_score: 1,
    });

    const { container } = render(<ReferenceCard {...props} />);

    expect(container.querySelector(".reference-card__title")?.textContent).toBe(props.reference.title);
    expect(screen.getAllByText(source)).not.toHaveLength(0);
    expect(screen.getByText("cc0 or public domain")).toBeTruthy();
    expect(screen.getByText("review")).toBeTruthy();
    expect(screen.getByText("analyzed")).toBeTruthy();
    expect(screen.getByText("Reference value: 5")).toBeTruthy();
    expect(screen.getByText("Transformability: 4")).toBeTruthy();
    expect(screen.getByText("Copyright risk: 1")).toBeTruthy();
  });
});
