import {
  ASSET_CATEGORIES,
  LICENSE_STATUSES,
  MEDIA_TYPES,
  PUBLIC_STATUSES,
  QUALITY_STATUSES,
  type ReferenceRecord,
  validateReferenceInput,
} from "./reference";
import {
  parseReferenceSnapshot,
  SYNTHESIS_STATUSES,
  type SynthesisRecord,
  type SynthesisReferenceSnapshot,
  validateSynthesisInput,
} from "./synthesis";
import { parsePinnedReferenceIds, serializePinnedReferenceIds } from "./pinned-references";
import {
  parseWorkspaceLayoutPreferences,
  serializeWorkspaceLayoutPreferences,
  type WorkspaceLayoutPreferences,
} from "./workspace-layout";

export const BACKUP_FORMAT = "ref-forge-backup" as const;
export const BACKUP_SCHEMA_VERSION = 1 as const;
export const MAX_BACKUP_BYTES = 5_000_000;
export const MAX_BACKUP_REFERENCES = 2_000;
export const MAX_BACKUP_SYNTHESES = 1_000;
export const MAX_BACKUP_RELATIONS = 4_000;

export type BackupDevicePreferences = {
  pinned_reference_ids: string[];
  workspace_layout: WorkspaceLayoutPreferences;
};

export type BackupSynthesisRelation = {
  id: string;
  synthesis_id: string;
  reference_id: string | null;
  position: number;
  snapshot: SynthesisReferenceSnapshot;
  snapshot_updated_at: string;
};

export type RefForgeBackupV1 = {
  format: typeof BACKUP_FORMAT;
  schema_version: typeof BACKUP_SCHEMA_VERSION;
  exported_at: string;
  app: { name: "RefForge" };
  data: {
    references: ReferenceRecord[];
    syntheses: SynthesisRecord[];
    synthesis_references: BackupSynthesisRelation[];
  };
  preferences: BackupDevicePreferences | null;
};

export type BackupValidationIssue = {
  code:
    | "unsupported_format"
    | "unsupported_version"
    | "backup_too_large"
    | "validation_failed";
  path: string;
  message: string;
};

export type BackupParseResult =
  | { ok: true; backup: RefForgeBackupV1 }
  | { ok: false; issues: BackupValidationIssue[] };

const TOP_LEVEL_KEYS = ["format", "schema_version", "exported_at", "app", "data", "preferences"] as const;
const APP_KEYS = ["name"] as const;
const DATA_KEYS = ["references", "syntheses", "synthesis_references"] as const;
const PREFERENCE_KEYS = ["pinned_reference_ids", "workspace_layout"] as const;
const WORKSPACE_LAYOUT_KEYS = ["version", "leftWidth", "rightWidth", "leftCollapsed", "rightCollapsed"] as const;
const RELATION_KEYS = ["id", "synthesis_id", "reference_id", "position", "snapshot", "snapshot_updated_at"] as const;
const REFERENCE_KEYS = [
  "id", "title", "source_url", "canonical_url", "site_name", "author", "preview_url", "media_type",
  "asset_category", "source_category", "style_tags", "use_tags", "mechanic_tags", "mood_tags",
  "visual_language_tags", "license_status", "attribution_text", "public_status", "quality_status", "rating",
  "reference_value_score", "transformability_score", "copyright_risk_score", "production_readiness_score",
  "inspiration_points", "inspiration_entries", "deconstruction_notes", "transformation_ideas",
  "avoid_copying_notes", "related_original_asset", "created_at", "updated_at",
] as const;
const SYNTHESIS_KEYS = [
  "id", "title", "target_asset", "shared_principles", "key_differences", "original_direction",
  "avoid_copying_notes", "design_constraints", "experiment_plan", "next_actions", "additional_notes",
  "status", "created_at", "updated_at",
] as const;
const INSPIRATION_ENTRY_KEYS = [
  "id", "observation", "principle", "transferable_idea", "original_application", "avoid_copying",
] as const;
const MAX_ID_LENGTH = 200;
const MAX_BACKUP_JSON_DEPTH = 64;
const SCORE_FIELDS = [
  "rating",
  "reference_value_score",
  "transformability_score",
  "copyright_risk_score",
  "production_readiness_score",
] as const;

type PlainObject = Record<string, unknown>;

