import { describe, expect, it } from "vitest";
import {
  createEmptyReferenceDraft,
  draftToReferenceInput,
  inputToReferenceDraft,
  isReferenceDraftDirty,
  recordToReferenceDraft,
} from "../lib/reference-draft";
import { DEFAULT_REFERENCE_INPUT, ReferenceRecord } from "../lib/reference";

const record = {
  id: "edit-1",
  title: "Original Title",
  source_url: "https://example.com/original",
  canonical_url: "https://example.com/canonical",
  site_name: "Example",
  author: "Example Author",
  preview_url: null,
  media_type: "image",
  asset_category: "prop",
  source_category: "Reference site",
  style_tags: ["chunky", "bright"],
  use_tags: ["inventory"],
  mechanic_tags: ["crafting"],
  mood_tags: ["cozy"],
  visual_language_tags: ["chunky silhouette"],
  license_status: "private_reference",
  attribution_text: "Example attribution",
  public_status: "private",
  quality_status: "analyzed",
  rating: 4,
  reference_value_score: 5,
  transformability_score: 4,
  copyright_risk_score: 2,
  production_readiness_score: 3,
  inspiration_points: ["Readable silhouette", "Clear material break"],
  inspiration_entries: [
    {
      id: "entry-1",
      observation: "Large button shapes",
      principle: "Readable silhouettes improve quick scanning",
      transferable_idea: "Use chunky forms for important UI controls",
      original_application: "Apply to a forge inventory action bar",
      avoid_copying: "Do not copy exact icon shapes",
    },
  ],
  deconstruction_notes: "Strong shape language.",
  transformation_ideas: "Use the principle with original forms.",
  avoid_copying_notes: "Do not copy exact icon shape.",
  related_original_asset: "Inventory prop",
  created_at: "2026-06-17T00:00:00.000Z",
  updated_at: "2026-06-17T00:00:00.000Z",
} satisfies ReferenceRecord;

