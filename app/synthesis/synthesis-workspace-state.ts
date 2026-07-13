import type { SynthesisDetail } from "../../lib/synthesis";
import { detailToSynthesisDraft, type SynthesisDraft } from "../../lib/synthesis-draft";

export type SynthesisMutationKind = "save" | "archive" | "refresh" | "delete";
export type SynthesisMutationGuard = {
  current: Map<string, SynthesisMutationKind>;
};

export async function runOwnedSynthesisMutation<T>(
  guard: SynthesisMutationGuard,
  synthesisId: string,
  kind: SynthesisMutationKind,
  operation: () => Promise<T>,
): Promise<{ started: false } | { started: true; value: T }> {
  if (guard.current.has(synthesisId)) {
    return { started: false };
  }

  guard.current.set(synthesisId, kind);
  try {
    return { started: true, value: await operation() };
  } finally {
    if (guard.current.get(synthesisId) === kind) {
      guard.current.delete(synthesisId);
    }
  }
}

export type ArchiveWorkspaceState = {
  activeDetail: SynthesisDetail | null;
  draft: SynthesisDraft;
};

export function applyArchiveResult(
  state: ArchiveWorkspaceState,
  requestSynthesisId: string,
  requestDraftBaseline: SynthesisDraft,
  responseDetail: SynthesisDetail,
): ArchiveWorkspaceState {
  if (state.activeDetail?.id !== requestSynthesisId) {
    return state;
  }

  return {
    activeDetail: responseDetail,
    draft: JSON.stringify(state.draft) === JSON.stringify(requestDraftBaseline)
      ? detailToSynthesisDraft(responseDetail)
      : state.draft,
  };
}

export type RefreshWorkspaceState = {
  activeDetail: SynthesisDetail | null;
  draft: SynthesisDraft;
  isDraftDirty: boolean;
};

export function applyRefreshResult(
  state: RefreshWorkspaceState,
  requestSynthesisId: string,
  responseDetail: SynthesisDetail,
): RefreshWorkspaceState {
  if (state.activeDetail?.id !== requestSynthesisId) {
    return state;
  }

  return {
    activeDetail: responseDetail,
    draft: state.draft,
    isDraftDirty: state.isDraftDirty,
  };
}

export function getInitialReferenceConsumption(
  currentSignature: string | null,
  referenceIds: string[],
) {
  if (referenceIds.length < 2) {
    return { nextSignature: null, shouldConsume: false };
  }

  const signature = referenceIds.join("\u0000");
  return {
    nextSignature: signature,
    shouldConsume: currentSignature !== signature,
  };
}

export function tryAcquireOperationGuard(guard: { current: boolean }) {
  if (guard.current) {
    return false;
  }

  guard.current = true;
  return true;
}

export type DialogKeyboardAction =
  | { kind: "cancel" }
  | { kind: "focus"; index: number }
  | null;

export function getDialogKeyboardAction(
  key: string,
  shiftKey: boolean,
  activeIndex: number,
  focusableCount: number,
): DialogKeyboardAction {
  if (key === "Escape") {
    return { kind: "cancel" };
  }

  if (key !== "Tab") {
    return null;
  }

  if (focusableCount < 1) {
    return { kind: "focus", index: -1 };
  }

  if (shiftKey && activeIndex <= 0) {
    return { kind: "focus", index: focusableCount - 1 };
  }

  if (!shiftKey && activeIndex >= focusableCount - 1) {
    return { kind: "focus", index: 0 };
  }

  return null;
}

export function isEditorSaveBusy(isSaveActive: boolean, archivingId: string | null) {
  void archivingId;
  return isSaveActive;
}

export function canCommitController(
  current: AbortController | null,
  candidate: AbortController,
) {
  return current === candidate && !candidate.signal.aborted;
}
