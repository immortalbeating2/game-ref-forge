import { and, count, desc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "../db";
import { references, synthesisReferences, syntheses } from "../db/schema";
import { referenceRowToRecord } from "./reference-db";
import {
  createReferenceSnapshot,
  createSynthesisRecord,
  deriveSnapshotState,
  parseReferenceSnapshot,
  SYNTHESIS_STATUSES,
  type CreateSynthesisInput,
  type SynthesisDetail,
  type SynthesisInput,
  type SynthesisRecord,
  type SynthesisStatus,
  type SynthesisSummary,
  validateCreateSynthesisInput,
  validateSynthesisInput,
} from "./synthesis";

export type SynthesisMutationResult =
  | { ok: true; synthesis: SynthesisDetail }
  | { ok: false; code: "validation"; errors: string[] }
  | { ok: false; code: "not_found" }
  | { ok: false; code: "reference_not_found"; reference_ids: string[] };

export type SynthesisRefreshResult =
  | { ok: true; synthesis: SynthesisDetail }
  | { ok: false; code: "relation_not_found" }
  | { ok: false; code: "reference_unavailable" };

type SynthesisRow = typeof syntheses.$inferSelect;

export function synthesisRowToRecord(row: SynthesisRow): SynthesisRecord {
  return {
    id: row.id,
    title: row.title,
    target_asset: row.targetAsset,
    shared_principles: row.sharedPrinciples,
    key_differences: row.keyDifferences,
    original_direction: row.originalDirection,
    avoid_copying_notes: row.avoidCopyingNotes,
    design_constraints: row.designConstraints,
    experiment_plan: row.experimentPlan,
    next_actions: row.nextActions,
    additional_notes: row.additionalNotes,
    status: row.status as SynthesisStatus,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

export function synthesisRecordToRow(record: SynthesisRecord): typeof syntheses.$inferInsert {
  return synthesisRecordToStorageRow(record);
}

export function synthesisRecordToStorageRow(record: SynthesisRecord): typeof syntheses.$inferInsert {
  return {
    id: record.id,
    title: record.title,
    targetAsset: record.target_asset,
    sharedPrinciples: record.shared_principles,
    keyDifferences: record.key_differences,
    originalDirection: record.original_direction,
    avoidCopyingNotes: record.avoid_copying_notes,
    designConstraints: record.design_constraints,
    experimentPlan: record.experiment_plan,
    nextActions: record.next_actions,
    additionalNotes: record.additional_notes,
    status: record.status,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function recordToSynthesisUpdate(record: SynthesisRecord) {
  const row = synthesisRecordToRow(record);
  return {
    title: row.title,
    targetAsset: row.targetAsset,
    sharedPrinciples: row.sharedPrinciples,
    keyDifferences: row.keyDifferences,
    originalDirection: row.originalDirection,
    avoidCopyingNotes: row.avoidCopyingNotes,
    designConstraints: row.designConstraints,
    experimentPlan: row.experimentPlan,
    nextActions: row.nextActions,
    additionalNotes: row.additionalNotes,
    status: row.status,
    updatedAt: row.updatedAt,
  };
}

function isSynthesisStatus(value: unknown): value is SynthesisStatus {
  return typeof value === "string" && SYNTHESIS_STATUSES.includes(value as SynthesisStatus);
}

export async function listSyntheses(status?: SynthesisStatus): Promise<SynthesisSummary[]> {
  const db = getDb();
  const query = db
    .select({
      id: syntheses.id,
      title: syntheses.title,
      target_asset: syntheses.targetAsset,
      status: syntheses.status,
      updated_at: syntheses.updatedAt,
      reference_count: count(synthesisReferences.id),
    })
    .from(syntheses)
    .leftJoin(synthesisReferences, eq(syntheses.id, synthesisReferences.synthesisId))
    .groupBy(syntheses.id)
    .orderBy(desc(syntheses.updatedAt));

  const rows = status === undefined
    ? await query
    : isSynthesisStatus(status)
      ? await query.where(eq(syntheses.status, status))
      : [];

  return rows.map((row) => ({
    ...row,
    status: row.status as SynthesisStatus,
    reference_count: Number(row.reference_count),
  }));
}

export async function getSynthesis(id: string): Promise<SynthesisDetail | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(syntheses)
    .where(eq(syntheses.id, id))
    .limit(1);

  if (!row) return null;

  const links = await db
    .select({ relation: synthesisReferences, reference: references })
    .from(synthesisReferences)
    .leftJoin(references, eq(synthesisReferences.referenceId, references.id))
    .where(eq(synthesisReferences.synthesisId, id))
    .orderBy(synthesisReferences.position);

  return {
    ...synthesisRowToRecord(row),
    references: links.map(({ relation, reference }) => {
      const current = reference === null ? null : referenceRowToRecord(reference);
      const snapshot = parseReferenceSnapshot(
        relation.snapshotJson,
        relation.referenceId ?? "unavailable",
      );
      const state = deriveSnapshotState(snapshot, current?.updated_at ?? null, current !== null);

      return {
        id: relation.id,
        synthesis_id: relation.synthesisId,
        reference_id: relation.referenceId,
        position: relation.position,
        snapshot,
        snapshot_updated_at: relation.snapshotUpdatedAt,
        ...state,
      };
    }),
  };
}

export async function createSynthesis(input: CreateSynthesisInput): Promise<SynthesisMutationResult> {
  const validation = validateCreateSynthesisInput(input);
  if (!validation.ok) return { ok: false, code: "validation", errors: validation.errors };

  const referenceIds = input.reference_ids.map((id) => id.trim());
  const selectedRows = await getDb()
    .select()
    .from(references)
    .where(inArray(references.id, referenceIds));
  const selectedById = new Map(selectedRows.map((row) => {
    const record = referenceRowToRecord(row);
    return [record.id, record];
  }));
  const missingIds = referenceIds.filter((id) => !selectedById.has(id));

  if (missingIds.length > 0) {
    return { ok: false, code: "reference_not_found", reference_ids: missingIds };
  }

  const now = new Date().toISOString();
  const record = createSynthesisRecord(input, now);
  const relationRows = referenceIds.map((referenceId, position) => ({
    id: crypto.randomUUID(),
    synthesisId: record.id,
    referenceId,
    position,
    snapshotJson: JSON.stringify(createReferenceSnapshot(selectedById.get(referenceId)!)),
    snapshotUpdatedAt: now,
  }));
  const db = getDb();
  try {
    await db.batch([
      db.insert(syntheses).values(synthesisRecordToRow(record)),
      db.insert(synthesisReferences).values(relationRows),
    ]);
  } catch (error) {
    const remainingReferences = await db
      .select({ id: references.id })
      .from(references)
      .where(inArray(references.id, referenceIds));
    const remainingIds = new Set(remainingReferences.map(({ id }) => id));
    const missingAfterFailure = referenceIds.filter((id) => !remainingIds.has(id));

    if (missingAfterFailure.length > 0) {
      return {
        ok: false,
        code: "reference_not_found",
        reference_ids: missingAfterFailure,
      };
    }
    throw error;
  }

  const synthesis = await getSynthesis(record.id);
  if (!synthesis) throw new Error("created synthesis was not found");
  return { ok: true, synthesis };
}

export async function updateSynthesis(id: string, input: SynthesisInput): Promise<SynthesisMutationResult> {
  const validation = validateSynthesisInput(input);
  if (!validation.ok) return { ok: false, code: "validation", errors: validation.errors };

  const next = createSynthesisRecord(input, new Date().toISOString());
  const [updated] = await getDb()
    .update(syntheses)
    .set(recordToSynthesisUpdate(next))
    .where(eq(syntheses.id, id))
    .returning();

  if (!updated) return { ok: false, code: "not_found" };

  const synthesis = await getSynthesis(id);
  if (!synthesis) throw new Error("updated synthesis was not found");
  return { ok: true, synthesis };
}

export async function deleteSynthesis(id: string): Promise<boolean> {
  const deleted = await getDb()
    .delete(syntheses)
    .where(eq(syntheses.id, id))
    .returning({ id: syntheses.id });

  return deleted.length > 0;
}

export function buildRefreshRelationCasCondition(input: {
  synthesisId: string;
  relationId: string;
  referenceId: string;
  previousSnapshotJson: string;
  previousSnapshotUpdatedAt: string;
  referenceUpdatedAt: string;
}) {
  return and(
    eq(synthesisReferences.synthesisId, input.synthesisId),
    eq(synthesisReferences.id, input.relationId),
    eq(synthesisReferences.referenceId, input.referenceId),
    eq(synthesisReferences.snapshotJson, input.previousSnapshotJson),
    eq(synthesisReferences.snapshotUpdatedAt, input.previousSnapshotUpdatedAt),
    sql`exists (select 1 from ${references} where ${references.id} = ${input.referenceId} and ${references.updatedAt} = ${input.referenceUpdatedAt})`,
  )!;
}

export function buildRefreshSynthesisCasCondition(input: {
  synthesisId: string;
  relationId: string;
  referenceId: string;
  snapshotJson: string;
  snapshotUpdatedAt: string;
}) {
  return and(
    eq(syntheses.id, input.synthesisId),
    sql`exists (select 1 from ${synthesisReferences} where ${synthesisReferences.synthesisId} = ${input.synthesisId} and ${synthesisReferences.id} = ${input.relationId} and ${synthesisReferences.referenceId} = ${input.referenceId} and ${synthesisReferences.snapshotJson} = ${input.snapshotJson} and ${synthesisReferences.snapshotUpdatedAt} = ${input.snapshotUpdatedAt})`,
  )!;
}

export async function refreshSynthesisReference(
  synthesisId: string,
  relationId: string,
): Promise<SynthesisRefreshResult> {
  const db = getDb();
  const loadTarget = async () => {
    const [target] = await db
      .select({ relation: synthesisReferences, reference: references })
      .from(synthesisReferences)
      .leftJoin(references, eq(synthesisReferences.referenceId, references.id))
      .where(and(
        eq(synthesisReferences.synthesisId, synthesisId),
        eq(synthesisReferences.id, relationId),
      ))
      .limit(1);
    return target;
  };

  let link = await loadTarget();
  if (!link) return { ok: false, code: "relation_not_found" };
  if (link.reference === null || link.relation.referenceId === null) {
    return { ok: false, code: "reference_unavailable" };
  }
  const originalReferenceId = link.relation.referenceId;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (link.relation.referenceId !== originalReferenceId) {
      return { ok: false, code: "relation_not_found" };
    }
    if (link.reference === null) {
      return { ok: false, code: "reference_unavailable" };
    }

    const currentReference = referenceRowToRecord(link.reference);
    const now = new Date().toISOString();
    const snapshot = createReferenceSnapshot(currentReference);
    const snapshotJson = JSON.stringify(snapshot);
    const [updatedRelations, updatedSyntheses] = await db.batch([
      db
        .update(synthesisReferences)
        .set({ snapshotJson, snapshotUpdatedAt: now })
        .where(buildRefreshRelationCasCondition({
          synthesisId,
          relationId,
          referenceId: originalReferenceId,
          previousSnapshotJson: link.relation.snapshotJson,
          previousSnapshotUpdatedAt: link.relation.snapshotUpdatedAt,
          referenceUpdatedAt: currentReference.updated_at,
        }))
        .returning({ id: synthesisReferences.id }),
      db
        .update(syntheses)
        .set({ updatedAt: now })
        .where(buildRefreshSynthesisCasCondition({
          synthesisId,
          relationId,
          referenceId: originalReferenceId,
          snapshotJson,
          snapshotUpdatedAt: now,
        }))
        .returning({ id: syntheses.id }),
    ]);

    if (updatedRelations.length > 0) {
      if (updatedSyntheses.length === 0) {
        throw new Error("synthesis timestamp was not updated with refreshed snapshot");
      }
      const synthesis = await getSynthesis(synthesisId);
      if (!synthesis) throw new Error("refreshed synthesis was not found");
      return { ok: true, synthesis };
    }

    link = await loadTarget();
    if (!link) return { ok: false, code: "relation_not_found" };
    if (link.relation.referenceId === null || link.reference === null) {
      return { ok: false, code: "reference_unavailable" };
    }
    if (link.relation.referenceId !== originalReferenceId) {
      return { ok: false, code: "relation_not_found" };
    }

    const storedSnapshot = parseReferenceSnapshot(link.relation.snapshotJson);
    if (
      storedSnapshot?.reference_id === originalReferenceId &&
      storedSnapshot.reference_updated_at === link.reference.updatedAt
    ) {
      const synthesis = await getSynthesis(synthesisId);
      if (!synthesis) throw new Error("refreshed synthesis was not found");
      return { ok: true, synthesis };
    }
  }

  throw new Error("snapshot refresh could not settle on the latest reference version");
}
