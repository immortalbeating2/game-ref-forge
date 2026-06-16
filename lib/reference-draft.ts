import {
  DEFAULT_REFERENCE_INPUT,
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
  deconstruction_notes: string;
  transformation_ideas: string;
  avoid_copying_notes: string;
  related_original_asset: string;
  style_tags_text: string;
  use_tags_text: string;
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
  | "attribution_text"
  | "rating"
  | "inspiration_points"
  | "deconstruction_notes"
  | "transformation_ideas"
  | "avoid_copying_notes"
  | "related_original_asset"
> &
  DraftTextFields;

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
    ...DEFAULT_REFERENCE_INPUT,
    ...input,
    canonical_url: textValue(input.canonical_url),
    site_name: textValue(input.site_name),
    author: textValue(input.author),
    preview_url: textValue(input.preview_url),
    source_category: textValue(input.source_category),
    attribution_text: textValue(input.attribution_text),
    rating: input.rating ? String(input.rating) : "",
    deconstruction_notes: textValue(input.deconstruction_notes),
    transformation_ideas: textValue(input.transformation_ideas),
    avoid_copying_notes: textValue(input.avoid_copying_notes),
    related_original_asset: textValue(input.related_original_asset),
    style_tags_text: listText(input.style_tags),
    use_tags_text: listText(input.use_tags),
    inspiration_points_text: listText(input.inspiration_points),
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
    license_status: draft.license_status,
    attribution_text: nullableText(draft.attribution_text),
    public_status: draft.public_status,
    rating: rating.length > 0 ? Number(rating) : null,
    inspiration_points: splitDraftList(draft.inspiration_points_text),
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
  const input = draftToReferenceInput(draft);
  const styleTags = input.style_tags ?? [];
  const useTags = input.use_tags ?? [];
  const inspirationPoints = input.inspiration_points ?? [];

  return (
    input.title !== record.title ||
    input.source_url !== record.source_url ||
    input.canonical_url !== record.canonical_url ||
    input.site_name !== record.site_name ||
    input.author !== record.author ||
    input.preview_url !== record.preview_url ||
    input.media_type !== record.media_type ||
    input.asset_category !== record.asset_category ||
    input.source_category !== record.source_category ||
    input.license_status !== record.license_status ||
    input.attribution_text !== record.attribution_text ||
    input.public_status !== record.public_status ||
    input.rating !== record.rating ||
    input.deconstruction_notes !== record.deconstruction_notes ||
    input.transformation_ideas !== record.transformation_ideas ||
    input.avoid_copying_notes !== record.avoid_copying_notes ||
    input.related_original_asset !== record.related_original_asset ||
    styleTags.join("\n") !== record.style_tags.join("\n") ||
    useTags.join("\n") !== record.use_tags.join("\n") ||
    inspirationPoints.join("\n") !== record.inspiration_points.join("\n")
  );
}
