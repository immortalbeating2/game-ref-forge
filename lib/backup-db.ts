import { getD1Binding, getDb } from "../db";
import { references, synthesisReferences, syntheses } from "../db/schema";
import {
  canonicalBackupJson,
  createBackupDigest,
  parseRefForgeBackup,
  type BackupSynthesisRelation,
  type RefForgeBackupV1,
} from "./backup";
import { referenceRecordToStorageRow } from "./reference-db";
import {
  synthesisRecordToStorageRow,
  synthesisRowToRecord,
} from "./synthesis-db";
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

export const MAX_D1_JSON_CHUNK_BYTES = 1_000_000;
export const MAX_D1_BATCH_STATEMENTS = 40;

export type BackupRestoreOperation = {
  sql: string;
  params: [string];
};

export type BackupRestoreRequest = {
  backup: RefForgeBackupV1;
  backup_digest: string;
  state_digest: string;
  confirm_overwrite: boolean;
};

export type BackupRestoreResult =
  | { ok: true; preview: BackupPreview }
  | {
      ok: false;
      code:
        | "backup_changed"
        | "preview_stale"
        | "overwrite_confirmation_required"
        | "restore_failed";
    };

export class BackupStoredDataError extends Error {
  constructor(message: string) {
    super(`Stored backup data is invalid: ${message}`);
    this.name = "BackupStoredDataError";
  }
}

export class BackupRestorePlanError extends Error {
  constructor(
    public readonly code: "json_chunk_too_large" | "d1_batch_too_large",
    message: string,
  ) {
    super(message);
    this.name = "BackupRestorePlanError";
  }
}

const REFERENCE_RESTORE_COLUMNS = [
  ["id", "id"],
  ["title", "title"],
  ["source_url", "sourceUrl"],
  ["canonical_url", "canonicalUrl"],
  ["site_name", "siteName"],
  ["author", "author"],
  ["preview_url", "previewUrl"],
  ["media_type", "mediaType"],
  ["asset_category", "assetCategory"],
  ["source_category", "sourceCategory"],
  ["style_tags", "styleTags"],
  ["use_tags", "useTags"],
  ["mechanic_tags", "mechanicTags"],
  ["mood_tags", "moodTags"],
  ["visual_language_tags", "visualLanguageTags"],
  ["license_status", "licenseStatus"],
  ["attribution_text", "attributionText"],
  ["public_status", "publicStatus"],
  ["quality_status", "qualityStatus"],
  ["rating", "rating"],
  ["reference_value_score", "referenceValueScore"],
  ["transformability_score", "transformabilityScore"],
  ["copyright_risk_score", "copyrightRiskScore"],
  ["production_readiness_score", "productionReadinessScore"],
  ["inspiration_points", "inspirationPoints"],
  ["inspiration_entries", "inspirationEntries"],
  ["deconstruction_notes", "deconstructionNotes"],
  ["transformation_ideas", "transformationIdeas"],
  ["avoid_copying_notes", "avoidCopyingNotes"],
  ["related_original_asset", "relatedOriginalAsset"],
  ["created_at", "createdAt"],
  ["updated_at", "updatedAt"],
] as const;

const SYNTHESIS_RESTORE_COLUMNS = [
  ["id", "id"],
  ["title", "title"],
  ["target_asset", "targetAsset"],
  ["shared_principles", "sharedPrinciples"],
  ["key_differences", "keyDifferences"],
  ["original_direction", "originalDirection"],
  ["avoid_copying_notes", "avoidCopyingNotes"],
  ["design_constraints", "designConstraints"],
  ["experiment_plan", "experimentPlan"],
  ["next_actions", "nextActions"],
  ["additional_notes", "additionalNotes"],
  ["status", "status"],
  ["created_at", "createdAt"],
  ["updated_at", "updatedAt"],
] as const;

const RELATION_RESTORE_COLUMNS = [
  ["id", "id"],
  ["synthesis_id", "synthesisId"],
  ["reference_id", "referenceId"],
  ["position", "position"],
  ["snapshot_json", "snapshotJson"],
  ["snapshot_updated_at", "snapshotUpdatedAt"],
] as const;

const DELETE_IMPORTED_SYNTHESIS_RELATIONS_SQL =
  `DELETE FROM "synthesis_references"\n` +
  `WHERE "synthesis_id" IN (SELECT value FROM json_each(?))`;
const UTF8_ENCODER = new TextEncoder();

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

function buildJsonInsertSelect(
  table: "references" | "syntheses" | "synthesis_references",
  columns: readonly (readonly [string, string])[],
  conflict: "update" | "none",
) {
  const names = columns.map(([column]) => `"${column}"`).join(",");
  const values = columns.map(([, key]) =>
    `json_extract(value, '$.${key}')`,
  ).join(",");
  const update = columns
    .filter(([column]) => column !== "id")
    .map(([column]) => `"${column}" = excluded."${column}"`)
    .join(",");
  return `INSERT INTO "${table}" (${names})\n` +
    `SELECT ${values} FROM json_each(?) WHERE true` +
    (conflict === "update"
      ? `\nON CONFLICT("id") DO UPDATE SET ${update}`
      : "");
}

