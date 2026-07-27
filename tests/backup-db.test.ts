import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../db", () => ({ getDb: vi.fn() }));

import { getDb } from "../db";
import { references, synthesisReferences, syntheses } from "../db/schema";
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
  createFullBackup,
  previewBackup,
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

function useBackupReadDb(rows: ReadRows) {
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

afterEach(() => {
  vi.resetAllMocks();
});

describe("backup database reads", () => {
  it("exports all tables in stable id order with structured snapshots", async () => {
    const rows = completeRows();
    useBackupReadDb({
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
    useBackupReadDb({
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
    useBackupReadDb({
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
    useBackupReadDb({
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
    useBackupReadDb({
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
    useBackupReadDb(mutate(completeRows()));

    await expect(previewBackup(makeBackupFixture())).rejects.toBeInstanceOf(BackupStoredDataError);
  });

  it("reports creates, overwrites, preserves and relations without writing", async () => {
    const backup = makeBackupFixture();
    const fakeDb = useBackupReadDb(previewRowsWithPreservedData());

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
    useBackupReadDb({
      references: [...rows.references].reverse(),
      syntheses: rows.syntheses,
      relations: [...rows.relations].reverse(),
    });
    const unorderedDigest = (await previewBackup(backup)).state_digest;

    useBackupReadDb(rows);
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

    for (const [_fieldFamily, mutate] of variants) {
      useBackupReadDb(mutate(rows));
      await expect(previewBackup(backup)).resolves.not.toMatchObject({ state_digest: unorderedDigest });
    }
  });

  it("keeps a valid inspiration entry id unchanged across repeated state digests", async () => {
    const backup = makeBackupFixture();
    const rows = completeRows();
    useBackupReadDb(rows);
    const first = await previewBackup(backup);

    useBackupReadDb(rows);
    const second = await previewBackup(backup);

    expect(second.state_digest).toBe(first.state_digest);
  });
});
