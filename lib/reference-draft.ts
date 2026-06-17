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
  "rating",
  "deconstruction_notes",
  "transformation_ideas",
  "avoid_copying_notes",
  "related_original_asset",
  "style_tags_text",
  "use_tags_text",
  "inspiration_points_text",
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
  const originalDraft = recordToReferenceDraft(record);

  return referenceDraftFields.some(
    (field) => draft[field] !== originalDraft[field],
  );
}
