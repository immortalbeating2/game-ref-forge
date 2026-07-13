import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import type { SynthesisDetail } from "../lib/synthesis";
import { createEmptySynthesisDraft, detailToSynthesisDraft, isSynthesisDraftDirty } from "../lib/synthesis-draft";
import {
  applyArchiveResult,
  applyRefreshResult,
  canCommitController,
  getDialogKeyboardAction,
  getInitialDialogFocusIndex,
  getInitialReferenceConsumption,
  isEditorMutationBusy,
  isRefreshingRelation,
  runOwnedSynthesisMutation,
  tryAcquireOperationGuard,
} from "../app/synthesis/synthesis-workspace-state";

function makeDetail(id: string, title: string): SynthesisDetail {
  return {
    id,
    title,
    target_asset: null,
    shared_principles: null,
    key_differences: null,
    original_direction: null,
    avoid_copying_notes: null,
    design_constraints: null,
    experiment_plan: null,
    next_actions: null,
    additional_notes: null,
    status: "draft",
    created_at: "2026-07-14T00:00:00.000Z",
    updated_at: "2026-07-14T00:00:00.000Z",
    references: [],
  };
}

describe("synthesis workspace state regressions", () => {
  it("ignores a refresh response after the active synthesis changes", () => {
    const state = {
      activeDetail: makeDetail("syn-b", "B"),
      draft: { ...createEmptySynthesisDraft(), title: "B draft" },
      isDraftDirty: true,
    };

    expect(applyRefreshResult(state, "syn-a", makeDetail("syn-a", "A refreshed"))).toBe(state);
  });

  it("updates only the detail snapshot and preserves the current draft", () => {
    const draft = { ...createEmptySynthesisDraft(), title: "A current draft" };
    const result = applyRefreshResult({
      activeDetail: makeDetail("syn-a", "A"),
      draft,
      isDraftDirty: false,
    }, "syn-a", makeDetail("syn-a", "A refreshed"));

    expect(result.activeDetail?.title).toBe("A refreshed");
    expect(result.draft).toBe(draft);
  });

  it("allows the same reference selection to be consumed after an empty handoff", () => {
    const first = getInitialReferenceConsumption(null, ["ref-a", "ref-b"]);
    const empty = getInitialReferenceConsumption(first.nextSignature, []);
    const second = getInitialReferenceConsumption(empty.nextSignature, ["ref-a", "ref-b"]);

    expect(first.shouldConsume).toBe(true);
    expect(empty.nextSignature).toBeNull();
    expect(second.shouldConsume).toBe(true);
  });

  it("acquires a synchronous operation guard only once", () => {
    const guard = { current: false };

    expect(tryAcquireOperationGuard(guard)).toBe(true);
    expect(tryAcquireOperationGuard(guard)).toBe(false);
  });

  it("maps Escape to cancel and wraps modal Tab focus", () => {
    expect(getDialogKeyboardAction("Escape", false, 0, 2)).toEqual({ kind: "cancel" });
    expect(getDialogKeyboardAction("Tab", false, 1, 2)).toEqual({ kind: "focus", index: 0 });
    expect(getDialogKeyboardAction("Tab", true, 0, 2)).toEqual({ kind: "focus", index: 1 });
    expect(getDialogKeyboardAction("Tab", false, -1, 0)).toEqual({ kind: "focus", index: -1 });
  });

  it("chooses a stable initial dialog focus target and constrains a single control", () => {
    expect(getInitialDialogFocusIndex(2)).toBe(0);
    expect(getInitialDialogFocusIndex(0)).toBe(-1);
    expect(getDialogKeyboardAction("Tab", false, 0, 1)).toEqual({ kind: "focus", index: 0 });
    expect(getDialogKeyboardAction("Tab", true, 0, 1)).toEqual({ kind: "focus", index: 0 });
  });

  it("treats refresh as an editor mutation busy state", () => {
    expect(isEditorMutationBusy({ isSaving: false, isArchiving: false, isRefreshing: true })).toBe(true);
    expect(isEditorMutationBusy({ isSaving: false, isArchiving: false, isRefreshing: false })).toBe(false);
  });

  it("wires refresh busy into field, save, delete, and visible status controls", () => {
    const editorSource = readFileSync(
      new URL("../app/synthesis/synthesis-editor.tsx", import.meta.url),
      "utf8",
    );

    expect(editorSource).toContain("getIsEditorMutationBusy({ isSaving, isArchiving, isRefreshing })");
    expect(editorSource).toContain("copy.refreshingSnapshot");
    expect(editorSource).toMatch(/onDelete[^\n]+disabled=\{isDeleting \|\| isEditorMutationBusy\}/);
    expect(editorSource).toMatch(/type="submit" disabled=\{isEditorMutationBusy\}/);
  });

  it("marks only the requested relation card as refreshing", () => {
    expect(isRefreshingRelation("relation-a", "relation-a")).toBe(true);
    expect(isRefreshingRelation("relation-a", "relation-b")).toBe(false);
    expect(isRefreshingRelation(null, "relation-a")).toBe(false);

    const editorSource = readFileSync(
      new URL("../app/synthesis/synthesis-editor.tsx", import.meta.url),
      "utf8",
    );
    expect(editorSource).toContain("isRefreshingRelation(refreshingRelationId, link.id)");
  });

  it("uses the shared app confirmation for synthesis and reference dirty dialogs", () => {
    const pageSource = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
    const workspaceSource = readFileSync(
      new URL("../app/synthesis/synthesis-workspace.tsx", import.meta.url),
      "utf8",
    );

    expect(pageSource).toContain("<SynthesisConfirmation");
    expect(workspaceSource).toContain("<SynthesisConfirmation");
  });

  it("does not start Save A while Archive A is pending", async () => {
    const guard = { current: new Map() };
    const requests: string[] = [];
    let finishArchive = () => {};
    const archivePending = new Promise<void>((resolve) => { finishArchive = resolve; });
    const archive = runOwnedSynthesisMutation(guard, "syn-a", "archive", async () => {
      requests.push("archive");
      await archivePending;
    });

    const save = await runOwnedSynthesisMutation(guard, "syn-a", "save", async () => {
      requests.push("save");
    });

    expect(save).toEqual({ started: false });
    expect(requests).toEqual(["archive"]);
    finishArchive();
    await archive;
  });

  it("does not start Archive A while Save A is pending", async () => {
    const guard = { current: new Map() };
    const requests: string[] = [];
    let finishSave = () => {};
    const savePending = new Promise<void>((resolve) => { finishSave = resolve; });
    const save = runOwnedSynthesisMutation(guard, "syn-a", "save", async () => {
      requests.push("save");
      await savePending;
    });

    const archive = await runOwnedSynthesisMutation(guard, "syn-a", "archive", async () => {
      requests.push("archive");
    });

    expect(archive).toEqual({ started: false });
    expect(requests).toEqual(["save"]);
    finishSave();
    await save;
  });

  it("preserves edits made to A while its archive request is pending", () => {
    const original = makeDetail("syn-a", "A");
    const baseline = detailToSynthesisDraft(original);
    const editedDraft = { ...baseline, title: "A edited while archiving" };
    const archived = { ...original, status: "archived" as const };

    const result = applyArchiveResult({ activeDetail: original, draft: editedDraft }, "syn-a", baseline, archived);

    expect(result.activeDetail).toBe(archived);
    expect(result.draft).toBe(editedDraft);
  });

  it("keeps B active and edited when A archive returns late", () => {
    const originalA = makeDetail("syn-a", "A");
    const baselineA = detailToSynthesisDraft(originalA);
    const activeB = makeDetail("syn-b", "B");
    const draftB = { ...detailToSynthesisDraft(activeB), title: "B edited" };
    const state = { activeDetail: activeB, draft: draftB };

    expect(applyArchiveResult(
      state,
      "syn-a",
      baselineA,
      { ...originalA, status: "archived" },
    )).toBe(state);
  });

  it("applies archived A and rebuilds a clean draft without concurrent edits", () => {
    const original = { ...makeDetail("syn-a", "A"), original_direction: "Keep this field" };
    const baseline = detailToSynthesisDraft(original);
    const archived = { ...original, status: "archived" as const };

    const result = applyArchiveResult({ activeDetail: original, draft: baseline }, "syn-a", baseline, archived);

    expect(result.activeDetail).toBe(archived);
    expect(result.draft.status).toBe("archived");
    expect(result.draft.original_direction).toBe("Keep this field");
    expect(isSynthesisDraftDirty(result.draft, archived)).toBe(false);
  });

  it("commits an async result only for the current live controller", () => {
    const current = new AbortController();
    const stale = new AbortController();

    expect(canCommitController(current, current)).toBe(true);
    expect(canCommitController(current, stale)).toBe(false);
    current.abort();
    expect(canCommitController(current, current)).toBe(false);
  });

  it("gives mobile synthesis header and select controls 44px targets", () => {
    const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
    const mobileBlock = css.slice(css.indexOf("@media (max-width: 720px)"));

    expect(mobileBlock).toMatch(/\.synthesis-workspace-header button[\s\S]*min-height:\s*44px/);
    expect(mobileBlock).toMatch(/\.synthesis-toolbar select[\s\S]*min-height:\s*44px/);
    expect(mobileBlock).toMatch(/\.synthesis-list select[\s\S]*min-height:\s*44px/);
  });
});
