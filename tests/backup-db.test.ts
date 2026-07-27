import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../db", () => ({ getD1Binding: vi.fn(), getDb: vi.fn() }));

import { getD1Binding, getDb } from "../db";
import { references, synthesisReferences, syntheses } from "../db/schema";
import { createBackupDigest, type RefForgeBackupV1 } from "../lib/backup";
import { referenceRecordToRow, referenceRecordToStorageRow } from "../lib/reference-db";
import {
  synthesisRecordToRow,
  synthesisRecordToStorageRow,
  synthesisRowToRecord,
} from "../lib/synthesis-db";
import { createReferenceSnapshot, type SynthesisReferenceSnapshot } from "../lib/synthesis";
import {
  makeBackupFixture,
  makeReference,
  makeSynthesis,
} from "./fixtures/backup";
import {
  BackupStoredDataError,
  BackupRestorePlanError,
  MAX_D1_BATCH_STATEMENTS,
  MAX_D1_JSON_CHUNK_BYTES,
  buildBackupRestoreOperations,
  createFullBackup,
  createStateDigest,
  previewBackup,
  restoreBackup,
} from "../lib/backup-db";

type ReadRows = {
  references: Array<typeof references.$inferSelect>;
  syntheses: Array<typeof syntheses.$inferSelect>;
  relations: Array<typeof synthesisReferences.$inferSelect>;
};

type FakeQuery = PromiseLike<unknown[]> & {
  operations: Array<{ name: string; args: unknown[] }>;
  from(table: unknown): FakeQuery;
  orderBy(...columns: unknown[]): FakeQuery;
};

function toReferenceRow(record = makeReference()): typeof references.$inferSelect {
  return referenceRecordToRow(record) as typeof references.$inferSelect;
}

function toSynthesisRow(record = makeSynthesis()): typeof syntheses.$inferSelect {
  return synthesisRecordToRow(record) as typeof syntheses.$inferSelect;
}

function makeRelationRow(
  snapshot: SynthesisReferenceSnapshot,
  overrides: Partial<typeof synthesisReferences.$inferSelect> = {},
): typeof synthesisReferences.$inferSelect {
  return {
    id: "link-1",
    synthesisId: "syn-1",
    referenceId: "ref-1",
    position: 0,
    snapshotJson: JSON.stringify(snapshot),
    snapshotUpdatedAt: "2026-07-27T00:00:00.000Z",
    ...overrides,
  };
}

function makeFakeQuery(rows: unknown[], queries: FakeQuery[]): FakeQuery {
  const operations: Array<{ name: string; args: unknown[] }> = [];
  const query = {
    operations,
    from: (...args: unknown[]) => {
      operations.push({ name: "from", args });
      return query;
    },
    orderBy: (...args: unknown[]) => {
      operations.push({ name: "orderBy", args });
      return query;
    },
    then<TResult1 = unknown[], TResult2 = never>(
      onFulfilled?: ((value: unknown[]) => TResult1 | PromiseLike<TResult1>) | null,
      onRejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
    ): PromiseLike<TResult1 | TResult2> {
      return Promise.resolve(rows).then(onFulfilled, onRejected);
    },
  };
  const typedQuery = query as FakeQuery;
  queries.push(typedQuery);
  return typedQuery;
}

function configureBackupReadDb(rows: ReadRows) {
  const selectResults = [rows.references, rows.syntheses, rows.relations];
  const batchResults = [[rows.references, rows.syntheses, rows.relations]];
  const batches: FakeQuery[][] = [];
  const queries: FakeQuery[] = [];
  const db = {
    select: vi.fn(() => makeFakeQuery(selectResults.shift() ?? [], queries)),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    batch: vi.fn(async (statements: FakeQuery[]) => {
      batches.push(statements);
      return batchResults.shift() ?? [];
    }),
  };
  vi.mocked(getDb).mockReturnValue(db as never);
  return { ...db, batches, queries };
}

function completeRows(): ReadRows {
  const backup = makeBackupFixture();
  return {
    references: backup.data.references.map(toReferenceRow),
    syntheses: backup.data.syntheses.map(toSynthesisRow),
    relations: backup.data.synthesis_references.map((relation) => makeRelationRow(relation.snapshot, {
      id: relation.id,
      synthesisId: relation.synthesis_id,
      referenceId: relation.reference_id,
      position: relation.position,
      snapshotUpdatedAt: relation.snapshot_updated_at,
    })),
  };
}

