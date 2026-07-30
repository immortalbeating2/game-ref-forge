// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
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
      />,
    );

    expect(
      screen.getByRole("checkbox", { name: "Kenney UI Pack" }).getAttribute("aria-checked"),
    ).toBe("true");
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
});