function isPlainObject(value: unknown): value is PlainObject {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasExactKeys(value: PlainObject, keys: readonly string[]) {
  const actualKeys = Object.keys(value);
  return actualKeys.length === keys.length &&
    actualKeys.every((key) => keys.includes(key)) &&
    keys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
}

function* enumerableOwnKeys(value: PlainObject): Generator<string> {
  for (const key in value) {
    if (Object.prototype.hasOwnProperty.call(value, key)) yield key;
  }
}

type PlainJsonFrame =
  | { kind: "value"; value: unknown; depth: number }
  | { kind: "array"; value: unknown[]; depth: number; index: number }
  | { kind: "object"; value: PlainObject; depth: number; keys: Generator<string> };

function isPlainJsonValue(value: unknown): boolean {
  const frames: PlainJsonFrame[] = [{ kind: "value", value, depth: 0 }];

  while (frames.length > 0) {
    const current = frames[frames.length - 1];
    if (current === undefined) return false;

    if (current.kind === "value") {
      if (current.depth > MAX_BACKUP_JSON_DEPTH) return false;
      if (current.value === null || typeof current.value === "string" || typeof current.value === "boolean") {
        frames.pop();
        continue;
      }
      if (typeof current.value === "number") {
        if (!Number.isFinite(current.value)) return false;
        frames.pop();
        continue;
      }
      if (Array.isArray(current.value)) {
        frames[frames.length - 1] = {
          kind: "array",
          value: current.value,
          depth: current.depth,
          index: 0,
        };
        continue;
      }
      if (!isPlainObject(current.value)) return false;
      frames[frames.length - 1] = {
        kind: "object",
        value: current.value,
        depth: current.depth,
        keys: enumerableOwnKeys(current.value),
      };
      continue;
    }

    if (current.kind === "array") {
      if (current.index === current.value.length) {
        frames.pop();
        continue;
      }
      const index = current.index;
      current.index += 1;
      frames.push({ kind: "value", value: current.value[index], depth: current.depth + 1 });
      continue;
    }

    const next = current.keys.next();
    if (next.done) {
      frames.pop();
      continue;
    }
    frames.push({ kind: "value", value: current.value[next.value], depth: current.depth + 1 });
  }

  return true;
}

function isNonEmptyId(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= MAX_ID_LENGTH;
}

function isIsoTimestamp(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,9})?(?:Z|[+-](\d{2}):(\d{2}))$/.exec(value);
  if (match === null) return false;
  const [, rawYear, rawMonth, rawDay, rawHour, rawMinute, rawSecond, rawOffsetHour, rawOffsetMinute] = match;
  const year = Number(rawYear);
  const month = Number(rawMonth);
  const day = Number(rawDay);
  const hour = Number(rawHour);
  const minute = Number(rawMinute);
  const second = Number(rawSecond);
  const daysInMonth = month === 2
    ? (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28)
    : [4, 6, 9, 11].includes(month) ? 30 : 31;

  return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth &&
    hour <= 23 && minute <= 59 && second <= 59 &&
    (rawOffsetHour === undefined || (Number(rawOffsetHour) <= 23 && Number(rawOffsetMinute) <= 59));
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isIntegerScore(value: unknown): value is number | null {
  return value === null || (
    typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 5
  );
}

function isEnumValue<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === "string" && allowed.includes(value as T);
}

function isInspirationEntries(value: unknown) {
  return Array.isArray(value) && value.every((entry) =>
    isPlainObject(entry) &&
    hasExactKeys(entry, INSPIRATION_ENTRY_KEYS) &&
    isNonEmptyId(entry.id) &&
    INSPIRATION_ENTRY_KEYS.slice(1).every((key) => typeof entry[key] === "string"),
  );
}

function issue(path: string, message: string, code: BackupValidationIssue["code"] = "validation_failed"): BackupValidationIssue {
  return { code, path, message };
}

function validateRecordShape(
  value: unknown,
  keys: readonly string[],
  path: string,
  issues: BackupValidationIssue[],
): value is PlainObject {
  if (!isPlainObject(value) || !hasExactKeys(value, keys)) {
    issues.push(issue(path, "must be a closed record object"));
    return false;
  }
  return true;
}

