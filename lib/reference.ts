export const MEDIA_TYPES = [
  "image",
  "video",
  "audio",
  "model",
  "article",
  "asset_pack",
  "screenshot",
  "mixed",
] as const;

export const ASSET_CATEGORIES = [
  "character",
  "environment",
  "prop",
  "ui_hud",
  "vfx",
  "material_texture",
  "animation",
  "audio",
] as const;

export const LICENSE_STATUSES = [
  "private_reference",
  "unknown_license",
  "source_link_only",
  "attribution_required",
  "cc0_or_public_domain",
  "permission_granted",
] as const;

export const PUBLIC_STATUSES = [
  "private",
  "review",
  "public_safe",
  "public_link_only",
] as const;

export type MediaType = (typeof MEDIA_TYPES)[number];
export type AssetCategory = (typeof ASSET_CATEGORIES)[number];
export type LicenseStatus = (typeof LICENSE_STATUSES)[number];
export type PublicStatus = (typeof PUBLIC_STATUSES)[number];

export type ReferenceInput = {
  title: string;
  source_url: string;
  canonical_url?: string | null;
  site_name?: string | null;
  author?: string | null;
  preview_url?: string | null;
  media_type: MediaType;
  asset_category: AssetCategory;
  source_category?: string | null;
  style_tags?: string[];
  use_tags?: string[];
  license_status?: LicenseStatus;
  attribution_text?: string | null;
  public_status?: PublicStatus;
  rating?: number | null;
  inspiration_points?: string[];
  deconstruction_notes?: string | null;
  transformation_ideas?: string | null;
  avoid_copying_notes?: string | null;
  related_original_asset?: string | null;
};

export type ReferenceRecord = Required<
  Omit<
    ReferenceInput,
    | "canonical_url"
    | "site_name"
    | "author"
    | "preview_url"
    | "source_category"
    | "attribution_text"
    | "rating"
    | "deconstruction_notes"
    | "transformation_ideas"
    | "avoid_copying_notes"
    | "related_original_asset"
  >
> & {
  id: string;
  canonical_url: string | null;
  site_name: string | null;
  author: string | null;
  preview_url: string | null;
  source_category: string | null;
  attribution_text: string | null;
  rating: number | null;
  deconstruction_notes: string | null;
  transformation_ideas: string | null;
  avoid_copying_notes: string | null;
  related_original_asset: string | null;
  created_at: string;
  updated_at: string;
};

export const DEFAULT_REFERENCE_INPUT: ReferenceInput = {
  title: "",
  source_url: "",
  media_type: "image",
  asset_category: "prop",
  style_tags: [],
  use_tags: [],
  license_status: "private_reference",
  public_status: "private",
  inspiration_points: [],
};

export type ValidationResult =
  | { ok: true; errors: [] }
  | { ok: false; errors: string[] };

function isAbsoluteUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function includesValue<T extends readonly string[]>(values: T, value: string) {
  return values.includes(value as T[number]);
}

export function validateReferenceInput(input: ReferenceInput): ValidationResult {
  const errors: string[] = [];

  if (!input.title.trim()) {
    errors.push("title is required");
  }

  if (!isAbsoluteUrl(input.source_url)) {
    errors.push("source_url must be an absolute URL");
  }

  if (!includesValue(MEDIA_TYPES, input.media_type)) {
    errors.push("media_type is invalid");
  }

  if (!includesValue(ASSET_CATEGORIES, input.asset_category)) {
    errors.push("asset_category is invalid");
  }

  if (
    input.license_status &&
    !includesValue(LICENSE_STATUSES, input.license_status)
  ) {
    errors.push("license_status is invalid");
  }

  if (input.public_status && !includesValue(PUBLIC_STATUSES, input.public_status)) {
    errors.push("public_status is invalid");
  }

  if (
    input.rating !== undefined &&
    input.rating !== null &&
    (input.rating < 1 || input.rating > 5)
  ) {
    errors.push("rating must be between 1 and 5");
  }

  return errors.length > 0 ? { ok: false, errors } : { ok: true, errors: [] };
}

function cleanString(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

function cleanArray(value: string[] | undefined) {
  return (value ?? [])
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

export function createReferenceRecord(input: ReferenceInput): ReferenceRecord {
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    title: input.title.trim(),
    source_url: input.source_url.trim(),
    canonical_url: cleanString(input.canonical_url),
    site_name: cleanString(input.site_name),
    author: cleanString(input.author),
    preview_url: cleanString(input.preview_url),
    media_type: input.media_type,
    asset_category: input.asset_category,
    source_category: cleanString(input.source_category),
    style_tags: cleanArray(input.style_tags),
    use_tags: cleanArray(input.use_tags),
    license_status: input.license_status ?? "private_reference",
    attribution_text: cleanString(input.attribution_text),
    public_status: input.public_status ?? "private",
    rating: input.rating ?? null,
    inspiration_points: cleanArray(input.inspiration_points),
    deconstruction_notes: cleanString(input.deconstruction_notes),
    transformation_ideas: cleanString(input.transformation_ideas),
    avoid_copying_notes: cleanString(input.avoid_copying_notes),
    related_original_asset: cleanString(input.related_original_asset),
    created_at: now,
    updated_at: now,
  };
}

export function parseJsonArray(value: string | null): string[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

export function serializeJsonArray(value: string[] | undefined) {
  return JSON.stringify(cleanArray(value));
}