function previewRowsWithPreservedData(): ReadRows {
  const currentReference = makeReference({ id: "current-only" });
  const currentSynthesis = makeSynthesis({ id: "current-syn" });
  const firstReference = makeReference({ id: "ref-1" });

  return {
    references: [toReferenceRow(firstReference), toReferenceRow(currentReference)],
    syntheses: [toSynthesisRow(makeSynthesis({ id: "syn-1" })), toSynthesisRow(currentSynthesis)],
    relations: [
      makeRelationRow(createReferenceSnapshot(firstReference)),
      makeRelationRow(createReferenceSnapshot(firstReference), {
        id: "link-2",
        referenceId: null,
        position: 1,
      }),
      makeRelationRow(createReferenceSnapshot(currentReference), {
        id: "current-link-1",
        synthesisId: currentSynthesis.id,
        referenceId: currentReference.id,
        position: 0,
      }),
      makeRelationRow(createReferenceSnapshot(currentReference), {
        id: "current-link-2",
        synthesisId: currentSynthesis.id,
        referenceId: null,
        position: 1,
      }),
    ],
  };
}

function makeLargeValidBackup(input: {
  references: number;
  syntheses: number;
  relations: number;
}): RefForgeBackupV1 {
  const backupReferences = Array.from({ length: input.references }, (_, index) =>
    makeReference({
      id: `ref-${String(index).padStart(4, "0")}`,
      title: `Reference ${index}`,
      source_url: `https://example.com/reference-${index}`,
    }));
  const backupSyntheses = Array.from({ length: input.syntheses }, (_, index) =>
    makeSynthesis({
      id: `syn-${String(index).padStart(4, "0")}`,
      title: `Synthesis ${index}`,
    }));
  const relationsPerSynthesis = input.syntheses === 0
    ? 0
    : input.relations / input.syntheses;
  if ((input.syntheses === 0 && input.relations !== 0) ||
    (input.syntheses > 0 && (
      !Number.isInteger(relationsPerSynthesis) ||
      relationsPerSynthesis < 2 ||
      relationsPerSynthesis > 4
    ))) {
    throw new Error("fixture relations must provide 2-4 rows per synthesis");
  }
  const backupRelations = backupSyntheses.flatMap((synthesis, synthesisIndex) =>
    Array.from({ length: relationsPerSynthesis }, (_, position) => {
      const reference = backupReferences[
        (synthesisIndex * relationsPerSynthesis + position) % backupReferences.length
      ];
      return {
        id: `link-${String(synthesisIndex).padStart(4, "0")}-${position}`,
        synthesis_id: synthesis.id,
        reference_id: reference.id,
        position,
        snapshot: createReferenceSnapshot(reference),
        snapshot_updated_at: "2026-07-27T00:00:00.000Z",
      };
    }));

  return {
    format: "ref-forge-backup",
    schema_version: 1,
    exported_at: "2026-07-27T00:00:00.000Z",
    app: { name: "RefForge" },
    data: {
      references: backupReferences,
      syntheses: backupSyntheses,
      synthesis_references: backupRelations,
    },
    preferences: null,
  };
}

function useNativeD1(options: { rejectBatch?: boolean } = {}) {
  const prepared: Array<{
    sql: string;
    params: unknown[];
    bind: ReturnType<typeof vi.fn>;
  }> = [];
  const prepare = vi.fn((sql: string) => {
    const statement = {
      sql,
      params: [] as unknown[],
      bind: vi.fn(function bind(this: { params: unknown[] }, ...params: unknown[]) {
        this.params = params;
        return this;
      }),
    };
    prepared.push(statement);
    return statement;
  });
  const batch = options.rejectBatch
    ? vi.fn().mockRejectedValue(new Error("injected D1 batch failure"))
    : vi.fn().mockResolvedValue([]);
  const binding = { prepare, batch };
  vi.mocked(getD1Binding).mockReturnValue(binding as never);
  return { binding, prepared };
}

afterEach(() => {
  vi.resetAllMocks();
});