function validateReference(value: unknown, path: string, issues: BackupValidationIssue[]): value is ReferenceRecord {
  if (!validateRecordShape(value, REFERENCE_KEYS, path, issues)) return false;
  const record: PlainObject = value;
  const nullableFields = [
    "canonical_url", "site_name", "author", "preview_url", "source_category", "attribution_text", "deconstruction_notes",
    "transformation_ideas", "avoid_copying_notes", "related_original_asset",
  ];
  const arrayFields = ["style_tags", "use_tags", "mechanic_tags", "mood_tags", "visual_language_tags", "inspiration_points"];
  const hasValidTypes = isNonEmptyId(record.id) &&
    ["title", "source_url"].every((field) => typeof record[field] === "string") &&
    isEnumValue(record.media_type, MEDIA_TYPES) &&
    isEnumValue(record.asset_category, ASSET_CATEGORIES) &&
    isEnumValue(record.license_status, LICENSE_STATUSES) &&
    isEnumValue(record.public_status, PUBLIC_STATUSES) &&
    isEnumValue(record.quality_status, QUALITY_STATUSES) &&
    nullableFields.every((field) => isNullableString(record[field])) &&
    arrayFields.every((field) => isStringArray(record[field])) &&
    isInspirationEntries(record.inspiration_entries) &&
    SCORE_FIELDS.every((field) => isIntegerScore(record[field]));
  if (!hasValidTypes) {
    issues.push(issue(path, "contains invalid record fields"));
    return false;
  }
  if (!isIsoTimestamp(record.created_at)) issues.push(issue(`${path}.created_at`, "must be a valid ISO-8601 timestamp"));
  if (!isIsoTimestamp(record.updated_at)) issues.push(issue(`${path}.updated_at`, "must be a valid ISO-8601 timestamp"));
  const validation = validateReferenceInput(record as ReferenceRecord);
  if (!validation.ok) {
    issues.push(issue(path, validation.errors.join("; ")));
    return false;
  }
  return true;
}

function validateSynthesis(value: unknown, path: string, issues: BackupValidationIssue[]): value is SynthesisRecord {
  if (!validateRecordShape(value, SYNTHESIS_KEYS, path, issues)) return false;
  const record: PlainObject = value;
  const textFields = [
    "title", "target_asset", "shared_principles", "key_differences", "original_direction", "avoid_copying_notes",
    "design_constraints", "experiment_plan", "next_actions", "additional_notes",
  ];
  const hasValidTypes = isNonEmptyId(record.id) &&
    typeof record.title === "string" &&
    textFields.slice(1).every((field) => isNullableString(record[field])) &&
    typeof record.status === "string" && SYNTHESIS_STATUSES.includes(record.status as SynthesisRecord["status"]);
  if (!hasValidTypes) {
    issues.push(issue(path, "contains invalid record fields"));
    return false;
  }
  if (!isIsoTimestamp(record.created_at)) issues.push(issue(`${path}.created_at`, "must be a valid ISO-8601 timestamp"));
  if (!isIsoTimestamp(record.updated_at)) issues.push(issue(`${path}.updated_at`, "must be a valid ISO-8601 timestamp"));
  const validation = validateSynthesisInput(record as SynthesisRecord);
  if (!validation.ok) {
    issues.push(issue(path, validation.errors.join("; ")));
    return false;
  }
  return true;
}

function parsePreferences(value: unknown, issues: BackupValidationIssue[]): BackupDevicePreferences | null | undefined {
  if (value === null) return null;
  if (!isPlainObject(value) || !hasExactKeys(value, PREFERENCE_KEYS)) {
    issues.push(issue("preferences", "must be null or a closed preferences object"));
    return undefined;
  }
  if (!isStringArray(value.pinned_reference_ids) || !isPlainObject(value.workspace_layout) || !hasExactKeys(value.workspace_layout, WORKSPACE_LAYOUT_KEYS)) {
    issues.push(issue("preferences", "contains invalid preference fields"));
    return undefined;
  }
  const layout = value.workspace_layout;
  if (
    layout.version !== 1 ||
    typeof layout.leftWidth !== "number" || !Number.isFinite(layout.leftWidth) ||
    typeof layout.rightWidth !== "number" || !Number.isFinite(layout.rightWidth) ||
    typeof layout.leftCollapsed !== "boolean" || typeof layout.rightCollapsed !== "boolean"
  ) {
    issues.push(issue("preferences.workspace_layout", "contains invalid workspace layout fields"));
    return undefined;
  }
  return {
    pinned_reference_ids: parsePinnedReferenceIds(serializePinnedReferenceIds(value.pinned_reference_ids)),
    workspace_layout: parseWorkspaceLayoutPreferences(JSON.stringify(layout)),
  };
}

