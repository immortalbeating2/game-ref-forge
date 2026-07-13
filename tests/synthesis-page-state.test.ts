import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  getComparisonAvailability,
  reconcileComparisonSelectionSource,
  toggleSynthesisSelection,
} from "../lib/synthesis-selection";
import { consumeExternalBackRequest } from "../app/synthesis/synthesis-workspace-state";

describe("synthesis page comparison selection state", () => {
  it("allows comparison only after persisted references are ready", () => {
    const selected = ["reference-a", "reference-b"];

    expect(getComparisonAvailability("loading", selected)).toEqual({
      canStartComparison: false,
      canHandoff: false,
    });
    expect(getComparisonAvailability("seed", selected)).toEqual({
      canStartComparison: false,
      canHandoff: false,
    });
    expect(getComparisonAvailability("persisted", selected)).toEqual({
      canStartComparison: true,
      canHandoff: true,
    });
  });

  it("enforces the two-to-four handoff boundary for persisted references", () => {
    expect(
      getComparisonAvailability("persisted", ["reference-a"]).canHandoff,
    ).toBe(false);
    expect(
      getComparisonAvailability("persisted", [
        "reference-a",
        "reference-b",
        "reference-c",
        "reference-d",
      ]).canHandoff,
    ).toBe(true);
    expect(
      getComparisonAvailability("persisted", [
        "reference-a",
        "reference-b",
        "reference-c",
        "reference-d",
        "reference-e",
      ]).canHandoff,
    ).toBe(false);
  });

  it("clears an active selection when the source becomes loading or seed", () => {
    const activeSelection = {
      isActive: true,
      referenceIds: ["reference-a", "reference-b"],
    };

    expect(
      reconcileComparisonSelectionSource(activeSelection, "seed"),
    ).toEqual({ isActive: false, referenceIds: [] });
    expect(
      reconcileComparisonSelectionSource(activeSelection, "loading"),
    ).toEqual({ isActive: false, referenceIds: [] });
    expect(
      reconcileComparisonSelectionSource(activeSelection, "persisted"),
    ).toBe(activeSelection);
  });

  it("does not add a fifth reference", () => {
    expect(
      toggleSynthesisSelection(
        ["reference-a", "reference-b", "reference-c", "reference-d"],
        "reference-e",
      ),
    ).toEqual(["reference-a", "reference-b", "reference-c", "reference-d"]);
  });

  it("consumes each external back request token only once", () => {
    const first = consumeExternalBackRequest(0, 1);
    const repeated = consumeExternalBackRequest(first.nextHandledToken, 1);
    const second = consumeExternalBackRequest(repeated.nextHandledToken, 2);

    expect(first).toEqual({ nextHandledToken: 1, shouldHandle: true });
    expect(repeated).toEqual({ nextHandledToken: 1, shouldHandle: false });
    expect(second).toEqual({ nextHandledToken: 2, shouldHandle: true });
  });

  it("wires reference source reconciliation into the page", () => {
    const pageSource = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");

    expect(pageSource).toContain('useState<ReferenceDataSource>("loading")');
    expect(pageSource).toContain("reconcileComparisonSelectionSource");
    expect(pageSource).toContain("comparisonAvailability.canHandoff");
  });

  it("routes the segmented back action through the workspace navigation guard", () => {
    const pageSource = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
    const workspaceSource = readFileSync(
      new URL("../app/synthesis/synthesis-workspace.tsx", import.meta.url),
      "utf8",
    );

    expect(pageSource).toContain("externalBackRequestToken={externalBackRequestToken}");
    expect(pageSource).not.toMatch(
      /aria-pressed=\{workspaceView === "references"\}[\s\S]{0,200}setWorkspaceView\("references"\)/,
    );
    expect(workspaceSource).toContain("consumeExternalBackRequest");
    expect(workspaceSource).toContain('requestNavigation({ kind: "back" })');
  });
});
