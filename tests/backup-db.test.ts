import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../db", () => ({ getDb: vi.fn() }));

import { getDb } from "../db";
import { references, synthesisReferences, syntheses } from "../db/schema";
import { referenceRecordToRow } from "../lib/reference-db";
import { synthesisRecordToRow } from "../lib/synthesis-db";
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

function makeFakeQuery(rows: unknown[]): FakeQuery {
  const query = {
    from: () => query,
    orderBy: () => query,
    then<TResult1 = unknown[], TResult2 = never>(
      onFulfilled?: ((value: unknown[]) => TResult1 | PromiseLike<TResult1>) | null,
      onRejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
    ): PromiseLike<TResult1 | TResult2> {
      return Promise.resolve(rows).then(onFulfilled, onRejected);
    },
  };
  return query;
}

function useBackupReadDb(rows: ReadRows) {
  const selectResults = [rows.references, rows.syntheses, rows.relations];
  const db = {
    select: vi.fn(() => makeFakeQuery(selectResults.shift() ?? [])),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    batch: vi.fn(),
  };
  vi.mocked(getDb).mockReturnValue(db as never);
  return db;
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
    expect(fakeDb.batch).not.toHaveBeenCalled();
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

    const variants: ReadRows[] = [
      { ...rows, references: [toReferenceRow(makeReference({ title: "Changed" })), rows.references[1]] },
      { ...rows, syntheses: [toSynthesisRow(makeSynthesis({ updated_at: "2026-07-27T01:00:00.000Z" }))] },
      { ...rows, relations: [{ ...rows.relations[0], id: "link-1-changed" }, rows.relations[1]] },
      {
        ...rows,
        relations: [
          makeRelationRow(createReferenceSnapshot(makeReference({ title: "Changed snapshot" }))),
          rows.relations[1],
        ],
      },
    ];

    for (const variant of variants) {
      useBackupReadDb(variant);
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
