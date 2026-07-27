import { getDb } from "../db";
import { references, synthesisReferences, syntheses } from "../db/schema";
import {
  canonicalBackupJson,
  createBackupDigest,
  parseRefForgeBackup,
  type BackupSynthesisRelation,
  type RefForgeBackupV1,
} from "./backup";
import { synthesisRowToRecord } from "./synthesis-db";
import {
  parseReferenceSnapshot,
  type SynthesisRecord,
  validateSynthesisInput,
} from "./synthesis";
import type { ReferenceRecord } from "./reference";

export type BackupInventory = {
  references: ReferenceRecord[];
  syntheses: SynthesisRecord[];
  relations: BackupSynthesisRelation[];
};

export type BackupPreview = {
  references: { create: number; overwrite: number; preserve: number };
  syntheses: { create: number; overwrite: number; preserve: number };
  relations: { restore: number; historical: number };
  contains_preferences: boolean;
  backup_digest: string;
  state_digest: string;
};

export class BackupStoredDataError extends Error {
  constructor(message: string) {
    super(`Stored backup data is invalid: ${message}`);
    this.name = "BackupStoredDataError";
  }
}

const INSPIRATION_ENTRY_KEYS = [
  "id",
  "observation",
  "principle",
  "transferable_idea",
  "original_application",
  "avoid_copying",
] as const;
const SYNTHESIS_NULLABLE_TEXT_FIELDS = [
  "target_asset",
  "shared_principles",
  "key_differences",
  "original_direction",
  "avoid_copying_notes",
  "design_constraints",
  "experiment_plan",
  "next_actions",
  "additional_notes",
] as const;
const INVENTORY_VALIDATION_EXPORTED_AT = "1970-01-01T00:00:00.000Z";

function compareStrings(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function parseStoredJson(rowId: string, field: string, value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    throw new BackupStoredDataError(`reference ${rowId} has invalid ${field} JSON`);
  }
}

function parseStoredStringArray(rowId: string, field: string, value: string): string[] {
  const parsed = parseStoredJson(rowId, field, value);
  if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === "string")) {
    throw new BackupStoredDataError(`reference ${rowId} has invalid ${field}; expected a string array`);
  }
  return parsed;
}

function parseStoredInspirationEntries(
  rowId: string,
  value: string,
): ReferenceRecord["inspiration_entries"] {
  const parsed = parseStoredJson(rowId, "inspiration_entries", value);
  if (!Array.isArray(parsed)) {
    throw new BackupStoredDataError(`reference ${rowId} has invalid inspiration_entries; expected an array`);
  }

  return parsed.map((entry, index) => {
    if (!isPlainObject(entry) ||
      Object.keys(entry).length !== INSPIRATION_ENTRY_KEYS.length ||
      !INSPIRATION_ENTRY_KEYS.every((key) => Object.prototype.hasOwnProperty.call(entry, key))) {
      throw new BackupStoredDataError(`reference ${rowId} has invalid inspiration entry ${index}`);
    }
    if (typeof entry.id !== "string" || entry.id.trim().length === 0) {
      throw new BackupStoredDataError(`reference ${rowId} has an inspiration entry ${index} with an invalid id`);
    }
    if (!INSPIRATION_ENTRY_KEYS.slice(1).every((key) => typeof entry[key] === "string")) {
      throw new BackupStoredDataError(`reference ${rowId} has invalid inspiration entry ${index}`);
    }
    return entry as ReferenceRecord["inspiration_entries"][number];
  });
}

function isStoredId(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= 200;
}

function isStoredTimestamp(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{3})?(?:Z|[+-](\d{2}):(\d{2}))$/.exec(value);
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

function assertStoredReferenceIsValid(record: ReferenceRecord) {
  const parsed = parseRefForgeBackup(toBackup({
    references: [record],
    syntheses: [],
    relations: [],
  }, "1970-01-01T00:00:00.000Z"));
  if (!parsed.ok) {
    throw new BackupStoredDataError(parsed.issues.map((issue) => `${issue.path}: ${issue.message}`).join("; "));
  }
}

