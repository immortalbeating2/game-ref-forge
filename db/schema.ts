import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const references = sqliteTable("references", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  sourceUrl: text("source_url").notNull(),
  canonicalUrl: text("canonical_url"),
  siteName: text("site_name"),
  author: text("author"),
  previewUrl: text("preview_url"),
  mediaType: text("media_type").notNull(),
  assetCategory: text("asset_category").notNull(),
  sourceCategory: text("source_category"),
  styleTags: text("style_tags").notNull().default("[]"),
  useTags: text("use_tags").notNull().default("[]"),
  licenseStatus: text("license_status").notNull(),
  attributionText: text("attribution_text"),
  publicStatus: text("public_status").notNull(),
  rating: integer("rating"),
  inspirationPoints: text("inspiration_points").notNull().default("[]"),
  deconstructionNotes: text("deconstruction_notes"),
  transformationIdeas: text("transformation_ideas"),
  avoidCopyingNotes: text("avoid_copying_notes"),
  relatedOriginalAsset: text("related_original_asset"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

