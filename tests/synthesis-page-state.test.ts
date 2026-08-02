import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  getComparisonStartDecision,
  getComparisonAvailability,
  reconcileComparisonSelectionSource,
  toggleSynthesisSelection,
} from "../lib/synthesis-selection";
import {
  consumeExternalBackRequest,
  recoverMissingCreateReferences,
} from "../app/synthesis/synthesis-workspace-state";
import { createEmptySynthesisDraft } from "../lib/synthesis-draft";

describe("synthesis page comparison selection state", () => {
  it("allows seed comparison exploration but keeps synthesis handoff persisted-only", () => {
    const selected = ["reference-a", "reference-b"];

    expect(getComparisonAvailability("loading", selected)).toEqual({
      canStartComparison: false,
      canHandoff: false,
      handoffBlockReason: "persisted-only",
    });
    expect(getComparisonAvailability("seed", selected)).toEqual({
      canStartComparison: true,
      canHandoff: false,
      handoffBlockReason: "persisted-only",
    });
    expect(getComparisonAvailability("persisted", selected)).toEqual({
      canStartComparison: true,
      canHandoff: true,
      handoffBlockReason: null,
    });
  });

  it("distinguishes missing-count and persisted-only handoff blockers", () => {
    expect(getComparisonAvailability("seed", ["reference-a"]).handoffBlockReason)
      .toBe("needs-more");
    expect(getComparisonAvailability("seed", ["reference-a", "reference-b"]).handoffBlockReason)
      .toBe("persisted-only");
    expect(getComparisonAvailability("persisted", ["reference-a"]).handoffBlockReason)
      .toBe("needs-more");
    expect(getComparisonAvailability("persisted", ["reference-a", "reference-b"]).handoffBlockReason)
      .toBeNull();
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

  it("requires an app confirmation before comparison discards a dirty reference edit", () => {
    expect(getComparisonStartDecision({
      canStartComparison: true,
      isSavingReference: false,
      hasDirtyReferenceEdit: true,
    })).toBe("confirm-discard");
    expect(getComparisonStartDecision({
      canStartComparison: true,
      isSavingReference: false,
      hasDirtyReferenceEdit: false,
    })).toBe("start");
  });

  it("keeps comparison blocked while a reference save is active", () => {
    expect(getComparisonStartDecision({
      canStartComparison: true,
      isSavingReference: true,
      hasDirtyReferenceEdit: true,
    })).toBe("blocked");
  });

  it("preserves the create draft and clears stale IDs after a selected reference disappears", () => {
    const draft = {
      ...createEmptySynthesisDraft(),
      title: "Keep this synthesis",
      original_direction: "Keep this direction",
    };

    expect(recoverMissingCreateReferences(draft)).toEqual({
      draft,
      referenceIds: [],
      needsReselection: true,
    });
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
    expect(pageSource).toContain("handoffBlockReason={comparisonAvailability.handoffBlockReason}");
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

  it("lifts a failed create draft to the page while references are reselected", () => {
    const pageSource = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
    const workspaceSource = readFileSync(
      new URL("../app/synthesis/synthesis-workspace.tsx", import.meta.url),
      "utf8",
    );

    expect(pageSource).toContain("pendingSynthesisDraft");
    expect(pageSource).toContain("initialDraft={pendingSynthesisDraft}");
    expect(pageSource).toContain("onReselectReferences=");
    expect(workspaceSource).toContain("recoverMissingCreateReferences");
    expect(workspaceSource).toContain("createReferenceIds.current = recovery.referenceIds");
  });

  it("reloads persisted references before a recovered draft can reselect IDs", () => {
    const pageSource = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
    const recoveryStart = pageSource.indexOf("async function reselectSynthesisReferences");
    const recoveryEnd = pageSource.indexOf("async function previewMetadata", recoveryStart);
    const recoverySource = pageSource.slice(recoveryStart, recoveryEnd);
    const reloadStart = pageSource.indexOf("const reloadReferenceLibrary");
    const reloadEnd = pageSource.indexOf("useEffect(() =>", reloadStart);
    const reloadSource = pageSource.slice(reloadStart, reloadEnd);

    expect(recoveryStart).toBeGreaterThan(-1);
    expect(reloadStart).toBeGreaterThan(-1);
    expect(reloadSource).toContain('fetch("/api/references")');
    expect(reloadSource).toContain("setReferences(visibleRows)");
    expect(recoverySource).toContain("await reloadReferenceLibrary(null)");
    expect(recoverySource).toContain('nextSource === "persisted"');
  });
});
