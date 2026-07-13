import { afterEach, describe, expect, it, vi } from "vitest";
import type { SQLWrapper } from "drizzle-orm";
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core";

vi.mock("../db", () => ({ getDb: vi.fn() }));

import { getDb } from "../db";
import { references, synthesisReferences, syntheses } from "../db/schema";
import type { ReferenceRecord } from "../lib/reference";
import {
  createSynthesis,
  deleteSynthesis,
  getSynthesis,
  listSyntheses,
  refreshSynthesisReference,
  updateSynthesis,
} from "../lib/synthesis-db";
import {
  createReferenceSnapshot,
  type SynthesisInput,
  type SynthesisReferenceSnapshot,
  type SynthesisStatus,
} from "../lib/synthesis";

type QueryOperation = { name: string; args: unknown[] };
type FakeQuery = PromiseLike<unknown[]> & { operations: QueryOperation[] };
type StatementKind = "insert" | "update" | "delete";

const sqliteDialect = new SQLiteSyncDialect();

type FakeStatement = {
  kind: StatementKind;
  table: unknown;
  payload?: unknown;
  whereClause?: unknown;
  returningShape?: unknown;
  values(value: unknown): FakeStatement;
  set(value: unknown): FakeStatement;
  where(value: unknown): FakeStatement;
  returning(shape?: unknown): Promise<unknown[]>;
};

function compileExpression(expression: unknown) {
  const { sql, params } = sqliteDialect.sqlToQuery((expression as SQLWrapper).getSQL());
  return { sql, params };
}

function findOperation(query: FakeQuery, name: string) {
  const operation = query.operations.find((candidate) => candidate.name === name);
  expect(operation, `expected query operation ${name}`).toBeDefined();
  return operation!;
}

function makeQuery(result: unknown[], queries: FakeQuery[]) {
  const operations: QueryOperation[] = [];
  const builder: Record<string, unknown> = { operations };

  for (const name of ["from", "leftJoin", "groupBy", "orderBy", "where", "limit"]) {
    builder[name] = (...args: unknown[]) => {
      operations.push({ name, args });
      return builder;
    };
  }

  builder.then = (
    onFulfilled?: (value: unknown[]) => unknown,
    onRejected?: (reason: unknown) => unknown,
  ) => Promise.resolve(result).then(onFulfilled, onRejected);

  const query = builder as unknown as FakeQuery;
  queries.push(query);
  return query;
}

function makeStatement(
  kind: StatementKind,
  table: unknown,
  statements: FakeStatement[],
  returningResults: unknown[][],
) {
  const statement: FakeStatement = {
    kind,
    table,
    values(value) {
      statement.payload = value;
      return statement;
    },
    set(value) {
      statement.payload = value;
      return statement;
    },
    where(value) {
      statement.whereClause = value;
      return statement;
    },
    returning(shape) {
      statement.returningShape = shape;
      return Promise.resolve(returningResults.shift() ?? []);
    },
  };
  statements.push(statement);
  return statement;
}

function useFakeDb(options: {
  selectResults?: unknown[][];
  returningResults?: unknown[][];
} = {}) {
  const selectResults = [...(options.selectResults ?? [])];
  const returningResults = [...(options.returningResults ?? [])];
  const queries: FakeQuery[] = [];
  const statements: FakeStatement[] = [];
  const batches: FakeStatement[][] = [];
  const selections: unknown[] = [];

  const db = {
    select: vi.fn((selection?: unknown) => {
      selections.push(selection);
      return makeQuery(selectResults.shift() ?? [], queries);
    }),
    insert: vi.fn((table: unknown) => makeStatement("insert", table, statements, returningResults)),
    update: vi.fn((table: unknown) => makeStatement("update", table, statements, returningResults)),
    delete: vi.fn((table: unknown) => makeStatement("delete", table, statements, returningResults)),
    batch: vi.fn(async (batch: FakeStatement[]) => {
      batches.push(batch);
      return batch.map(() => ({ success: true }));
    }),
  };

  vi.mocked(getDb).mockReturnValue(db as never);
  return { batches, db, queries, selections, statements };
}

