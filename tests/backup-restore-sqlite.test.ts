import { readFileSync } from "node:fs";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";

import { describe, expect, it, vi } from "vitest";

vi.mock("../db", () => ({ getD1Binding: vi.fn(), getDb: vi.fn() }));

import {
  buildBackupRestoreOperations,
  type BackupRestoreOperation,
} from "../lib/backup-db";
import { referenceRecordToStorageRow } from "../lib/reference-db";
import { synthesisRecordToStorageRow } from "../lib/synthesis-db";
import { createReferenceSnapshot } from "../lib/synthesis";
import {
  makeBackupFixture,
  makeReference,
  makeSynthesis,
} from "./fixtures/backup";

function applyMigration(db: DatabaseSync, path: string) {
  const migration = readFileSync(path, "utf8");
  for (const statement of migration.split("--> statement-breakpoint")) {
    if (statement.trim()) db.exec(statement);
  }
}

function createDatabase() {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  applyMigration(db, "drizzle/0000_melodic_colleen_wing.sql");
  applyMigration(db, "drizzle/0001_massive_zodiak.sql");
  applyMigration(db, "drizzle/0002_multi_reference_synthesis.sql");
  return db;
}

function toColumnName(key: string) {
  return key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function insertRow(
  db: DatabaseSync,
  table: "references" | "syntheses" | "synthesis_references",
  row: Record<string, unknown>,
) {
  const keys = Object.keys(row);
  const names = keys.map((key) => `"${toColumnName(key)}"`).join(",");
  const placeholders = keys.map(() => "?").join(",");
  db.prepare(`INSERT INTO "${table}" (${names}) VALUES (${placeholders})`).run(
    ...keys.map((key) => row[key]) as SQLInputValue[],
  );
}

function relationRow(input: {
  id: string;
  synthesisId: string;
  referenceId: string | null;
  position: number;
  reference: ReturnType<typeof makeReference>;
}) {
  return {
    id: input.id,
    synthesisId: input.synthesisId,
    referenceId: input.referenceId,
    position: input.position,
    snapshotJson: JSON.stringify(createReferenceSnapshot(input.reference)),
    snapshotUpdatedAt: input.reference.updated_at,
  };
}

function seedCurrentLibrary(db: DatabaseSync) {
  const overwrittenReference = makeReference({
    id: "ref-1",
    title: "Current title that must be overwritten",
    created_at: "2026-07-20T00:00:00.000Z",
    updated_at: "2026-07-20T00:00:00.000Z",
  });
  const currentOnlyReference = makeReference({
    id: "current-only-ref",
    title: "Current-only reference",
    source_url: "https://example.com/current-only",
  });
  insertRow(
    db,
    "references",
    referenceRecordToStorageRow(overwrittenReference) as Record<string, unknown>,
  );
  insertRow(
    db,
    "references",
    referenceRecordToStorageRow(currentOnlyReference) as Record<string, unknown>,
  );

  insertRow(
    db,
    "syntheses",
    synthesisRecordToStorageRow(makeSynthesis({
      id: "syn-1",
      title: "Current synthesis that must be overwritten",
      created_at: "2026-07-20T00:00:00.000Z",
      updated_at: "2026-07-20T00:00:00.000Z",
    })) as Record<string, unknown>,
  );
  insertRow(
    db,
    "syntheses",
    synthesisRecordToStorageRow(makeSynthesis({
      id: "current-only-syn",
      title: "Current-only synthesis",
    })) as Record<string, unknown>,
  );

  insertRow(db, "synthesis_references", relationRow({
    id: "old-imported-link-1",
    synthesisId: "syn-1",
    referenceId: overwrittenReference.id,
    position: 0,
    reference: overwrittenReference,
  }));
  insertRow(db, "synthesis_references", relationRow({
    id: "old-imported-link-2",
    synthesisId: "syn-1",
    referenceId: currentOnlyReference.id,
    position: 1,
    reference: currentOnlyReference,
  }));
  insertRow(db, "synthesis_references", relationRow({
    id: "current-link-1",
    synthesisId: "current-only-syn",
    referenceId: currentOnlyReference.id,
    position: 0,
    reference: currentOnlyReference,
  }));
  insertRow(db, "synthesis_references", relationRow({
    id: "current-link-2",
    synthesisId: "current-only-syn",
    referenceId: null,
    position: 1,
    reference: currentOnlyReference,
  }));
}

function executeOperations(
  db: DatabaseSync,
  operations: BackupRestoreOperation[],
) {
  db.exec("BEGIN");
  try {
    for (const operation of operations) {
      db.prepare(operation.sql).run(...operation.params as SQLInputValue[]);
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

function snapshotAllTables(db: DatabaseSync) {
  return JSON.stringify({
    references: db.prepare('SELECT * FROM "references" ORDER BY id').all(),
    syntheses: db.prepare("SELECT * FROM syntheses ORDER BY id").all(),
    relations: db.prepare(
      "SELECT * FROM synthesis_references ORDER BY synthesis_id, position, id",
    ).all(),
  });
}

describe("backup restore production SQL on SQLite", () => {
  it("restores exact rows while preserving records outside the backup", () => {
    const db = createDatabase();
    seedCurrentLibrary(db);
    const backup = makeBackupFixture();

    executeOperations(db, buildBackupRestoreOperations(backup));

    const referenceRows = db.prepare(
      'SELECT id, title, created_at, updated_at FROM "references" ORDER BY id',
    ).all() as Array<Record<string, string>>;
    expect(referenceRows).toEqual([
      {
        id: "current-only-ref",
        title: "Current-only reference",
        created_at: "2026-07-27T00:00:00.000Z",
        updated_at: "2026-07-27T00:00:00.000Z",
      },
      {
        id: "ref-1",
        title: "Material study",
        created_at: "2026-07-27T00:00:00.000Z",
        updated_at: "2026-07-27T00:00:00.000Z",
      },
      {
        id: "ref-2",
        title: "UI study",
        created_at: "2026-07-27T00:00:00.000Z",
        updated_at: "2026-07-27T00:00:00.000Z",
      },
    ]);

    const synthesisRows = db.prepare(
      "SELECT id, title, created_at, updated_at FROM syntheses ORDER BY id",
    ).all() as Array<Record<string, string>>;
    expect(synthesisRows).toEqual([
      {
        id: "current-only-syn",
        title: "Current-only synthesis",
        created_at: "2026-07-27T00:00:00.000Z",
        updated_at: "2026-07-27T00:00:00.000Z",
      },
      {
        id: "syn-1",
        title: "Shared direction",
        created_at: "2026-07-27T00:00:00.000Z",
        updated_at: "2026-07-27T00:00:00.000Z",
      },
    ]);

    const importedRelations = db.prepare(
      `SELECT id, synthesis_id, reference_id, position, snapshot_json, snapshot_updated_at
       FROM synthesis_references
       WHERE synthesis_id = 'syn-1'
       ORDER BY position`,
    ).all() as Array<Record<string, string | number | null>>;
    expect(importedRelations.map(({ id, reference_id, position }) => ({
      id,
      reference_id,
      position,
    }))).toEqual([
      { id: "link-1", reference_id: "ref-1", position: 0 },
      { id: "link-2", reference_id: null, position: 1 },
    ]);
    expect(importedRelations[1].snapshot_json).toBe(JSON.stringify(
      backup.data.synthesis_references[1].snapshot,
    ));
    expect(importedRelations[1].snapshot_updated_at).toBe(
      backup.data.synthesis_references[1].snapshot_updated_at,
    );

    const preservedRelations = db.prepare(
      `SELECT id FROM synthesis_references
       WHERE synthesis_id = 'current-only-syn'
       ORDER BY position`,
    ).all() as Array<{ id: string }>;
    expect(preservedRelations.map(({ id }) => id)).toEqual([
      "current-link-1",
      "current-link-2",
    ]);
    db.close();
  });

  it("rolls back all three tables when a later relation operation fails", () => {
    const db = createDatabase();
    seedCurrentLibrary(db);
    const before = snapshotAllTables(db);
    const operations = buildBackupRestoreOperations(makeBackupFixture());
    const relationInsert = operations.find(({ sql }) =>
      sql.startsWith('INSERT INTO "synthesis_references"'));
    if (relationInsert === undefined) throw new Error("relation insert operation missing");
    const invalidRelationOperation: BackupRestoreOperation = {
      sql: relationInsert.sql,
      params: [JSON.stringify([{
        id: "invalid-link",
        synthesisId: "missing-synthesis",
        referenceId: "ref-1",
        position: 0,
        snapshotJson: "{}",
        snapshotUpdatedAt: "2026-07-27T00:00:00.000Z",
      }])],
    };

    expect(() => executeOperations(
      db,
      [...operations, invalidRelationOperation],
    )).toThrow();
    expect(snapshotAllTables(db)).toBe(before);
    db.close();
  });
});
