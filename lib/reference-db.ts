import { desc, eq } from "drizzle-orm";
import { getDb } from "../db";
import { references } from "../db/schema";
import {
  createReferenceRecord,
  parseInspirationEntries,
  parseJsonArray,
  ReferenceInput,
  ReferenceRecord,
  serializeInspirationEntries,
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
    mechanic_tags: parseJsonArray(row.mechanicTags),
    mood_tags: parseJsonArray(row.moodTags),
    visual_language_tags: parseJsonArray(row.visualLanguageTags),
    license_status: row.licenseStatus as ReferenceRecord["license_status"],
    attribution_text: row.attributionText,
    public_status: row.publicStatus as ReferenceRecord["public_status"],
    quality_status: row.qualityStatus as ReferenceRecord["quality_status"],
    rating: row.rating,
    reference_value_score: row.referenceValueScore,
    transformability_score: row.transformabilityScore,
    copyright_risk_score: row.copyrightRiskScore,
    production_readiness_score: row.productionReadinessScore,
    inspiration_points: parseJsonArray(row.inspirationPoints),
    inspiration_entries: parseInspirationEntries(row.inspirationEntries),
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
    mechanicTags: serializeJsonArray(record.mechanic_tags),
    moodTags: serializeJsonArray(record.mood_tags),
    visualLanguageTags: serializeJsonArray(record.visual_language_tags),
    licenseStatus: record.license_status,
    attributionText: record.attribution_text,
    publicStatus: record.public_status,
    qualityStatus: record.quality_status,
    rating: record.rating,
    referenceValueScore: record.reference_value_score,
    transformabilityScore: record.transformability_score,
    copyrightRiskScore: record.copyright_risk_score,
    productionReadinessScore: record.production_readiness_score,
    inspirationPoints: serializeJsonArray(record.inspiration_points),
    inspirationEntries: serializeInspirationEntries(record.inspiration_entries),
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