describe("backup database reads", () => {
  it("exports all tables in stable id order with structured snapshots", async () => {
    const rows = completeRows();
    configureBackupReadDb({
      references: [...rows.references].reverse(),
      syntheses: rows.syntheses,
      relations: [...rows.relations].reverse(),
    });

    const backup = await createFullBackup("2026-07-27T00:00:00.000Z");

    expect(backup.data.references.map(({ id }) => id)).toEqual(["ref-1", "ref-2"]);
    expect(backup.data.syntheses.map(({ id }) => id)).toEqual(["syn-1"]);
    expect(backup.data.synthesis_references.map(({ id }) => id)).toEqual(["link-1", "link-2"]);
    expect(backup.data.synthesis_references[0]).toMatchObject({
      id: "link-1",
      position: 0,
      snapshot: { schema_version: 1, reference_id: "ref-1" },
    });
    expect(backup.preferences).toBeNull();
  });

  it("round trips parser-valid records through storage-exact mappers without cleanup", async () => {
    const reference = makeReference({
      style_tags: ["  deliberately retained  "],
      inspiration_entries: [{
        ...makeReference().inspiration_entries[0],
        id: " entry-id-with-space ",
        observation: "  deliberately retained  ",
      }],
    });
    const row = referenceRecordToStorageRow(reference);
    const rows = completeRows();
    configureBackupReadDb({
      ...rows,
      references: [row as typeof references.$inferSelect, rows.references[1]],
    });

    const backup = await createFullBackup("2026-07-27T00:00:00.000Z");
    expect(backup.data.references.find(({ id }) => id === reference.id)).toEqual(reference);
    expect(row.styleTags).toBe(JSON.stringify(reference.style_tags));
    expect(row.inspirationEntries).toBe(JSON.stringify(reference.inspiration_entries));

    const synthesis = makeSynthesis({ title: "  retained synthesis title  " });
    expect(synthesisRowToRecord(
      synthesisRecordToStorageRow(synthesis) as typeof syntheses.$inferSelect,
    )).toEqual(synthesis);
  });

  it("rejects an invalid stored snapshot instead of exporting an unavailable placeholder", async () => {
    const rows = completeRows();
    configureBackupReadDb({
      ...rows,
      relations: [
        { ...rows.relations[0], snapshotJson: "not-json" },
        rows.relations[1],
      ],
    });

    await expect(createFullBackup("2026-07-27T00:00:00.000Z")).rejects.toThrow(/stored backup data/i);
  });

  it.each([
    ["invalid JSON", { styleTags: "not-json" }],
    ["a non-string JSON array member", { useTags: JSON.stringify(["environment", 3]) }],
    ["a blank inspiration entry id", {
      inspirationEntries: JSON.stringify([{
        ...makeReference().inspiration_entries[0],
        id: "",
      }]),
    }],
    ["a missing inspiration entry id", {
      inspirationEntries: JSON.stringify([{
        observation: "Observation",
        principle: "Principle",
        transferable_idea: "Idea",
        original_application: "Application",
        avoid_copying: "Avoid copying",
      }]),
    }],
  ])("rejects references with %s without cleaning stored values", async (_case, values) => {
    const rows = completeRows();
    configureBackupReadDb({
      ...rows,
      references: [{ ...rows.references[0], ...values }, rows.references[1]],
    });

    await expect(createFullBackup("2026-07-27T00:00:00.000Z")).rejects.toBeInstanceOf(BackupStoredDataError);
  });

  it.each([
    ["an invalid status", { status: "invalid" }],
    ["an undefined nullable field", { targetAsset: undefined }],
  ])("rejects synthesis rows with %s before creating a preview digest", async (_case, values) => {
    const rows = completeRows();
    configureBackupReadDb({
      ...rows,
      syntheses: [{ ...rows.syntheses[0], ...values } as typeof syntheses.$inferSelect],
    });

    await expect(previewBackup(makeBackupFixture())).rejects.toBeInstanceOf(BackupStoredDataError);
  });

  it.each([
    ["a snapshot/reference id mismatch", (rows: ReadRows) => ({
      ...rows,
      relations: [{ ...rows.relations[0], referenceId: "ref-2" }, rows.relations[1]],
    })],
    ["non-contiguous relation positions", (rows: ReadRows) => ({
      ...rows,
      relations: [{ ...rows.relations[0], position: 2 }, rows.relations[1]],
    })],
    ["fewer than two relations for a synthesis", (rows: ReadRows) => ({
      ...rows,
      relations: [rows.relations[0]],
    })],
    ["an invalid snapshot reference timestamp", (rows: ReadRows) => {
      const snapshot = JSON.parse(rows.relations[0].snapshotJson) as SynthesisReferenceSnapshot;
      return {
        ...rows,
        relations: [{
          ...rows.relations[0],
          snapshotJson: JSON.stringify({ ...snapshot, reference_updated_at: "not-a-timestamp" }),
        }, rows.relations[1]],
      };
    }],
    ["an out-of-range snapshot score", (rows: ReadRows) => {
      const snapshot = JSON.parse(rows.relations[0].snapshotJson) as SynthesisReferenceSnapshot;
      return {
        ...rows,
        relations: [{
          ...rows.relations[0],
          snapshotJson: JSON.stringify({ ...snapshot, scores: { ...snapshot.scores, rating: 6 } }),
        }, rows.relations[1]],
      };
    }],
  ])("rejects preview inventory with %s before creating a digest", async (_case, mutate) => {
    configureBackupReadDb(mutate(completeRows()));

    await expect(previewBackup(makeBackupFixture())).rejects.toBeInstanceOf(BackupStoredDataError);
  });

  it("reports creates, overwrites, preserves and relations without writing", async () => {
    const backup = makeBackupFixture();
    const fakeDb = configureBackupReadDb(previewRowsWithPreservedData());

    await expect(previewBackup(backup)).resolves.toMatchObject({
      references: { create: 1, overwrite: 1, preserve: 1 },
      syntheses: { create: 0, overwrite: 1, preserve: 1 },
      relations: { restore: 2, historical: 1 },
      contains_preferences: false,
      backup_digest: expect.stringMatching(/^[a-f0-9]{64}$/),
      state_digest: expect.stringMatching(/^[a-f0-9]{64}$/),
    });
    expect(fakeDb.insert).not.toHaveBeenCalled();
    expect(fakeDb.update).not.toHaveBeenCalled();
    expect(fakeDb.delete).not.toHaveBeenCalled();
    expect(fakeDb.batch).toHaveBeenCalledTimes(1);
    expect(fakeDb.batches).toHaveLength(1);
    expect(fakeDb.batches[0]).toEqual(fakeDb.queries);
    expect(fakeDb.queries).toHaveLength(3);
    expect(fakeDb.queries[0].operations).toEqual([
      { name: "from", args: [references] },
      { name: "orderBy", args: [references.id] },
    ]);
    expect(fakeDb.queries[1].operations).toEqual([
      { name: "from", args: [syntheses] },
      { name: "orderBy", args: [syntheses.id] },
    ]);
    expect(fakeDb.queries[2].operations).toEqual([
      { name: "from", args: [synthesisReferences] },
      { name: "orderBy", args: [synthesisReferences.synthesisId, synthesisReferences.position] },
    ]);
  });

  it("uses a deterministic state digest that changes with every persisted state field", async () => {
    const backup = makeBackupFixture();
    const rows = completeRows();
    configureBackupReadDb({
      references: [...rows.references].reverse(),
      syntheses: rows.syntheses,
      relations: [...rows.relations].reverse(),
    });
    const unorderedDigest = (await previewBackup(backup)).state_digest;

    configureBackupReadDb(rows);
    await expect(previewBackup(backup)).resolves.toMatchObject({ state_digest: unorderedDigest });

    const variants: Array<[string, (state: ReadRows) => ReadRows]> = [
      ["reference identity and content", (state) => ({
        ...state,
        references: [toReferenceRow(makeReference({ title: "Changed" })), state.references[1]],
      })],
      ["reference source metadata", (state) => ({
        ...state,
        references: [toReferenceRow(makeReference({ canonical_url: "https://example.com/changed" })), state.references[1]],
      })],
      ["reference tag arrays", (state) => ({
        ...state,
        references: [toReferenceRow(makeReference({ style_tags: ["changed"] })), state.references[1]],
      })],
      ["reference scores", (state) => ({
        ...state,
        references: [toReferenceRow(makeReference({ rating: 3 })), state.references[1]],
      })],
      ["reference inspiration", (state) => ({
        ...state,
        references: [toReferenceRow(makeReference({ inspiration_entries: [{
          ...makeReference().inspiration_entries[0],
          observation: "Changed observation",
        }] })), state.references[1]],
      })],
      ["reference timestamps", (state) => ({
        ...state,
        references: [toReferenceRow(makeReference({ created_at: "2026-07-26T00:00:00.000Z" })), state.references[1]],
      })],
      ["synthesis content and status", (state) => ({
        ...state,
        syntheses: [toSynthesisRow(makeSynthesis({ title: "Changed", status: "draft" }))],
      })],
      ["synthesis timestamps", (state) => ({
        ...state,
        syntheses: [toSynthesisRow(makeSynthesis({ updated_at: "2026-07-27T01:00:00.000Z" }))],
      })],
      ["relation identity", (state) => ({
        ...state,
        relations: [{ ...state.relations[0], id: "link-1-changed" }, state.relations[1]],
      })],
      ["relation reference association", (state) => ({
        ...state,
        relations: [{ ...state.relations[0], referenceId: null }, state.relations[1]],
      })],
      ["relation positions", (state) => ({
        ...state,
        relations: [{ ...state.relations[0], position: 1 }, { ...state.relations[1], position: 0 }],
      })],
      ["snapshot identity and metadata", (state) => {
        const snapshot = JSON.parse(state.relations[0].snapshotJson) as SynthesisReferenceSnapshot;
        return {
          ...state,
          relations: [{ ...state.relations[0], snapshotJson: JSON.stringify({ ...snapshot, title: "Changed snapshot" }) }, state.relations[1]],
        };
      }],
      ["snapshot scores", (state) => {
        const snapshot = JSON.parse(state.relations[0].snapshotJson) as SynthesisReferenceSnapshot;
        return {
          ...state,
          relations: [{ ...state.relations[0], snapshotJson: JSON.stringify({ ...snapshot, scores: { ...snapshot.scores, rating: 3 } }) }, state.relations[1]],
        };
      }],
      ["snapshot tags and inspiration", (state) => {
        const snapshot = JSON.parse(state.relations[0].snapshotJson) as SynthesisReferenceSnapshot;
        return {
          ...state,
          relations: [{ ...state.relations[0], snapshotJson: JSON.stringify({
            ...snapshot,
            tags: { ...snapshot.tags, style_tags: ["changed"] },
            inspiration: { ...snapshot.inspiration, inspiration_points: ["Changed"] },
          }) }, state.relations[1]],
        };
      }],
      ["snapshot and relation timestamps", (state) => {
        const snapshot = JSON.parse(state.relations[0].snapshotJson) as SynthesisReferenceSnapshot;
        return {
          ...state,
          relations: [{
            ...state.relations[0],
            snapshotJson: JSON.stringify({ ...snapshot, reference_updated_at: "2026-07-27T01:00:00.000Z" }),
            snapshotUpdatedAt: "2026-07-27T02:00:00.000Z",
          }, state.relations[1]],
        };
      }],
    ];

    for (const [fieldFamily, mutate] of variants) {
      configureBackupReadDb(mutate(rows));
      const changed = await previewBackup(backup);
      expect(changed.state_digest, fieldFamily).not.toBe(unorderedDigest);
    }
  });

  it("keeps a valid inspiration entry id unchanged across repeated state digests", async () => {
    const backup = makeBackupFixture();
    const rows = completeRows();
    configureBackupReadDb(rows);
    const first = await previewBackup(backup);

    configureBackupReadDb(rows);
    const second = await previewBackup(backup);

    expect(second.state_digest).toBe(first.state_digest);
  });
});

