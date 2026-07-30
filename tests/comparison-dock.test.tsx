// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ComparisonDock } from "../app/workspace/comparison-dock";
import { uiCopy } from "../lib/localization";
import { makeReference } from "./fixtures/backup";

afterEach(cleanup);

function makeProps(count = 2) {
  return {
    canHandoff: count >= 2,
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
});
