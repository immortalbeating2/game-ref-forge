import {
  DEFAULT_REFERENCE_INPUT,
  InspirationEntry,
  ReferenceInput,
  ReferenceRecord,
} from "./reference";

type DraftTextFields = {
  canonical_url: string;
  site_name: string;
  author: string;
  preview_url: string;
  source_category: string;
  attribution_text: string;
  rating: string;
  reference_value_score: string;
  transformability_score: string;
  copyright_risk_score: string;
  production_readiness_score: string;
  deconstruction_notes: string;
  transformation_ideas: string;
  avoid_copying_notes: string;
  related_original_asset: string;
  style_tags_text: string;
  use_tags_text: string;
  mechanic_tags_text: string;
  mood_tags_text: string;
  visual_language_tags_text: string;
  inspiration_points_text: string;
};

export type ReferenceDraft = Omit<
  ReferenceInput,
  | "canonical_url"
  | "site_name"
  | "author"
  | "preview_url"
  | "source_category"
  | "style_tags"
  | "use_tags"
  | "mechanic_tags"
  | "mood_tags"
  | "visual_language_tags"
  | "attribution_text"
  | "rating"
  | "reference_value_score"
  | "transformability_score"
  | "copyright_risk_score"
  | "production_readiness_score"
  | "inspiration_points"
  | "deconstruction_notes"
  | "transformation_ideas"
    | "avoid_copying_notes"
    | "related_original_asset"
> &
  DraftTextFields & {
    inspiration_entries: InspirationEntry[];
  };

function textValue(value: string | null | undefined) {
  return value ?? "";
}

function listText(value: string[] | undefined) {
  return (value ?? []).join(", ");
}