function strictReferenceRowToRecord(row: typeof references.$inferSelect): ReferenceRecord {
  const record: ReferenceRecord = {
    id: row.id,
    title: row.title,
    source_url: row.sourceUrl,
    canonical_url: row.canonicalUrl,
    site_name: row.siteName,
    author: row.author,
    preview_url: row.previewUrl,
    media_type: row.mediaType as ReferenceRecord["media_type"],
    asset_category: row.assetCategory as ReferenceRecord["asset_category"],
    source_category: row.sourceCategory,
    style_tags: parseStoredStringArray(row.id, "style_tags", row.styleTags),
    use_tags: parseStoredStringArray(row.id, "use_tags", row.useTags),
    mechanic_tags: parseStoredStringArray(row.id, "mechanic_tags", row.mechanicTags),
    mood_tags: parseStoredStringArray(row.id, "mood_tags", row.moodTags),
    visual_language_tags: parseStoredStringArray(row.id, "visual_language_tags", row.visualLanguageTags),
    license_status: row.licenseStatus as ReferenceRecord["license_status"],
    attribution_text: row.attributionText,
    public_status: row.publicStatus as ReferenceRecord["public_status"],
    quality_status: row.qualityStatus as ReferenceRecord["quality_status"],
    rating: row.rating,
    reference_value_score: row.referenceValueScore,
    transformability_score: row.transformabilityScore,
    copyright_risk_score: row.copyrightRiskScore,
    production_readiness_score: row.productionReadinessScore,
    inspiration_points: parseStoredStringArray(row.id, "inspiration_points", row.inspirationPoints),
    inspiration_entries: parseStoredInspirationEntries(row.id, row.inspirationEntries),
    deconstruction_notes: row.deconstructionNotes,
    transformation_ideas: row.transformationIdeas,
    avoid_copying_notes: row.avoidCopyingNotes,
    related_original_asset: row.relatedOriginalAsset,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
  assertStoredReferenceIsValid(record);
  return record;
}

function strictSynthesisRowToRecord(row: typeof syntheses.$inferSelect): SynthesisRecord {
  const record = synthesisRowToRecord(row);
  if (typeof record.title !== "string" || typeof record.status !== "string" ||
    !SYNTHESIS_NULLABLE_TEXT_FIELDS.every((field) => isNullableString(record[field])) ||
    !isStoredId(record.id) || !isStoredTimestamp(record.created_at) || !isStoredTimestamp(record.updated_at)) {
    throw new BackupStoredDataError(`synthesis ${String(record.id)} has invalid stored fields`);
  }
  const validation = validateSynthesisInput(record);
  if (!validation.ok) {
    throw new BackupStoredDataError(`synthesis ${record.id} is invalid: ${validation.errors.join("; ")}`);
  }
  return record;
}

function sortInventory(inventory: BackupInventory): BackupInventory {
  return {
    references: [...inventory.references].sort((left, right) => compareStrings(left.id, right.id)),
    syntheses: [...inventory.syntheses].sort((left, right) => compareStrings(left.id, right.id)),
    relations: [...inventory.relations].sort((left, right) =>
      compareStrings(left.synthesis_id, right.synthesis_id) ||
      left.position - right.position ||
      compareStrings(left.id, right.id)),
  };
}

function relationRowToRecord(row: typeof synthesisReferences.$inferSelect): BackupSynthesisRelation {
  if (!isStoredId(row.id) || !isStoredId(row.synthesisId) ||
    (row.referenceId !== null && !isStoredId(row.referenceId)) ||
    !Number.isInteger(row.position) || row.position < 0 ||
    !isStoredTimestamp(row.snapshotUpdatedAt)) {
    throw new BackupStoredDataError(`relation ${String(row.id)} has invalid stored fields`);
  }
  const snapshot = parseReferenceSnapshot(row.snapshotJson);
  if (snapshot === null) {
    throw new BackupStoredDataError(`relation ${row.id} has an invalid snapshot`);
  }

  return {
    id: row.id,
    synthesis_id: row.synthesisId,
    reference_id: row.referenceId,
    position: row.position,
    snapshot,
    snapshot_updated_at: row.snapshotUpdatedAt,
  };
}

export async function readBackupInventory(): Promise<BackupInventory> {
  const db = getDb();
  const [referenceRows, synthesisRows, relationRows] = await db.batch([
    db.select().from(references).orderBy(references.id),
    db.select().from(syntheses).orderBy(syntheses.id),
    db.select().from(synthesisReferences)
      .orderBy(synthesisReferences.synthesisId, synthesisReferences.position),
  ]);

  const inventory = sortInventory({
    references: referenceRows.map(strictReferenceRowToRecord),
    syntheses: synthesisRows.map(strictSynthesisRowToRecord),
    relations: relationRows.map(relationRowToRecord),
  });
  ensureStoredBackupIsValid(toBackup(inventory, INVENTORY_VALIDATION_EXPORTED_AT));
  return inventory;
}

function toBackup(inventory: BackupInventory, exportedAt: string): RefForgeBackupV1 {
  return {
    format: "ref-forge-backup",
    schema_version: 1,
    exported_at: exportedAt,
    app: { name: "RefForge" },
    data: {
      references: inventory.references,
      syntheses: inventory.syntheses,
      synthesis_references: inventory.relations,
    },
    preferences: null,
  };
}

function ensureStoredBackupIsValid(backup: RefForgeBackupV1): RefForgeBackupV1 {
  const parsed = parseRefForgeBackup(backup);
  if (!parsed.ok) {
    throw new BackupStoredDataError(parsed.issues.map((issue) => `${issue.path}: ${issue.message}`).join("; "));
  }
  return parsed.backup;
}

async function createCanonicalDigest(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalBackupJson(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function createStateDigest(inventory: BackupInventory): Promise<string> {
  const normalized = sortInventory(inventory);
  return createCanonicalDigest({
    references: normalized.references,
    syntheses: normalized.syntheses,
    synthesis_references: normalized.relations,
  });
}

function countRecordChanges(backupIds: string[], currentIds: string[]) {
  const backup = new Set(backupIds);
  const current = new Set(currentIds);
  let create = 0;
  let overwrite = 0;
  let preserve = 0;

  for (const id of backup) {
    if (current.has(id)) overwrite += 1;
    else create += 1;
  }
  for (const id of current) {
    if (!backup.has(id)) preserve += 1;
  }

  return { create, overwrite, preserve };
}

export async function createFullBackup(exportedAt = new Date().toISOString()): Promise<RefForgeBackupV1> {
  return ensureStoredBackupIsValid(toBackup(await readBackupInventory(), exportedAt));
}

export async function previewBackup(backup: RefForgeBackupV1): Promise<BackupPreview> {
  const inventory = await readBackupInventory();
  const [backupDigest, stateDigest] = await Promise.all([
    createBackupDigest(backup),
    createStateDigest(inventory),
  ]);

  return {
    references: countRecordChanges(
      backup.data.references.map(({ id }) => id),
      inventory.references.map(({ id }) => id),
    ),
    syntheses: countRecordChanges(
      backup.data.syntheses.map(({ id }) => id),
      inventory.syntheses.map(({ id }) => id),
    ),
    relations: {
      restore: backup.data.synthesis_references.length,
      historical: backup.data.synthesis_references.filter(({ reference_id }) => reference_id === null).length,
    },
    contains_preferences: backup.preferences !== null,
    backup_digest: backupDigest,
    state_digest: stateDigest,
  };
}
