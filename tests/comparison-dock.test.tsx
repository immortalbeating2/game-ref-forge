// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ComparisonDock } from "../app/workspace/comparison-dock";
import { uiCopy } from "../lib/localization";
import { makeReference } from "./fixtures/backup";

afterEach(cleanup);

function makeProps(count = 2) {
  return {
    canHandoff: count >= 2,
    handoffBlockReason: count >= 2 ? null : "needs-more" as const,
    copy: uiCopy("en"),
    onCancel: vi.fn(),
    onEnter: vi.fn(),
    onRemove: vi.fn(),
    references: Array.from({ length: count }, (_, index) =>
      makeReference({
        id: `ref-${index + 1}`,
        title: `Reference ${index + 1}`,
      }),
    ),
  };
}

describe("ComparisonDock", () => {
  it("shows ordered references and enables synthesis at two items", () => {
    render(<ComparisonDock {...makeProps(2)} />);

    expect(
      screen.getByText("Click cards to add them in comparison order"),
    ).toBeTruthy();
    expect(screen.getByText("1")).toBeTruthy();
    expect(screen.getByText("2")).toBeTruthy();
    expect(screen.getByText("Reference 1")).toBeTruthy();
    expect(screen.getByText("Reference 2")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Enter synthesis" })).not.toHaveProperty(
      "disabled",
      true,
    );
  });

  it("reports the missing count and keeps the entry action disabled", () => {
    render(<ComparisonDock {...makeProps(1)} />);

    expect(screen.getByText("Select at least 1 more")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Enter synthesis" })).toHaveProperty(
      "disabled",
      true,
    );
  });

  it("removes an item and collapses without clearing the selection", async () => {
    const user = userEvent.setup();
    const props = makeProps(2);

    render(<ComparisonDock {...props} />);
    await user.click(
      screen.getByRole("button", { name: "Remove from comparison: Reference 1" }),
    );
    await user.click(screen.getByRole("button", { name: "Collapse comparison dock" }));

    expect(props.onRemove).toHaveBeenCalledWith("ref-1");
    expect(screen.queryByText("Reference 1")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Expand comparison dock" }).getAttribute(
        "aria-expanded",
      ),
    ).toBe("false");
  });

  it("collapses on Escape without cancelling the comparison", async () => {
    const user = userEvent.setup();
    const props = makeProps(2);

    render(<ComparisonDock {...props} />);
    await user.keyboard("{Escape}");

    expect(
      screen.getByRole("button", { name: "Expand comparison dock" }).getAttribute(
        "aria-expanded",
      ),
    ).toBe("false");
    expect(props.onCancel).not.toHaveBeenCalled();
  });

  it("falls back after a preview error and retries a changed preview URL", () => {
    const props = makeProps(1);
    props.references[0] = makeReference({
      id: "ref-1",
      title: "Reference 1",
      asset_category: "material_texture",
      preview_url: "https://example.com/broken.jpg",
    });

    const { container, rerender } = render(<ComparisonDock {...props} />);
    fireEvent.error(
      container.querySelector("img.reference-preview__remote") as HTMLImageElement,
    );

    expect(container.querySelector("img.reference-preview__remote")).toBeNull();
    expect(
      container.querySelector("img.reference-preview__local")?.getAttribute("src"),
    ).toBe("/art/reference-material-texture.svg");

    props.references[0] = {
      ...props.references[0],
      preview_url: "https://example.com/repaired.jpg",
    };
    rerender(<ComparisonDock {...props} />);

    expect(
      container
        .querySelector("img.reference-preview__remote")
        ?.getAttribute("src"),
    ).toBe("https://example.com/repaired.jpg");
  });

  it("explains the persisted-only handoff boundary for two seed references", () => {
    render(
      <ComparisonDock
        {...makeProps(2)}
        canHandoff={false}
        handoffBlockReason="persisted-only"
      />,
    );

    expect(
      screen.getByText(
        "Examples can be explored in comparison; save at least two references before entering synthesis.",
      ),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Enter synthesis" })).toHaveProperty(
      "disabled",
      true,
    );
  });

  it("shows no blocking reason when two persisted references can hand off", () => {
    render(<ComparisonDock {...makeProps(2)} />);

    expect(screen.queryByText(/save at least two references/i)).toBeNull();
    expect(screen.getByRole("button", { name: "Enter synthesis" })).toHaveProperty(
      "disabled",
      false,
    );
  });
});