function nullableText(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function cleanDraftInspirationEntries(entries: InspirationEntry[]) {
  return entries
    .map((entry) => ({
      id: entry.id?.trim() ?? "",
      observation: entry.observation.trim(),
      principle: entry.principle.trim(),
      transferable_idea: entry.transferable_idea.trim(),
      original_application: entry.original_application.trim(),
      avoid_copying: entry.avoid_copying.trim(),
    }))
    .filter((entry) =>
      [
        entry.observation,
        entry.principle,
        entry.transferable_idea,
        entry.original_application,
        entry.avoid_copying,
      ].some((item) => item.length > 0),
    );
}

const referenceDraftFields = [
  "title",
  "source_url",
  "canonical_url",
  "site_name",
  "author",
  "preview_url",
  "media_type",
  "asset_category",
  "source_category",
  "license_status",
  "attribution_text",
  "public_status",
  "quality_status",
  "rating",
  "reference_value_score",
  "transformability_score",
  "copyright_risk_score",
  "production_readiness_score",
  "deconstruction_notes",
  "transformation_ideas",
  "avoid_copying_notes",
  "related_original_asset",
  "style_tags_text",
  "use_tags_text",
  "mechanic_tags_text",
  "mood_tags_text",
  "visual_language_tags_text",
  "inspiration_points_text",
  "inspiration_entries",
] as const satisfies readonly (keyof ReferenceDraft)[];

export function splitDraftList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

export function inputToReferenceDraft(
  input: Partial<ReferenceInput> = DEFAULT_REFERENCE_INPUT,
): ReferenceDraft {
  return {
    title: input.title ?? DEFAULT_REFERENCE_INPUT.title,
    source_url: input.source_url ?? DEFAULT_REFERENCE_INPUT.source_url,
    canonical_url: textValue(input.canonical_url),
    site_name: textValue(input.site_name),
    author: textValue(input.author),
    preview_url: textValue(input.preview_url),
    media_type: input.media_type ?? DEFAULT_REFERENCE_INPUT.media_type,
    asset_category: input.asset_category ?? DEFAULT_REFERENCE_INPUT.asset_category,
    source_category: textValue(input.source_category),
    license_status:
      input.license_status ?? DEFAULT_REFERENCE_INPUT.license_status,
    attribution_text: textValue(input.attribution_text),
    public_status: input.public_status ?? DEFAULT_REFERENCE_INPUT.public_status,
    quality_status: input.quality_status ?? DEFAULT_REFERENCE_INPUT.quality_status,
    rating: input.rating ? String(input.rating) : "",
    reference_value_score: input.reference_value_score ? String(input.reference_value_score) : "",
    transformability_score: input.transformability_score ? String(input.transformability_score) : "",
    copyright_risk_score: input.copyright_risk_score ? String(input.copyright_risk_score) : "",
    production_readiness_score: input.production_readiness_score ? String(input.production_readiness_score) : "",
    deconstruction_notes: textValue(input.deconstruction_notes),
    transformation_ideas: textValue(input.transformation_ideas),
    avoid_copying_notes: textValue(input.avoid_copying_notes),
    related_original_asset: textValue(input.related_original_asset),
    style_tags_text: listText(input.style_tags),
    use_tags_text: listText(input.use_tags),
    mechanic_tags_text: listText(input.mechanic_tags),
    mood_tags_text: listText(input.mood_tags),
    visual_language_tags_text: listText(input.visual_language_tags),
    inspiration_points_text: listText(input.inspiration_points),
    inspiration_entries: input.inspiration_entries ?? [],
  };
}

export function createEmptyReferenceDraft() {
  return inputToReferenceDraft(DEFAULT_REFERENCE_INPUT);
}

export function recordToReferenceDraft(record: ReferenceRecord) {
  return inputToReferenceDraft(record);
}

export function draftToReferenceInput(draft: ReferenceDraft): ReferenceInput {
  const rating = draft.rating.trim();
  const referenceValueScore = draft.reference_value_score.trim();
  const transformabilityScore = draft.transformability_score.trim();
  const copyrightRiskScore = draft.copyright_risk_score.trim();
  const productionReadinessScore = draft.production_readiness_score.trim();

  return {
    title: draft.title,
    source_url: draft.source_url,
    canonical_url: nullableText(draft.canonical_url),
    site_name: nullableText(draft.site_name),
    author: nullableText(draft.author),
    preview_url: nullableText(draft.preview_url),
    media_type: draft.media_type,
    asset_category: draft.asset_category,
    source_category: nullableText(draft.source_category),
    style_tags: splitDraftList(draft.style_tags_text),
    use_tags: splitDraftList(draft.use_tags_text),
    mechanic_tags: splitDraftList(draft.mechanic_tags_text),
    mood_tags: splitDraftList(draft.mood_tags_text),
    visual_language_tags: splitDraftList(draft.visual_language_tags_text),
    license_status: draft.license_status,
    attribution_text: nullableText(draft.attribution_text),
    public_status: draft.public_status,
    quality_status: draft.quality_status,
    rating: rating.length > 0 ? Number(rating) : null,
    reference_value_score:
      referenceValueScore.length > 0 ? Number(referenceValueScore) : null,
    transformability_score:
      transformabilityScore.length > 0 ? Number(transformabilityScore) : null,
    copyright_risk_score:
      copyrightRiskScore.length > 0 ? Number(copyrightRiskScore) : null,
    production_readiness_score:
      productionReadinessScore.length > 0 ? Number(productionReadinessScore) : null,
    inspiration_points: splitDraftList(draft.inspiration_points_text),
    inspiration_entries: cleanDraftInspirationEntries(draft.inspiration_entries),
    deconstruction_notes: nullableText(draft.deconstruction_notes),
    transformation_ideas: nullableText(draft.transformation_ideas),
    avoid_copying_notes: nullableText(draft.avoid_copying_notes),
    related_original_asset: nullableText(draft.related_original_asset),
  };
}

export function isReferenceDraftDirty(
  draft: ReferenceDraft,
  record: ReferenceRecord,
) {
  const originalDraft = recordToReferenceDraft(record);

  return referenceDraftFields.some(
    (field) => JSON.stringify(draft[field]) !== JSON.stringify(originalDraft[field]),
  );
}
