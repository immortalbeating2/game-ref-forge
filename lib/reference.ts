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

export const QUALITY_STATUSES = [
  "captured",
  "needs_analysis",
  "analyzed",
  "ready_for_use",
  "blocked",
] as const;

export type MediaType = (typeof MEDIA_TYPES)[number];
export type AssetCategory = (typeof ASSET_CATEGORIES)[number];
export type LicenseStatus = (typeof LICENSE_STATUSES)[number];
export type PublicStatus = (typeof PUBLIC_STATUSES)[number];
export type QualityStatus = (typeof QUALITY_STATUSES)[number];

export type InspirationEntry = {
  id?: string;
  observation: string;
  principle: string;
  transferable_idea: string;
  original_application: string;
  avoid_copying: string;
};

export type NormalizedInspirationEntry = Required<InspirationEntry>;

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
  mechanic_tags?: string[];
  mood_tags?: string[];
  visual_language_tags?: string[];
  license_status?: LicenseStatus;
  attribution_text?: string | null;
  public_status?: PublicStatus;
  rating?: number | null;
  reference_value_score?: number | null;
  transformability_score?: number | null;
  copyright_risk_score?: number | null;
  production_readiness_score?: number | null;
  inspiration_points?: string[];
  inspiration_entries?: InspirationEntry[];
  deconstruction_notes?: string | null;
  transformation_ideas?: string | null;
  avoid_copying_notes?: string | null;
  related_original_asset?: string | null;
  quality_status?: QualityStatus;
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
    | "reference_value_score"
    | "transformability_score"
    | "copyright_risk_score"
    | "production_readiness_score"
    | "deconstruction_notes"
    | "transformation_ideas"
    | "avoid_copying_notes"
    | "related_original_asset"
    | "inspiration_entries"
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
  reference_value_score: number | null;
  transformability_score: number | null;
  copyright_risk_score: number | null;
  production_readiness_score: number | null;
  inspiration_entries: NormalizedInspirationEntry[];
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
  mechanic_tags: [],
  mood_tags: [],
  visual_language_tags: [],
  license_status: "private_reference",
  public_status: "private",
  quality_status: "captured",
  inspiration_points: [],
  inspiration_entries: [],
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

  if (input.quality_status && !includesValue(QUALITY_STATUSES, input.quality_status)) {
    errors.push("quality_status is invalid");
  }

  if (
    input.rating !== undefined &&
    input.rating !== null &&
    (input.rating < 1 || input.rating > 5)
  ) {
    errors.push("rating must be between 1 and 5");
  }

  validateScore(input.reference_value_score, "reference_value_score", errors);
  validateScore(input.transformability_score, "transformability_score", errors);
  validateScore(input.copyright_risk_score, "copyright_risk_score", errors);
  validateScore(input.production_readiness_score, "production_readiness_score", errors);

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

function validateScore(value: number | null | undefined, field: string, errors: string[]) {
  if (value === undefined || value === null) {
    return;
  }

  if (!Number.isInteger(value)) {
    errors.push(`${field} must be an integer between 1 and 5`);
    return;
  }

  if (value < 1 || value > 5) {
    errors.push(`${field} must be between 1 and 5`);
  }
}

function cleanScore(value: number | null | undefined) {
  return value ?? null;
}

function cleanInspirationEntries(
  value: InspirationEntry[] | undefined,
): NormalizedInspirationEntry[] {
  return (value ?? [])
    .map((entry) => ({
      id: cleanString(entry.id) ?? crypto.randomUUID(),
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
    mechanic_tags: cleanArray(input.mechanic_tags),
    mood_tags: cleanArray(input.mood_tags),
    visual_language_tags: cleanArray(input.visual_language_tags),
    license_status: input.license_status ?? "private_reference",
    attribution_text: cleanString(input.attribution_text),
    public_status: input.public_status ?? "private",
    quality_status: input.quality_status ?? "captured",
    rating: input.rating ?? null,
    reference_value_score: cleanScore(input.reference_value_score),
    transformability_score: cleanScore(input.transformability_score),
    copyright_risk_score: cleanScore(input.copyright_risk_score),
    production_readiness_score: cleanScore(input.production_readiness_score),
    inspiration_points: cleanArray(input.inspiration_points),
    inspiration_entries: cleanInspirationEntries(input.inspiration_entries),
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

export function parseInspirationEntries(value: string | null): NormalizedInspirationEntry[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return cleanInspirationEntries(
      parsed.filter((item): item is InspirationEntry => {
        return (
          item &&
          typeof item === "object" &&
          typeof item.observation === "string" &&
          typeof item.principle === "string" &&
          typeof item.transferable_idea === "string" &&
          typeof item.original_application === "string" &&
          typeof item.avoid_copying === "string"
        );
      }),
    );
  } catch {
    return [];
  }
}

export function serializeInspirationEntries(value: InspirationEntry[] | undefined) {
  return JSON.stringify(cleanInspirationEntries(value));
}

