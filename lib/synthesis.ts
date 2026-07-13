import type { ReferenceRecord } from "./reference";

export const SYNTHESIS_STATUSES = ["draft", "actionable", "archived"] as const;
export type SynthesisStatus = (typeof SYNTHESIS_STATUSES)[number];

export type SynthesisInput = {
  title: string;
  target_asset?: string | null;
  shared_principles?: string | null;
  key_differences?: string | null;
  original_direction?: string | null;
  avoid_copying_notes?: string | null;
  design_constraints?: string | null;
  experiment_plan?: string | null;
  next_actions?: string | null;
  additional_notes?: string | null;
  status: SynthesisStatus;
};

export type CreateSynthesisInput = SynthesisInput & { reference_ids: string[] };

export type SynthesisRecord = Required<
  Omit<
    SynthesisInput,
    | "target_asset"
    | "shared_principles"
    | "key_differences"
    | "original_direction"
    | "avoid_copying_notes"
    | "design_constraints"
    | "experiment_plan"
    | "next_actions"
    | "additional_notes"
  >
> & {
  id: string;
  target_asset: string | null;
  shared_principles: string | null;
  key_differences: string | null;
  original_direction: string | null;
  avoid_copying_notes: string | null;
  design_constraints: string | null;
  experiment_plan: string | null;
  next_actions: string | null;
  additional_notes: string | null;
  created_at: string;
  updated_at: string;
};

export type SynthesisReferenceSnapshot = {
  schema_version: 1;
  reference_id: string;
  reference_updated_at: string;
  title: string;
  source_url: string;
  canonical_url: string | null;
  site_name: string | null;
  author: string | null;
  media_type: ReferenceRecord["media_type"];
  asset_category: ReferenceRecord["asset_category"];
  license_status: ReferenceRecord["license_status"];
  public_status: ReferenceRecord["public_status"];
  quality_status: ReferenceRecord["quality_status"];
  scores: Pick<
    ReferenceRecord,
    | "rating"
    | "reference_value_score"
    | "transformability_score"
    | "copyright_risk_score"
    | "production_readiness_score"
  >;
  tags: Pick<
    ReferenceRecord,
    | "style_tags"
    | "use_tags"
    | "mechanic_tags"
    | "mood_tags"
    | "visual_language_tags"
  >;
  inspiration: Pick<
    ReferenceRecord,
    | "inspiration_points"
    | "inspiration_entries"
    | "deconstruction_notes"
    | "transformation_ideas"
    | "avoid_copying_notes"
  >;
};

export type SynthesisReferenceLink = {
  id: string;
  synthesis_id: string;
  reference_id: string | null;
  position: number;
  snapshot: SynthesisReferenceSnapshot;
  snapshot_updated_at: string;
  available: boolean;
  stale: boolean;
};

export type SynthesisDetail = SynthesisRecord & { references: SynthesisReferenceLink[] };
export type SynthesisSummary = Pick<
  SynthesisRecord,
  "id" | "title" | "target_asset" | "status" | "updated_at"
> & { reference_count: number };

type ValidationResult = { ok: true; errors: [] } | { ok: false; errors: string[] };

const TEXT_FIELDS = [
  "shared_principles",
  "key_differences",
  "original_direction",
  "avoid_copying_notes",
  "design_constraints",
  "experiment_plan",
  "next_actions",
  "additional_notes",
] as const;

function cleanString(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

function isStatus(value: unknown): value is SynthesisStatus {
  return typeof value === "string" && SYNTHESIS_STATUSES.includes(value as SynthesisStatus);
}

export function validateSynthesisInput(input: SynthesisInput): ValidationResult {
  const errors: string[] = [];
  const title = typeof input?.title === "string" ? input.title.trim() : "";

  if (title.length < 1 || title.length > 160) {
    errors.push("title must be between 1 and 160 characters");
  }

  if (input?.target_asset != null && (typeof input.target_asset !== "string" || input.target_asset.trim().length > 240)) {
    errors.push("target_asset must be at most 240 characters");
  }

  for (const field of TEXT_FIELDS) {
    const value = input?.[field];
    if (value != null && (typeof value !== "string" || value.trim().length > 8000)) {
      errors.push(`${field} must be at most 8000 characters`);
    }
  }

  if (!isStatus(input?.status)) {
    errors.push("status is invalid");
  }

  return errors.length > 0 ? { ok: false, errors } : { ok: true, errors: [] };
}

export function validateCreateSynthesisInput(input: CreateSynthesisInput): ValidationResult {
  const result = validateSynthesisInput(input);
  const errors = result.ok ? [] : [...result.errors];
  const ids = input?.reference_ids;

  if (!Array.isArray(ids)) {
    errors.push("reference_ids must be an array");
  } else {
    if (ids.length < 2) errors.push("reference_ids must contain at least 2 references");
    if (ids.length > 4) errors.push("reference_ids must contain at most 4 references");
    if (ids.some((id) => typeof id !== "string" || id.trim().length === 0)) {
      errors.push("reference_ids must not contain blanks");
    }
    const normalizedIds = ids.map((id) => (typeof id === "string" ? id.trim() : id));
    if (new Set(normalizedIds).size !== ids.length) errors.push("reference_ids must be unique");
  }

  return errors.length > 0 ? { ok: false, errors } : { ok: true, errors: [] };
}

export function createSynthesisRecord(input: SynthesisInput): SynthesisRecord {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    title: input.title.trim(),
    target_asset: cleanString(input.target_asset),
    shared_principles: cleanString(input.shared_principles),
    key_differences: cleanString(input.key_differences),
    original_direction: cleanString(input.original_direction),
    avoid_copying_notes: cleanString(input.avoid_copying_notes),
    design_constraints: cleanString(input.design_constraints),
    experiment_plan: cleanString(input.experiment_plan),
    next_actions: cleanString(input.next_actions),
    additional_notes: cleanString(input.additional_notes),
    status: input.status,
    created_at: now,
    updated_at: now,
  };
}