describe("reference draft helpers", () => {
  it("creates an empty draft from default input values", () => {
    expect(createEmptyReferenceDraft()).toEqual({
      title: "",
      source_url: "",
      canonical_url: "",
      site_name: "",
      author: "",
      preview_url: "",
      media_type: DEFAULT_REFERENCE_INPUT.media_type,
      asset_category: DEFAULT_REFERENCE_INPUT.asset_category,
      source_category: "",
      license_status: DEFAULT_REFERENCE_INPUT.license_status,
      attribution_text: "",
      public_status: DEFAULT_REFERENCE_INPUT.public_status,
      quality_status: DEFAULT_REFERENCE_INPUT.quality_status,
      rating: "",
      reference_value_score: "",
      transformability_score: "",
      copyright_risk_score: "",
      production_readiness_score: "",
      deconstruction_notes: "",
      transformation_ideas: "",
      avoid_copying_notes: "",
      related_original_asset: "",
      style_tags_text: "",
      use_tags_text: "",
      mechanic_tags_text: "",
      mood_tags_text: "",
      visual_language_tags_text: "",
      inspiration_points_text: "",
      inspiration_entries: [],
    });
  });

  it("converts records to editable text draft fields", () => {
    expect(recordToReferenceDraft(record)).toMatchObject({
      title: "Original Title",
      source_url: "https://example.com/original",
      canonical_url: "https://example.com/canonical",
      site_name: "Example",
      author: "Example Author",
      media_type: "image",
      asset_category: "prop",
      license_status: "private_reference",
      public_status: "private",
      quality_status: "analyzed",
      rating: "4",
      reference_value_score: "5",
      transformability_score: "4",
      copyright_risk_score: "2",
      production_readiness_score: "3",
      style_tags_text: "chunky, bright",
      use_tags_text: "inventory",
      mechanic_tags_text: "crafting",
      mood_tags_text: "cozy",
      visual_language_tags_text: "chunky silhouette",
      inspiration_points_text: "Readable silhouette, Clear material break",
      inspiration_entries: record.inspiration_entries,
    });
  });

  it("converts drafts back to normalized ReferenceInput", () => {
    const input = draftToReferenceInput({
      ...recordToReferenceDraft(record),
      style_tags_text: " chunky, bright, ",
      use_tags_text: " inventory, , crafting ",
      mechanic_tags_text: " crafting, inventory ",
      mood_tags_text: " cozy, focused ",
      visual_language_tags_text: " chunky silhouette, contrast ",
      inspiration_points_text: "Readable silhouette, Clear material break",
      rating: "5",
      reference_value_score: "4",
      transformability_score: "3",
      copyright_risk_score: "1",
      production_readiness_score: "2",
      inspiration_entries: [
        ...record.inspiration_entries,
        {
          id: "",
          observation: "",
          principle: "",
          transferable_idea: "",
          original_application: "",
          avoid_copying: "",
        },
      ],
    });

    expect(input).toMatchObject({
      title: "Original Title",
      source_url: "https://example.com/original",
      style_tags: ["chunky", "bright"],
      use_tags: ["inventory", "crafting"],
      mechanic_tags: ["crafting", "inventory"],
      mood_tags: ["cozy", "focused"],
      visual_language_tags: ["chunky silhouette", "contrast"],
      inspiration_points: ["Readable silhouette", "Clear material break"],
      rating: 5,
      reference_value_score: 4,
      transformability_score: 3,
      copyright_risk_score: 1,
      production_readiness_score: 2,
      inspiration_entries: record.inspiration_entries,
    });
  });

  it("converts blank draft rating values to null", () => {
    expect(draftToReferenceInput({ ...recordToReferenceDraft(record), rating: "" }).rating).toBeNull();
    expect(draftToReferenceInput({ ...recordToReferenceDraft(record), rating: "   " }).rating).toBeNull();
    expect(draftToReferenceInput({ ...recordToReferenceDraft(record), reference_value_score: "" }).reference_value_score).toBeNull();
    expect(draftToReferenceInput({ ...recordToReferenceDraft(record), transformability_score: "   " }).transformability_score).toBeNull();
  });

  it("detects changed and unchanged drafts", () => {
    const original = recordToReferenceDraft(record);
    expect(isReferenceDraftDirty(original, record)).toBe(false);
    expect(isReferenceDraftDirty({ ...original, title: "Changed" }, record)).toBe(true);
  });

  it("does not mark untouched records with comma-containing list items as dirty", () => {
    const recordWithComma = {
      ...record,
      inspiration_points: ["Strong shape, readable silhouette"],
    } satisfies ReferenceRecord;

    const draft = recordToReferenceDraft(recordWithComma);

    expect(isReferenceDraftDirty(draft, recordWithComma)).toBe(false);
  });

  it("does not expose runtime record fields on drafts", () => {
    const draft = recordToReferenceDraft(record);

    expect("id" in draft).toBe(false);
    expect("created_at" in draft).toBe(false);
    expect("updated_at" in draft).toBe(false);
  });

  it("creates drafts from partial input without leaking arrays into text controls", () => {
    const draft = inputToReferenceDraft({
      ...DEFAULT_REFERENCE_INPUT,
      title: "New",
      source_url: "https://example.com/new",
      style_tags: ["soft", "cozy"],
      use_tags: ["inventory", "crafting"],
      mechanic_tags: ["dialogue"],
      mood_tags: ["warm"],
      visual_language_tags: ["soft contrast"],
      inspiration_points: ["Palette"],
    });

    expect(draft.style_tags_text).toBe("soft, cozy");
    expect(draft.use_tags_text).toBe("inventory, crafting");
    expect(draft.mechanic_tags_text).toBe("dialogue");
    expect(draft.mood_tags_text).toBe("warm");
    expect(draft.visual_language_tags_text).toBe("soft contrast");
    expect(draft.inspiration_points_text).toBe("Palette");
  });
});
