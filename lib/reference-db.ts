import { desc, eq } from "drizzle-orm";
import { getDb } from "../db";
import { references } from "../db/schema";
import {
  createReferenceRecord,
  parseJsonArray,
  ReferenceInput,
  ReferenceRecord,
  serializeJsonArray,
  validateReferenceInput,
} from "./reference";

type ReferenceRow = typeof references.$inferSelect;

function rowToRecord(row: ReferenceRow): ReferenceRecord {
  return {
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
    style_tags: parseJsonArray(row.styleTags),
    use_tags: parseJsonArray(row.useTags),
    license_status: row.licenseStatus as ReferenceRecord["license_status"],
    attribution_text: row.attributionText,
    public_status: row.publicStatus as ReferenceRecord["public_status"],
    rating: row.rating,
    inspiration_points: parseJsonArray(row.inspirationPoints),
    deconstruction_notes: row.deconstructionNotes,
    transformation_ideas: row.transformationIdeas,
    avoid_copying_notes: row.avoidCopyingNotes,
    related_original_asset: row.relatedOriginalAsset,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

function recordToRow(record: ReferenceRecord): typeof references.$inferInsert {
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
    styleTags: serializeJsonArray(record.style_tags),
    useTags: serializeJsonArray(record.use_tags),
    licenseStatus: record.license_status,
    attributionText: record.attribution_text,
    publicStatus: record.public_status,
    rating: record.rating,
    inspirationPoints: serializeJsonArray(record.inspiration_points),
    deconstructionNotes: record.deconstruction_notes,
    transformationIdeas: record.transformation_ideas,
    avoidCopyingNotes: record.avoid_copying_notes,
    relatedOriginalAsset: record.related_original_asset,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

export async function listReferences() {
  const rows = await getDb()
    .select()
    .from(references)
    .orderBy(desc(references.updatedAt), desc(references.createdAt));
  return rows.map(rowToRecord);
}

export async function createReference(input: ReferenceInput) {
  const validation = validateReferenceInput(input);
  if (!validation.ok) {
    return validation;
  }

  const record = createReferenceRecord(input);
  const [row] = await getDb()
    .insert(references)
    .values(recordToRow(record))
    .returning();

  return { ok: true as const, reference: rowToRecord(row) };
}

export async function updateReference(id: string, input: ReferenceInput) {
  const validation = validateReferenceInput(input);
  if (!validation.ok) {
    return validation;
  }

  const current = await getDb()
    .select()
    .from(references)
    .where(eq(references.id, id))
    .limit(1);

  if (!current[0]) {
    return { ok: false as const, errors: ["reference not found"] };
  }

  const next = {
    ...createReferenceRecord(input),
    id,
    created_at: current[0].createdAt,
    updated_at: new Date().toISOString(),
  };

  const [row] = await getDb()
    .update(references)
    .set(recordToRow(next))
    .where(eq(references.id, id))
    .returning();

  return { ok: true as const, reference: rowToRecord(row) };
}

export async function deleteReference(id: string) {
  const deleted = await getDb()
    .delete(references)
    .where(eq(references.id, id))
    .returning({ id: references.id });

  return deleted.length > 0;
}

