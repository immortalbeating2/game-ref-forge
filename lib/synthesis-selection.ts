const MAX_SYNTHESIS_REFERENCES = 4;

export type ReferenceDataSource = "loading" | "persisted" | "seed";

export type ComparisonSelectionState = {
  isActive: boolean;
  referenceIds: string[];
};

export function getComparisonStartDecision(options: {
  canStartComparison: boolean;
  isSavingReference: boolean;
  hasDirtyReferenceEdit: boolean;
}): "blocked" | "confirm-discard" | "start" {
  if (!options.canStartComparison || options.isSavingReference) return "blocked";
  return options.hasDirtyReferenceEdit ? "confirm-discard" : "start";
}

export function getComparisonAvailability(
  source: ReferenceDataSource,
  referenceIds: string[],
) {
  const hasPersistedReferences = source === "persisted";

  return {
    canStartComparison: hasPersistedReferences,
    canHandoff:
      hasPersistedReferences && canEnterSynthesisComparison(referenceIds),
  };
}

export function reconcileComparisonSelectionSource(
  state: ComparisonSelectionState,
  source: ReferenceDataSource,
): ComparisonSelectionState {
  if (source === "persisted") {
    return state;
  }

  if (!state.isActive && state.referenceIds.length === 0) {
    return state;
  }

  return { isActive: false, referenceIds: [] };
}

export function toggleSynthesisSelection(
  selectedIds: string[],
  referenceId: string,
) {
  if (selectedIds.includes(referenceId)) {
    return selectedIds.filter((id) => id !== referenceId);
  }

  if (selectedIds.length >= MAX_SYNTHESIS_REFERENCES) {
    return [...selectedIds];
  }

  return [...selectedIds, referenceId];
}

export function canEnterSynthesisComparison(selectedIds: string[]) {
  return (
    selectedIds.length >= 2 &&
    selectedIds.length <= MAX_SYNTHESIS_REFERENCES &&
    new Set(selectedIds).size === selectedIds.length
  );
}