describe("backup restore operation generation", () => {
  it("builds bounded JSON1 operations instead of one statement per row", () => {
    const backup = makeLargeValidBackup({
      references: 120,
      syntheses: 20,
      relations: 40,
    });

    const operations = buildBackupRestoreOperations(backup);

    expect(operations.length).toBeLessThanOrEqual(MAX_D1_BATCH_STATEMENTS);
    expect(operations.every(({ params }) => params.length === 1)).toBe(true);
    expect(operations.every(({ params }) =>
      new TextEncoder().encode(String(params[0])).byteLength < MAX_D1_JSON_CHUNK_BYTES,
    )).toBe(true);
    expect(operations.every(({ sql }) => sql.includes("json_each(?)"))).toBe(true);
    expect(operations.length).toBeLessThan(
      backup.data.references.length +
      backup.data.syntheses.length +
      backup.data.synthesis_references.length,
    );
  });

  it("uses UTF-8 byte length to split storage-exact rows below the chunk limit", () => {
    const wideValue = "界".repeat(100_000);
    const backup = makeLargeValidBackup({
      references: 4,
      syntheses: 0,
      relations: 0,
    });
    backup.data.references = backup.data.references.map((reference) => ({
      ...reference,
      style_tags: [wideValue],
    }));

    const operations = buildBackupRestoreOperations(backup);

    expect(operations).toHaveLength(2);
    expect(operations.every(({ params }) =>
      new TextEncoder().encode(params[0]).byteLength < MAX_D1_JSON_CHUNK_BYTES,
    )).toBe(true);
    expect(operations.flatMap(({ params }) =>
      (JSON.parse(params[0]) as Array<{ styleTags: string }>).map(({ styleTags }) =>
        (JSON.parse(styleTags) as string[])[0]),
    )).toEqual([wideValue, wideValue, wideValue, wideValue]);
  });

  it("omits empty inserts and uses deterministic static upsert and relation SQL", () => {
    const emptyBackup = makeLargeValidBackup({
      references: 0,
      syntheses: 0,
      relations: 0,
    });
    expect(buildBackupRestoreOperations(emptyBackup)).toEqual([]);

    const backup = makeBackupFixture();
    const operations = buildBackupRestoreOperations(backup);
    expect(operations[0]).toEqual({
      sql: `DELETE FROM "synthesis_references"\nWHERE "synthesis_id" IN (SELECT value FROM json_each(?))`,
      params: [JSON.stringify(["syn-1"])],
    });

    const referenceInsert = operations.find(({ sql }) =>
      sql.startsWith('INSERT INTO "references"'));
    const synthesisInsert = operations.find(({ sql }) =>
      sql.startsWith('INSERT INTO "syntheses"'));
    const relationInsert = operations.find(({ sql }) =>
      sql.startsWith('INSERT INTO "synthesis_references"'));
    expect(referenceInsert?.sql).toContain('ON CONFLICT("id") DO UPDATE SET');
    expect(synthesisInsert?.sql).toContain('ON CONFLICT("id") DO UPDATE SET');
    expect(relationInsert?.sql).not.toContain("ON CONFLICT");
    expect(operations.indexOf(relationInsert!)).toBeGreaterThan(
      operations.indexOf(synthesisInsert!),
    );
    expect(buildBackupRestoreOperations(backup)).toEqual(operations);
  });

  it("rejects more than forty operations before accessing D1", () => {
    const backup = makeLargeValidBackup({
      references: 41,
      syntheses: 0,
      relations: 0,
    });
    const largeValue = "x".repeat(600_000);
    backup.data.references = backup.data.references.map((reference) => ({
      ...reference,
      style_tags: [largeValue],
    }));

    let error: unknown;
    try {
      buildBackupRestoreOperations(backup);
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(BackupRestorePlanError);
    expect(error).toMatchObject({ code: "d1_batch_too_large" });
    expect(getD1Binding).not.toHaveBeenCalled();
  });
});

describe("guarded backup restore", () => {
  it("rechecks digests and executes every operation in one native D1 batch", async () => {
    const backup = makeBackupFixture();
    const inventory = {
      references: backup.data.references,
      syntheses: backup.data.syntheses,
      relations: backup.data.synthesis_references,
    };
    configureBackupReadDb(completeRows());
    const { binding, prepared } = useNativeD1();

    const result = await restoreBackup({
      backup,
      backup_digest: await createBackupDigest(backup),
      state_digest: await createStateDigest(inventory),
      confirm_overwrite: true,
    });
    const operations = buildBackupRestoreOperations(backup);

    expect(result).toMatchObject({
      ok: true,
      preview: {
        references: { create: 0, overwrite: 2, preserve: 0 },
        syntheses: { create: 0, overwrite: 1, preserve: 0 },
      },
    });
    expect(getD1Binding).toHaveBeenCalledTimes(1);
    expect(binding.prepare).toHaveBeenCalledTimes(operations.length);
    expect(prepared.map(({ sql, params }) => ({ sql, params }))).toEqual(operations);
    expect(binding.batch).toHaveBeenCalledTimes(1);
    expect(binding.batch).toHaveBeenCalledWith(prepared);
  });

  it("rejects a changed backup before reading state or accessing D1", async () => {
    const backup = makeBackupFixture();

    await expect(restoreBackup({
      backup,
      backup_digest: "0".repeat(64),
      state_digest: "1".repeat(64),
      confirm_overwrite: true,
    })).resolves.toEqual({ ok: false, code: "backup_changed" });
    expect(getDb).not.toHaveBeenCalled();
    expect(getD1Binding).not.toHaveBeenCalled();
  });

  it("rejects stale preview state before accessing D1", async () => {
    const backup = makeBackupFixture();
    configureBackupReadDb(completeRows());

    await expect(restoreBackup({
      backup,
      backup_digest: await createBackupDigest(backup),
      state_digest: "0".repeat(64),
      confirm_overwrite: true,
    })).resolves.toEqual({ ok: false, code: "preview_stale" });
    expect(getD1Binding).not.toHaveBeenCalled();
  });

  it("requires confirmation only when the current library will be overwritten", async () => {
    const backup = makeBackupFixture();
    const backupDigest = await createBackupDigest(backup);
    const matchingInventory = {
      references: backup.data.references,
      syntheses: backup.data.syntheses,
      relations: backup.data.synthesis_references,
    };
    configureBackupReadDb(completeRows());

    await expect(restoreBackup({
      backup,
      backup_digest: backupDigest,
      state_digest: await createStateDigest(matchingInventory),
      confirm_overwrite: false,
    })).resolves.toEqual({
      ok: false,
      code: "overwrite_confirmation_required",
    });
    expect(getD1Binding).not.toHaveBeenCalled();

    const emptyInventory = { references: [], syntheses: [], relations: [] };
    configureBackupReadDb({ references: [], syntheses: [], relations: [] });
    const { binding } = useNativeD1();
    await expect(restoreBackup({
      backup,
      backup_digest: backupDigest,
      state_digest: await createStateDigest(emptyInventory),
      confirm_overwrite: false,
    })).resolves.toMatchObject({
      ok: true,
      preview: {
        references: { create: 2, overwrite: 0, preserve: 0 },
        syntheses: { create: 1, overwrite: 0, preserve: 0 },
      },
    });
    expect(binding.batch).toHaveBeenCalledTimes(1);
  });

  it("reports restore_failed only after the native batch rejects", async () => {
    const backup = makeBackupFixture();
    const inventory = {
      references: backup.data.references,
      syntheses: backup.data.syntheses,
      relations: backup.data.synthesis_references,
    };
    configureBackupReadDb(completeRows());
    const { binding } = useNativeD1({ rejectBatch: true });

    await expect(restoreBackup({
      backup,
      backup_digest: await createBackupDigest(backup),
      state_digest: await createStateDigest(inventory),
      confirm_overwrite: true,
    })).resolves.toEqual({ ok: false, code: "restore_failed" });
    expect(binding.batch).toHaveBeenCalledTimes(1);
  });

  it("returns a typed failure when a valid backup row cannot fit one JSON1 chunk", async () => {
    const backup = makeLargeValidBackup({
      references: 1,
      syntheses: 0,
      relations: 0,
    });
    backup.data.references[0] = {
      ...backup.data.references[0],
      style_tags: ["x".repeat(MAX_D1_JSON_CHUNK_BYTES + 1)],
    };
    configureBackupReadDb({ references: [], syntheses: [], relations: [] });

    await expect(restoreBackup({
      backup,
      backup_digest: await createBackupDigest(backup),
      state_digest: await createStateDigest({
        references: [],
        syntheses: [],
        relations: [],
      }),
      confirm_overwrite: false,
    })).resolves.toEqual({ ok: false, code: "restore_failed" });
    expect(getD1Binding).not.toHaveBeenCalled();
  });
});
