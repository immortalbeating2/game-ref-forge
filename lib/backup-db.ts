import { getDb } from "../db";
import { references, synthesisReferences, syntheses } from "../db/schema";
import {
  canonicalBackupJson,
  createBackupDigest,
  parseRefForgeBackup,
  type BackupSynthesisRelation,
  type RefForgeBackupV1,
} from "./backup";
import { referenceRowToRecord } from "./reference-db";
import { synthesisRowToRecord } from "./synthesis-db";
import { parseReferenceSnapshot, type SynthesisRecord } from "./synthesis";
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

function compareStrings(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0;
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
  const [referenceRows, synthesisRows, relationRows] = await Promise.all([
    db.select().from(references).orderBy(references.id),
    db.select().from(syntheses).orderBy(syntheses.id),
    db.select().from(synthesisReferences)
      .orderBy(synthesisReferences.synthesisId, synthesisReferences.position),
  ]);

  return sortInventory({
    references: referenceRows.map(referenceRowToRecord),
    syntheses: synthesisRows.map(synthesisRowToRecord),
    relations: relationRows.map(relationRowToRecord),
  });
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
