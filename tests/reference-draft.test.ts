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
  license_status: "private_reference",
  attribution_text: "Example attribution",
  public_status: "private",
  rating: 4,
  inspiration_points: ["Readable silhouette", "Clear material break"],
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
      rating: "",
      deconstruction_notes: "",
      transformation_ideas: "",
      avoid_copying_notes: "",
      related_original_asset: "",
      style_tags_text: "",
      use_tags_text: "",
      inspiration_points_text: "",
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
      rating: "4",
      style_tags_text: "chunky, bright",
      use_tags_text: "inventory",
      inspiration_points_text: "Readable silhouette, Clear material break",
    });
  });

  it("converts drafts back to normalized ReferenceInput", () => {
    const input = draftToReferenceInput({
      ...recordToReferenceDraft(record),
      style_tags_text: " chunky, bright, ",
      use_tags_text: " inventory, , crafting ",
      inspiration_points_text: "Readable silhouette, Clear material break",
      rating: "5",
    });

    expect(input).toMatchObject({
      title: "Original Title",
      source_url: "https://example.com/original",
      style_tags: ["chunky", "bright"],
      use_tags: ["inventory", "crafting"],
      inspiration_points: ["Readable silhouette", "Clear material break"],
      rating: 5,
    });
  });

  it("converts blank draft rating values to null", () => {
    expect(draftToReferenceInput({ ...recordToReferenceDraft(record), rating: "" }).rating).toBeNull();
    expect(draftToReferenceInput({ ...recordToReferenceDraft(record), rating: "   " }).rating).toBeNull();
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
      inspiration_points: ["Palette"],
    });

    expect(draft.style_tags_text).toBe("soft, cozy");
    expect(draft.use_tags_text).toBe("inventory, crafting");
    expect(draft.inspiration_points_text).toBe("Palette");
  });
});