function makeReference(overrides: Partial<ReferenceRecord> = {}): ReferenceRecord {
  return {
    id: "ref-1",
    title: "Material Study",
    source_url: "https://example.com/material",
    canonical_url: null,
    site_name: "Example",
    author: "Author",
    preview_url: null,
    media_type: "image",
    asset_category: "material_texture",
    source_category: null,
    style_tags: ["aged"],
    use_tags: ["environment"],
    mechanic_tags: ["exploration"],
    mood_tags: ["grounded"],
    visual_language_tags: ["edge wear"],
    license_status: "private_reference",
    attribution_text: null,
    public_status: "private",
    quality_status: "analyzed",
    rating: 4,
    reference_value_score: 5,
    transformability_score: 4,
    copyright_risk_score: 2,
    production_readiness_score: 3,
    inspiration_points: ["Wear follows use"],
    inspiration_entries: [],
    deconstruction_notes: "Wear clusters near contact edges.",
    transformation_ideas: "Apply the rule to an original prop.",
    avoid_copying_notes: "Do not copy the source texture.",
    related_original_asset: null,
    created_at: "2026-07-13T00:00:00.000Z",
    updated_at: "2026-07-13T01:00:00.000Z",
    ...overrides,
  };
}

function toReferenceRow(record: ReferenceRecord): typeof references.$inferSelect {
  return {
    id: record.id,
    title: record.title,
    sourceUrl: record.source_url,
    canonicalUrl: record.canonical_url,
    siteName: record.site_name,
    author: record.author,
    previewUrl: record.preview_url,
    mediaType: record.media_type,
    assetCategory: record.asset_category,
    sourceCategory: record.source_category,
    styleTags: JSON.stringify(record.style_tags),
    useTags: JSON.stringify(record.use_tags),
    mechanicTags: JSON.stringify(record.mechanic_tags),
    moodTags: JSON.stringify(record.mood_tags),
    visualLanguageTags: JSON.stringify(record.visual_language_tags),
    licenseStatus: record.license_status,
    attributionText: record.attribution_text,
    publicStatus: record.public_status,
    qualityStatus: record.quality_status,
    rating: record.rating,
    referenceValueScore: record.reference_value_score,
    transformabilityScore: record.transformability_score,
    copyrightRiskScore: record.copyright_risk_score,
    productionReadinessScore: record.production_readiness_score,
    inspirationPoints: JSON.stringify(record.inspiration_points),
    inspirationEntries: JSON.stringify(record.inspiration_entries),
    deconstructionNotes: record.deconstruction_notes,
    transformationIdeas: record.transformation_ideas,
    avoidCopyingNotes: record.avoid_copying_notes,
    relatedOriginalAsset: record.related_original_asset,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function makeSynthesisRow(
  overrides: Partial<typeof syntheses.$inferSelect> = {},
): typeof syntheses.$inferSelect {
  return {
    id: "syn-1",
    title: "Material Direction",
    targetAsset: "Dungeon prop",
    sharedPrinciples: null,
    keyDifferences: null,
    originalDirection: null,
    avoidCopyingNotes: null,
    designConstraints: null,
    experimentPlan: null,
    nextActions: null,
    additionalNotes: null,
    status: "draft",
    createdAt: "2026-07-13T00:00:00.000Z",
    updatedAt: "2026-07-13T02:00:00.000Z",
    ...overrides,
  };
}

function makeRelationRow(
  snapshot: SynthesisReferenceSnapshot,
  overrides: Partial<typeof synthesisReferences.$inferSelect> = {},
): typeof synthesisReferences.$inferSelect {
  return {
    id: "link-1",
    synthesisId: "syn-1",
    referenceId: snapshot.reference_id,
    position: 0,
    snapshotJson: JSON.stringify(snapshot),
    snapshotUpdatedAt: "2026-07-13T02:00:00.000Z",
    ...overrides,
  };
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.mocked(getDb).mockReset();
});

describe("synthesis data access", () => {
  it("lists synthesis summaries in database order with a validated status filter", async () => {
    const fake = useFakeDb({
      selectResults: [[
        {
          id: "syn-new",
          title: "New",
          target_asset: "Prop",
          status: "draft",
          updated_at: "2026-07-13T03:00:00.000Z",
          reference_count: 3,
        },
        {
          id: "syn-old",
          title: "Old",
          target_asset: null,
          status: "draft",
          updated_at: "2026-07-13T01:00:00.000Z",
          reference_count: 2,
        },
      ]],
    });

    await expect(listSyntheses("draft")).resolves.toEqual([
      {
        id: "syn-new",
        title: "New",
        target_asset: "Prop",
        status: "draft",
        updated_at: "2026-07-13T03:00:00.000Z",
        reference_count: 3,
      },
      {
        id: "syn-old",
        title: "Old",
        target_asset: null,
        status: "draft",
        updated_at: "2026-07-13T01:00:00.000Z",
        reference_count: 2,
      },
    ]);
    const selection = fake.selections[0] as Record<string, unknown>;
    expect(compileExpression(selection.reference_count)).toEqual({
      sql: "count(\"synthesis_references\".\"id\")",
      params: [],
    });
    const listQuery = fake.queries[0];
    const join = findOperation(listQuery, "leftJoin");
    expect(join.args[0]).toBe(synthesisReferences);
    expect(compileExpression(join.args[1])).toEqual({
      sql: "\"syntheses\".\"id\" = \"synthesis_references\".\"synthesis_id\"",
      params: [],
    });
    expect(compileExpression(findOperation(listQuery, "groupBy").args[0])).toEqual({
      sql: "\"syntheses\".\"id\"",
      params: [],
    });
    expect(compileExpression(findOperation(listQuery, "orderBy").args[0])).toEqual({
      sql: "\"syntheses\".\"updated_at\" desc",
      params: [],
    });
    expect(compileExpression(findOperation(listQuery, "where").args[0])).toEqual({
      sql: "\"syntheses\".\"status\" = ?",
      params: ["draft"],
    });
  });

  it("rejects an invalid runtime list status without executing the query", async () => {
    const fake = useFakeDb({ selectResults: [[{ id: "unexpected" }]] });

    await expect(listSyntheses("invalid" as SynthesisStatus)).resolves.toEqual([]);
    expect(fake.queries[0].operations.some(({ name }) => name === "where")).toBe(false);
  });

  it("lists all synthesis summaries when no status filter is provided", async () => {
    const fake = useFakeDb({
      selectResults: [[{
        id: "syn-1",
        title: "All statuses",
        target_asset: null,
        status: "archived",
        updated_at: "2026-07-13T01:00:00.000Z",
        reference_count: 2,
      }]],
    });

    await expect(listSyntheses()).resolves.toEqual([{
      id: "syn-1",
      title: "All statuses",
      target_asset: null,
      status: "archived",
      updated_at: "2026-07-13T01:00:00.000Z",
      reference_count: 2,
    }]);
    expect(fake.queries[0].operations.some(({ name }) => name === "where")).toBe(false);
  });

  it("loads ordered reference links and derives current, stale, and unavailable states", async () => {
    const current = makeReference({ updated_at: "2026-07-13T03:00:00.000Z" });
    const oldSnapshot = createReferenceSnapshot(makeReference());
    const deletedSnapshot = createReferenceSnapshot(makeReference({ id: "ref-2", title: "Deleted" }));
    const first = makeRelationRow(oldSnapshot);
    const second = makeRelationRow(deletedSnapshot, {
      id: "link-2",
      referenceId: null,
      position: 1,
    });
    const fake = useFakeDb({
      selectResults: [
        [makeSynthesisRow()],
        [
          { relation: first, reference: toReferenceRow(current) },
          { relation: second, reference: null },
        ],
      ],
    });

    const detail = await getSynthesis("syn-1");

    expect(detail).toMatchObject({
      id: "syn-1",
      title: "Material Direction",
      created_at: "2026-07-13T00:00:00.000Z",
      references: [
        {
          id: "link-1",
          position: 0,
          reference_id: "ref-1",
          available: true,
          stale: true,
          snapshot: { reference_id: "ref-1", title: "Material Study" },
        },
        {
          id: "link-2",
          position: 1,
          reference_id: null,
          available: false,
          stale: false,
          snapshot: { reference_id: "ref-2", title: "Deleted" },
        },
      ],
    });
    const detailQuery = fake.queries[1];
    expect(compileExpression(findOperation(detailQuery, "where").args[0])).toEqual({
      sql: "\"synthesis_references\".\"synthesis_id\" = ?",
      params: ["syn-1"],
    });
    expect(compileExpression(findOperation(detailQuery, "orderBy").args[0])).toEqual({
      sql: "\"synthesis_references\".\"position\"",
      params: [],
    });
  });

  it("returns null when a synthesis does not exist", async () => {
    useFakeDb({ selectResults: [[]] });

    await expect(getSynthesis("missing")).resolves.toBeNull();
  });

  it("reports missing references without writing", async () => {
    const found = makeReference({ id: "ref-2", title: "Second" });
    const fake = useFakeDb({ selectResults: [[toReferenceRow(found)]] });

    await expect(createSynthesis({
      title: "Study",
      status: "draft",
      reference_ids: ["ref-2", "ref-1"],
    })).resolves.toEqual({
      ok: false,
      code: "reference_not_found",
      reference_ids: ["ref-1"],
    });
    expect(fake.batches).toEqual([]);
    expect(fake.statements).toEqual([]);
  });

  it("creates snapshots in requested order with exactly two batch statements", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-13T04:00:00.000Z"));
    const synthesisId = "00000000-0000-4000-8000-000000000001";
    const firstLinkId = "00000000-0000-4000-8000-000000000002";
    const secondLinkId = "00000000-0000-4000-8000-000000000003";
    vi.spyOn(crypto, "randomUUID")
      .mockReturnValueOnce(synthesisId)
      .mockReturnValueOnce(firstLinkId)
      .mockReturnValueOnce(secondLinkId);
    const ref1 = makeReference();
    const ref2 = makeReference({ id: "ref-2", title: "Second" });
    const synRow = makeSynthesisRow({
      id: synthesisId,
      title: "Study",
      targetAsset: "Prop",
      createdAt: "2026-07-13T04:00:00.000Z",
      updatedAt: "2026-07-13T04:00:00.000Z",
    });
    const ref2Snapshot = createReferenceSnapshot(ref2);
    const ref1Snapshot = createReferenceSnapshot(ref1);
    const relationRows = [
      makeRelationRow(ref2Snapshot, {
        id: firstLinkId,
        synthesisId,
        position: 0,
        snapshotUpdatedAt: "2026-07-13T04:00:00.000Z",
      }),
      makeRelationRow(ref1Snapshot, {
        id: secondLinkId,
        synthesisId,
        position: 1,
        snapshotUpdatedAt: "2026-07-13T04:00:00.000Z",
      }),
    ];
    const fake = useFakeDb({
      selectResults: [
        [toReferenceRow(ref1), toReferenceRow(ref2)],
        [synRow],
        [
          { relation: relationRows[0], reference: toReferenceRow(ref2) },
          { relation: relationRows[1], reference: toReferenceRow(ref1) },
        ],
      ],
    });

    const result = await createSynthesis({
      title: "  Study  ",
      target_asset: "  Prop  ",
      status: "draft",
      reference_ids: ["ref-2", "ref-1"],
    });

    expect(result).toMatchObject({
      ok: true,
      synthesis: {
        id: synthesisId,
        title: "Study",
        references: [
          { id: firstLinkId, position: 0, snapshot: { reference_id: "ref-2", title: "Second" } },
          { id: secondLinkId, position: 1, snapshot: { reference_id: "ref-1", title: "Material Study" } },
        ],
      },
    });
    expect(fake.batches).toHaveLength(1);
    const [mainInsert, relationInsert] = fake.batches[0];
    expect(fake.batches[0]).toHaveLength(2);
    expect(mainInsert.table).toBe(syntheses);
    expect(mainInsert).toMatchObject({
      kind: "insert",
      payload: {
        id: synthesisId,
        title: "Study",
        targetAsset: "Prop",
        status: "draft",
        createdAt: "2026-07-13T04:00:00.000Z",
        updatedAt: "2026-07-13T04:00:00.000Z",
      },
    });
    expect(relationInsert.table).toBe(synthesisReferences);
    expect(relationInsert.kind).toBe("insert");
    const insertedRelations = relationInsert.payload as Array<Record<string, unknown>>;
    expect(insertedRelations.map(({ id, synthesisId: owner, referenceId, position, snapshotUpdatedAt }) => ({
      id,
      synthesisId: owner,
      referenceId,
      position,
      snapshotUpdatedAt,
    }))).toEqual([
      {
        id: firstLinkId,
        synthesisId,
        referenceId: "ref-2",
        position: 0,
        snapshotUpdatedAt: "2026-07-13T04:00:00.000Z",
      },
      {
        id: secondLinkId,
        synthesisId,
        referenceId: "ref-1",
        position: 1,
        snapshotUpdatedAt: "2026-07-13T04:00:00.000Z",
      },
    ]);
    expect(insertedRelations.map(({ snapshotJson }) => {
      const snapshot = JSON.parse(snapshotJson as string) as SynthesisReferenceSnapshot;
      return { reference_id: snapshot.reference_id, title: snapshot.title };
    })).toEqual([
      { reference_id: "ref-2", title: "Second" },
      { reference_id: "ref-1", title: "Material Study" },
    ]);
  });

  it("updates only synthesis fields and preserves the fixed relation set", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-13T05:00:00.000Z"));
    const reference = makeReference();
    const snapshot = createReferenceSnapshot(reference);
    const relation = makeRelationRow(snapshot);
    const updatedRow = makeSynthesisRow({
      title: "Updated",
      targetAsset: "New Prop",
      status: "actionable",
      updatedAt: "2026-07-13T05:00:00.000Z",
    });
    const fake = useFakeDb({
      returningResults: [[updatedRow]],
      selectResults: [
        [updatedRow],
        [{ relation, reference: toReferenceRow(reference) }],
      ],
    });
    const input = {
      title: "  Updated  ",
      target_asset: "  New Prop  ",
      status: "actionable",
      reference_ids: ["ref-3"],
      snapshot_json: "client value",
      position: 99,
      created_at: "client value",
    } as SynthesisInput & Record<string, unknown>;

    const result = await updateSynthesis("syn-1", input);

    expect(result).toMatchObject({
      ok: true,
      synthesis: {
        id: "syn-1",
        title: "Updated",
        created_at: "2026-07-13T00:00:00.000Z",
        references: [{ id: "link-1", reference_id: "ref-1", position: 0 }],
      },
    });
    const update = fake.statements[0];
    expect(update.table).toBe(syntheses);
    expect(update.payload).toEqual({
      title: "Updated",
      targetAsset: "New Prop",
      sharedPrinciples: null,
      keyDifferences: null,
      originalDirection: null,
      avoidCopyingNotes: null,
      designConstraints: null,
      experimentPlan: null,
      nextActions: null,
      additionalNotes: null,
      status: "actionable",
      updatedAt: "2026-07-13T05:00:00.000Z",
    });
    expect(compileExpression(update.whereClause)).toEqual({
      sql: "\"syntheses\".\"id\" = ?",
      params: ["syn-1"],
    });
    expect(fake.batches).toEqual([]);
    expect(fake.statements).toHaveLength(1);
  });

  it("returns not_found when the synthesis update changes no row", async () => {
    useFakeDb({ returningResults: [[]] });

    await expect(updateSynthesis("missing", {
      title: "Missing",
      status: "draft",
    })).resolves.toEqual({ ok: false, code: "not_found" });
  });

  it("distinguishes a missing relation from an unavailable current reference", async () => {
    const relation = makeRelationRow(createReferenceSnapshot(makeReference()), { referenceId: null });
    const missing = useFakeDb({ selectResults: [[]] });
    await expect(refreshSynthesisReference("syn-1", "missing")).resolves.toEqual({
      ok: false,
      code: "relation_not_found",
    });
    expect(missing.batches).toEqual([]);

    const unavailable = useFakeDb({
      selectResults: [[{ relation, reference: null }]],
    });
    await expect(refreshSynthesisReference("syn-1", "link-1")).resolves.toEqual({
      ok: false,
      code: "reference_unavailable",
    });
    expect(unavailable.batches).toEqual([]);
  });

  it("refreshes the server snapshot and synthesis timestamp in exactly two batch statements", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-13T06:00:00.000Z"));
    const current = makeReference({
      title: "Current title",
      updated_at: "2026-07-13T05:30:00.000Z",
    });
    const oldSnapshot = createReferenceSnapshot(makeReference({ title: "Old title" }));
    const relation = makeRelationRow(oldSnapshot);
    const refreshedSnapshot = createReferenceSnapshot(current);
    const refreshedRelation = makeRelationRow(refreshedSnapshot, {
      snapshotUpdatedAt: "2026-07-13T06:00:00.000Z",
    });
    const updatedRow = makeSynthesisRow({ updatedAt: "2026-07-13T06:00:00.000Z" });
    const fake = useFakeDb({
      selectResults: [
        [{ relation, reference: toReferenceRow(current) }],
        [updatedRow],
        [{ relation: refreshedRelation, reference: toReferenceRow(current) }],
      ],
    });

    const result = await refreshSynthesisReference("syn-1", "link-1");

    expect(result).toMatchObject({
      ok: true,
      synthesis: {
        id: "syn-1",
        updated_at: "2026-07-13T06:00:00.000Z",
        references: [{
          id: "link-1",
          available: true,
          stale: false,
          snapshot_updated_at: "2026-07-13T06:00:00.000Z",
          snapshot: { title: "Current title", reference_updated_at: "2026-07-13T05:30:00.000Z" },
        }],
      },
    });
    expect(compileExpression(findOperation(fake.queries[0], "where").args[0])).toEqual({
      sql: "(\"synthesis_references\".\"synthesis_id\" = ? and \"synthesis_references\".\"id\" = ?)",
      params: ["syn-1", "link-1"],
    });
    expect(fake.batches).toHaveLength(1);
    const [relationUpdate, synthesisUpdate] = fake.batches[0];
    expect(fake.batches[0]).toHaveLength(2);
    expect(relationUpdate.table).toBe(synthesisReferences);
    expect(relationUpdate.kind).toBe("update");
    expect(relationUpdate.payload).toMatchObject({
      snapshotUpdatedAt: "2026-07-13T06:00:00.000Z",
    });
    expect(JSON.parse((relationUpdate.payload as { snapshotJson: string }).snapshotJson)).toEqual(refreshedSnapshot);
    expect(compileExpression(relationUpdate.whereClause)).toEqual({
      sql: "\"synthesis_references\".\"id\" = ?",
      params: ["link-1"],
    });
    expect(synthesisUpdate.table).toBe(syntheses);
    expect(synthesisUpdate).toMatchObject({
      kind: "update",
      payload: { updatedAt: "2026-07-13T06:00:00.000Z" },
    });
    expect(compileExpression(synthesisUpdate.whereClause)).toEqual({
      sql: "\"syntheses\".\"id\" = ?",
      params: ["syn-1"],
    });
  });

  it.each([
    { returned: [{ id: "syn-1" }], expected: true },
    { returned: [], expected: false },
  ])("returns $expected when delete returning rows are $returned", async ({ returned, expected }) => {
    const fake = useFakeDb({ returningResults: [returned] });

    await expect(deleteSynthesis("syn-1")).resolves.toBe(expected);
    expect(fake.statements[0].table).toBe(syntheses);
    expect(fake.statements[0]).toMatchObject({ kind: "delete" });
    expect(compileExpression(fake.statements[0].whereClause)).toEqual({
      sql: "\"syntheses\".\"id\" = ?",
      params: ["syn-1"],
    });
  });
});