function createJsonChunks(rows: readonly unknown[]): string[] {
  const chunks: string[] = [];
  let parts: string[] = [];
  let byteLength = 2;

  for (const row of rows) {
    const rowJson = JSON.stringify(row);
    if (rowJson === undefined) {
      throw new BackupRestorePlanError(
        "json_chunk_too_large",
        "Backup restore row cannot be serialized as JSON.",
      );
    }
    const rowBytes = UTF8_ENCODER.encode(rowJson).byteLength;
    if (rowBytes + 2 >= MAX_D1_JSON_CHUNK_BYTES) {
      throw new BackupRestorePlanError(
        "json_chunk_too_large",
        `A backup restore row must be smaller than ${MAX_D1_JSON_CHUNK_BYTES} UTF-8 bytes.`,
      );
    }

    const separatorBytes = parts.length === 0 ? 0 : 1;
    if (byteLength + separatorBytes + rowBytes >= MAX_D1_JSON_CHUNK_BYTES) {
      chunks.push(`[${parts.join(",")}]`);
      parts = [];
      byteLength = 2;
    }
    parts.push(rowJson);
    byteLength += (parts.length === 1 ? 0 : 1) + rowBytes;
  }

  if (parts.length > 0) chunks.push(`[${parts.join(",")}]`);
  return chunks;
}

function appendOperations(
  operations: BackupRestoreOperation[],
  sql: string,
  chunks: string[],
) {
  for (const chunk of chunks) {
    if (operations.length >= MAX_D1_BATCH_STATEMENTS) {
      throw new BackupRestorePlanError(
        "d1_batch_too_large",
        `Backup restore requires more than ${MAX_D1_BATCH_STATEMENTS} D1 statements.`,
      );
    }
    operations.push({ sql, params: [chunk] });
  }
}

export function buildBackupRestoreOperations(
  backup: RefForgeBackupV1,
): BackupRestoreOperation[] {
  const operations: BackupRestoreOperation[] = [];
  const synthesisIds = backup.data.syntheses.map(({ id }) => id);
  if (synthesisIds.length > 0) {
    const synthesisIdsJson = JSON.stringify(synthesisIds);
    if (UTF8_ENCODER.encode(synthesisIdsJson).byteLength >= MAX_D1_JSON_CHUNK_BYTES) {
      throw new BackupRestorePlanError(
        "json_chunk_too_large",
        `Imported synthesis IDs must be smaller than ${MAX_D1_JSON_CHUNK_BYTES} UTF-8 bytes.`,
      );
    }
    appendOperations(
      operations,
      DELETE_IMPORTED_SYNTHESIS_RELATIONS_SQL,
      [synthesisIdsJson],
    );
  }

  appendOperations(
    operations,
    buildJsonInsertSelect("references", REFERENCE_RESTORE_COLUMNS, "update"),
    createJsonChunks(backup.data.references.map(referenceRecordToStorageRow)),
  );
  appendOperations(
    operations,
    buildJsonInsertSelect("syntheses", SYNTHESIS_RESTORE_COLUMNS, "update"),
    createJsonChunks(backup.data.syntheses.map(synthesisRecordToStorageRow)),
  );
  appendOperations(
    operations,
    buildJsonInsertSelect("synthesis_references", RELATION_RESTORE_COLUMNS, "none"),
    createJsonChunks(backup.data.synthesis_references.map((relation) => ({
      id: relation.id,
      synthesisId: relation.synthesis_id,
      referenceId: relation.reference_id,
      position: relation.position,
      snapshotJson: JSON.stringify(relation.snapshot),
      snapshotUpdatedAt: relation.snapshot_updated_at,
    }))),
  );
  return operations;
}

export async function createFullBackup(exportedAt = new Date().toISOString()): Promise<RefForgeBackupV1> {
  return ensureStoredBackupIsValid(toBackup(await readBackupInventory(), exportedAt));
}

async function createPreview(
  backup: RefForgeBackupV1,
  inventory: BackupInventory,
  knownBackupDigest?: string,
): Promise<BackupPreview> {
  const [backupDigest, stateDigest] = await Promise.all([
    knownBackupDigest ?? createBackupDigest(backup),
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

export async function previewBackup(backup: RefForgeBackupV1): Promise<BackupPreview> {
  return createPreview(backup, await readBackupInventory());
}

export async function restoreBackup(
  request: BackupRestoreRequest,
): Promise<BackupRestoreResult> {
  const parsed = parseRefForgeBackup(request.backup);
  if (!parsed.ok) return { ok: false, code: "restore_failed" };

  const backupDigest = await createBackupDigest(parsed.backup);
  if (backupDigest !== request.backup_digest) {
    return { ok: false, code: "backup_changed" };
  }

  const inventory = await readBackupInventory();
  const preview = await createPreview(parsed.backup, inventory, backupDigest);
  if (preview.state_digest !== request.state_digest) {
    return { ok: false, code: "preview_stale" };
  }
  if (!request.confirm_overwrite &&
    preview.references.overwrite + preview.syntheses.overwrite > 0) {
    return { ok: false, code: "overwrite_confirmation_required" };
  }

  try {
    const operations = buildBackupRestoreOperations(parsed.backup);
    if (operations.length === 0) {
      return { ok: true, preview };
    }
    const binding = getD1Binding();
    const statements = operations.map(({ sql, params }) =>
      binding.prepare(sql).bind(...params));
    await binding.batch(statements);
  } catch {
    return { ok: false, code: "restore_failed" };
  }
  return { ok: true, preview };
}