export function parseRefForgeBackup(value: unknown): BackupParseResult {
  if (!isPlainObject(value) || value.format !== BACKUP_FORMAT) {
    return { ok: false, issues: [issue("format", "must be ref-forge-backup", "unsupported_format")] };
  }
  if (value.schema_version !== BACKUP_SCHEMA_VERSION) {
    return { ok: false, issues: [issue("schema_version", "must be 1", "unsupported_version")] };
  }
  if (!hasExactKeys(value, TOP_LEVEL_KEYS)) {
    return { ok: false, issues: [issue("", "backup must be a closed JSON object")] };
  }
  if (!isPlainObject(value.data) || !hasExactKeys(value.data, DATA_KEYS)) {
    return { ok: false, issues: [issue("data", "must be a closed data object")] };
  }

  const references = value.data.references;
  const syntheses = value.data.syntheses;
  const relations = value.data.synthesis_references;
  if (!Array.isArray(references)) {
    return { ok: false, issues: [issue("data.references", "must be an array")] };
  }
  if (references.length > MAX_BACKUP_REFERENCES) {
    return { ok: false, issues: [issue("data.references", "exceeds the reference limit", "backup_too_large")] };
  }
  if (!Array.isArray(syntheses)) {
    return { ok: false, issues: [issue("data.syntheses", "must be an array")] };
  }
  if (syntheses.length > MAX_BACKUP_SYNTHESES) {
    return { ok: false, issues: [issue("data.syntheses", "exceeds the synthesis limit", "backup_too_large")] };
  }
  if (!Array.isArray(relations)) {
    return { ok: false, issues: [issue("data.synthesis_references", "must be an array")] };
  }
  if (relations.length > MAX_BACKUP_RELATIONS) {
    return { ok: false, issues: [issue("data.synthesis_references", "exceeds the relation limit", "backup_too_large")] };
  }
  const issues: BackupValidationIssue[] = [];
  const isPlainJson = isPlainJsonValue(value);
  if (!isPlainJson) {
    issues.push(issue("", "backup must be a closed JSON object"));
  }
  if (!isIsoTimestamp(value.exported_at)) issues.push(issue("exported_at", "must be a valid ISO-8601 timestamp"));
  if (!isPlainObject(value.app) || !hasExactKeys(value.app, APP_KEYS) || value.app.name !== "RefForge") {
    issues.push(issue("app", "must identify RefForge"));
  }
  const referenceIds = new Set<string>();
  references.forEach((reference, index) => {
    const path = `data.references[${index}]`;
    if (validateReference(reference, path, issues)) {
      if (referenceIds.has(reference.id)) issues.push(issue(`${path}.id`, "must be unique"));
      referenceIds.add(reference.id);
    }
  });

  const synthesisIds = new Set<string>();
  syntheses.forEach((synthesis, index) => {
    const path = `data.syntheses[${index}]`;
    if (validateSynthesis(synthesis, path, issues)) {
      if (synthesisIds.has(synthesis.id)) issues.push(issue(`${path}.id`, "must be unique"));
      synthesisIds.add(synthesis.id);
    }
  });

  const relationIds = new Set<string>();
  const relationsBySynthesis = new Map<string, Array<{ relation: BackupSynthesisRelation; index: number }>>();
  const availableRelationKeys = new Set<string>();
  relations.forEach((relation, index) => {
    const path = `data.synthesis_references[${index}]`;
    if (!validateRecordShape(relation, RELATION_KEYS, path, issues)) return;
    if (
      !isNonEmptyId(relation.id) ||
      !isNonEmptyId(relation.synthesis_id) ||
      (relation.reference_id !== null && !isNonEmptyId(relation.reference_id)) ||
      typeof relation.position !== "number" || !Number.isInteger(relation.position) || relation.position < 0 ||
      !isPlainObject(relation.snapshot)
    ) {
      issues.push(issue(path, "contains invalid relation fields"));
      return;
    }
    if (!isIsoTimestamp(relation.snapshot_updated_at)) {
      issues.push(issue(`${path}.snapshot_updated_at`, "must be a valid ISO-8601 timestamp"));
      return;
    }
    const snapshot = parseReferenceSnapshot(JSON.stringify(relation.snapshot));
    if (snapshot === null) {
      issues.push(issue(`${path}.snapshot`, "must be a valid reference snapshot"));
      return;
    }
    if (!isNonEmptyId(snapshot.reference_id)) {
      issues.push(issue(`${path}.snapshot.reference_id`, "must be a non-empty backup id"));
      return;
    }
    if (!isIsoTimestamp(snapshot.reference_updated_at)) {
      issues.push(issue(`${path}.snapshot.reference_updated_at`, "must be a valid ISO-8601 timestamp"));
      return;
    }
    if (!SCORE_FIELDS.every((field) => isIntegerScore(snapshot.scores[field]))) {
      issues.push(issue(`${path}.snapshot`, "must contain integer scores from 1 through 5"));
      return;
    }
    if (relationIds.has(relation.id)) issues.push(issue(`${path}.id`, "must be unique"));
    relationIds.add(relation.id);
    if (!synthesisIds.has(relation.synthesis_id)) issues.push(issue(`${path}.synthesis_id`, "must reference a backup synthesis"));
    if (relation.reference_id !== null) {
      if (!referenceIds.has(relation.reference_id)) issues.push(issue(`${path}.reference_id`, "must reference a backup reference"));
      if (snapshot.reference_id !== relation.reference_id) issues.push(issue(`${path}.snapshot.reference_id`, "must match reference_id"));
      const relationKey = `${relation.synthesis_id}\u0000${relation.reference_id}`;
      if (availableRelationKeys.has(relationKey)) issues.push(issue(`${path}.reference_id`, "must be unique within a synthesis"));
      availableRelationKeys.add(relationKey);
    }
    const parsedRelation: BackupSynthesisRelation = {
      id: relation.id,
      synthesis_id: relation.synthesis_id,
      reference_id: relation.reference_id,
      position: relation.position,
      snapshot,
      snapshot_updated_at: relation.snapshot_updated_at,
    };
    relationsBySynthesis.set(relation.synthesis_id, [
      ...(relationsBySynthesis.get(relation.synthesis_id) ?? []),
      { relation: parsedRelation, index },
    ]);
  });

  for (const synthesis of syntheses) {
    if (!isPlainObject(synthesis) || !isNonEmptyId(synthesis.id)) continue;
    const synthesisRelations = relationsBySynthesis.get(synthesis.id) ?? [];
    if (synthesisRelations.length < 2 || synthesisRelations.length > 4) {
      issues.push(issue("data.synthesis_references", "each synthesis must have two to four relations"));
      continue;
    }
    const invalidRelation = [...synthesisRelations]
      .sort((left, right) => left.relation.position - right.relation.position || left.index - right.index)
      .find(({ relation }, position) => relation.position !== position);
    if (invalidRelation !== undefined) {
      issues.push(issue(`data.synthesis_references[${invalidRelation.index}].position`, "must be contiguous from zero"));
    }
  }

  const preferences = parsePreferences(value.preferences, issues);
  if (issues.length > 0 || preferences === undefined) return { ok: false, issues };
  if (isPlainJson && new TextEncoder().encode(canonicalBackupJson(value)).byteLength > MAX_BACKUP_BYTES) {
    return { ok: false, issues: [issue("", "canonical backup JSON exceeds the 5 MB limit", "backup_too_large")] };
  }

  return {
    ok: true,
    backup: {
      format: BACKUP_FORMAT,
      schema_version: BACKUP_SCHEMA_VERSION,
      exported_at: String(value.exported_at),
      app: { name: "RefForge" },
      data: {
        references: references as ReferenceRecord[],
        syntheses: syntheses as SynthesisRecord[],
        synthesis_references: relations as BackupSynthesisRelation[],
      },
      preferences,
    },
  };
}

export function canonicalBackupJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalBackupJson).join(",")}]`;
  if (isPlainObject(value)) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalBackupJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

export async function createBackupDigest(backup: RefForgeBackupV1) {
  const bytes = new TextEncoder().encode(canonicalBackupJson(backup));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function createBackupFilename(exportedAt = new Date().toISOString()) {
  const date = Number.isFinite(Date.parse(exportedAt)) ? new Date(exportedAt) : new Date();
  return `ref-forge-backup-v1-${date.toISOString().slice(0, 10)}.json`;
}

export function withBackupPreferences(
  backup: RefForgeBackupV1,
  preferences: BackupDevicePreferences | null,
): RefForgeBackupV1 {
  if (preferences === null) return { ...backup, preferences: null };
  return {
    ...backup,
    preferences: {
      pinned_reference_ids: parsePinnedReferenceIds(serializePinnedReferenceIds(preferences.pinned_reference_ids)),
      workspace_layout: parseWorkspaceLayoutPreferences(serializeWorkspaceLayoutPreferences(preferences.workspace_layout)),
    },
  };
}
