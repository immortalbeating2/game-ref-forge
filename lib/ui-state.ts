import type { ReferenceRecord } from "./reference";

export function buildReferenceSearchText(reference: ReferenceRecord) {
  return [
    reference.title,
    reference.site_name,
    reference.author,
    reference.asset_category,
    reference.media_type,
    reference.quality_status,
    ...reference.style_tags,
    ...reference.use_tags,
    ...reference.mechanic_tags,
    ...reference.mood_tags,
    ...reference.visual_language_tags,
    ...reference.inspiration_points,
    ...reference.inspiration_entries.flatMap((entry) => [
      entry.observation,
      entry.principle,
      entry.transferable_idea,
      entry.original_application,
      entry.avoid_copying,
    ]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

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
