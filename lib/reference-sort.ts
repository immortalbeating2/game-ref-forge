import { ReferenceRecord } from "./reference";

export const REFERENCE_SORT_MODES = [
  "updated_desc",
  "reference_value_desc",
  "transformability_desc",
  "copyright_risk_asc",
  "production_readiness_desc",
  "title_asc",
] as const;

export type ReferenceSortMode = (typeof REFERENCE_SORT_MODES)[number];

function compareNullableScore(
  left: number | null,
  right: number | null,
  direction: "asc" | "desc",
) {
  if (left === null && right === null) {
    return 0;
  }

  if (left === null) {
    return 1;
  }

  if (right === null) {
    return -1;
  }

  return direction === "asc" ? left - right : right - left;
}

function compareByMode(
  left: ReferenceRecord,
  right: ReferenceRecord,
  mode: ReferenceSortMode,
) {
  switch (mode) {
    case "reference_value_desc":
      return compareNullableScore(left.reference_value_score, right.reference_value_score, "desc");
    case "transformability_desc":
      return compareNullableScore(left.transformability_score, right.transformability_score, "desc");
    case "copyright_risk_asc":
      return compareNullableScore(left.copyright_risk_score, right.copyright_risk_score, "asc");
    case "production_readiness_desc":
      return compareNullableScore(
        left.production_readiness_score,
        right.production_readiness_score,
        "desc",
      );
    case "title_asc":
      return left.title.localeCompare(right.title);
    case "updated_desc":
    default:
      return right.updated_at.localeCompare(left.updated_at);
  }
}

export function sortReferences(
  references: ReferenceRecord[],
  mode: ReferenceSortMode,
  pinnedIds: string[],
) {
  const pinned = new Set(pinnedIds);

  return [...references].sort((left, right) => {
    const leftPinned = pinned.has(left.id);
    const rightPinned = pinned.has(right.id);

    if (leftPinned !== rightPinned) {
      return leftPinned ? -1 : 1;
    }

    const modeResult = compareByMode(left, right, mode);
    return modeResult === 0 ? left.title.localeCompare(right.title) : modeResult;
  });
}
