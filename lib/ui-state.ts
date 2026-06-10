import type { ReferenceRecord } from "./reference";

export function getVisibleDetailReference(
  filteredReferences: ReferenceRecord[],
  allReferences: ReferenceRecord[],
  selectedId: string | null,
) {
  if (filteredReferences.length === 0) {
    return null;
  }

  return (
    filteredReferences.find((reference) => reference.id === selectedId) ??
    filteredReferences[0] ??
    allReferences[0] ??
    null
  );
}