export function createReferenceSnapshot(reference: ReferenceRecord): SynthesisReferenceSnapshot {
  return {
    schema_version: 1,
    reference_id: reference.id,
    reference_updated_at: reference.updated_at,
    title: reference.title,
    source_url: reference.source_url,
    canonical_url: reference.canonical_url,
    site_name: reference.site_name,
    author: reference.author,
    media_type: reference.media_type,
    asset_category: reference.asset_category,
    license_status: reference.license_status,
    public_status: reference.public_status,
    quality_status: reference.quality_status,
    scores: {
      rating: reference.rating,
      reference_value_score: reference.reference_value_score,
      transformability_score: reference.transformability_score,
      copyright_risk_score: reference.copyright_risk_score,
      production_readiness_score: reference.production_readiness_score,
    },
    tags: {
      style_tags: [...reference.style_tags],
      use_tags: [...reference.use_tags],
      mechanic_tags: [...reference.mechanic_tags],
      mood_tags: [...reference.mood_tags],
      visual_language_tags: [...reference.visual_language_tags],
    },
    inspiration: {
      inspiration_points: [...reference.inspiration_points],
      inspiration_entries: reference.inspiration_entries.map((entry) => ({ ...entry })),
      deconstruction_notes: reference.deconstruction_notes,
      transformation_ideas: reference.transformation_ideas,
      avoid_copying_notes: reference.avoid_copying_notes,
    },
  };
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isScore(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isFinite(value));
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSnapshot(value: unknown): value is SynthesisReferenceSnapshot {
  if (!isObject(value) || value.schema_version !== 1) return false;
  const scalarFields = [
    "reference_id",
    "reference_updated_at",
    "title",
    "source_url",
    "media_type",
    "asset_category",
    "license_status",
    "public_status",
    "quality_status",
  ];
  if (scalarFields.some((field) => typeof value[field] !== "string")) return false;
  if (!["canonical_url", "site_name", "author"].every((field) => isNullableString(value[field]))) return false;

  const scores = value.scores;
  if (!isObject(scores)) return false;
  if (!["rating", "reference_value_score", "transformability_score", "copyright_risk_score", "production_readiness_score"].every((field) => isScore(scores[field]))) return false;

  const tags = value.tags;
  if (!isObject(tags)) return false;
  if (!["style_tags", "use_tags", "mechanic_tags", "mood_tags", "visual_language_tags"].every((field) => isStringArray(tags[field]))) return false;

  const inspiration = value.inspiration;
  if (!isObject(inspiration)) return false;
  if (!isStringArray(inspiration.inspiration_points) || !Array.isArray(inspiration.inspiration_entries)) return false;
  if (!["deconstruction_notes", "transformation_ideas", "avoid_copying_notes"].every((field) => isNullableString(inspiration[field]))) return false;
  return inspiration.inspiration_entries.every((entry) => isObject(entry) &&
    typeof entry.observation === "string" &&
    typeof entry.principle === "string" &&
    typeof entry.transferable_idea === "string" &&
    typeof entry.original_application === "string" &&
    typeof entry.avoid_copying === "string" &&
    (entry.id === undefined || typeof entry.id === "string"));
}

export function parseReferenceSnapshot(value: string): SynthesisReferenceSnapshot | null {
  try {
    const parsed: unknown = JSON.parse(value);
    return isSnapshot(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function deriveSnapshotState(
  snapshot: SynthesisReferenceSnapshot,
  currentUpdatedAt: string | null,
  available: boolean,
) {
  if (!available) return { available: false, stale: false };
  const snapshotTime = Date.parse(snapshot.reference_updated_at);
  const currentTime = currentUpdatedAt === null ? Number.NaN : Date.parse(currentUpdatedAt);
  return {
    available: true,
    stale: Number.isFinite(snapshotTime) && Number.isFinite(currentTime) && currentTime > snapshotTime,
  };
}
