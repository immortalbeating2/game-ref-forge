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
      ...DEFAULT_REFERENCE_INPUT,
      canonical_url: "",
      site_name: "",
      author: "",
      preview_url: "",
      source_category: "",
      attribution_text: "",
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
