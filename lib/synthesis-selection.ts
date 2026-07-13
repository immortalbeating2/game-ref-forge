const MAX_SYNTHESIS_REFERENCES = 4;

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
