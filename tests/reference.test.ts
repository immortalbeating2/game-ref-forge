import { describe, expect, it } from "vitest";
import {
  DEFAULT_REFERENCE_INPUT,
  createReferenceRecord,
  parseJsonArray,
  validateReferenceInput,
} from "../lib/reference";

describe("reference validation", () => {
  it("defaults new references to private source and public statuses", () => {
    const record = createReferenceRecord({
      ...DEFAULT_REFERENCE_INPUT,
      title: "Kenney UI Pack",
      source_url: "https://kenney.nl/assets/ui-pack",
      media_type: "asset_pack",
      asset_category: "ui_hud",
    });

    expect(record.license_status).toBe("private_reference");
    expect(record.public_status).toBe("private");
    expect(record.style_tags).toEqual([]);
    expect(record.use_tags).toEqual([]);
    expect(record.inspiration_points).toEqual([]);
  });

  it("rejects missing title and invalid source URLs", () => {
    const result = validateReferenceInput({
      ...DEFAULT_REFERENCE_INPUT,
      title: "",
      source_url: "not-a-url",
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toEqual([
      "title is required",
      "source_url must be an absolute URL",
    ]);
  });

  it("accepts valid update payloads for editable fields", () => {
    const result = validateReferenceInput({
      ...DEFAULT_REFERENCE_INPUT,
      title: "Updated Ref",
      source_url: "https://example.com/updated",
      canonical_url: "https://example.com/canonical",
      site_name: "Example",
      author: "Example Author",
      preview_url: "https://example.com/preview.png",
      media_type: "article",
      asset_category: "environment",
      source_category: "Article",
      style_tags: ["moody"],
      use_tags: ["lighting"],
      license_status: "source_link_only",
      attribution_text: "Attribution required on source.",
      public_status: "review",
      rating: 3,
      inspiration_points: ["Composition"],
      deconstruction_notes: "Layered focal points.",
      transformation_ideas: "Original layout with similar hierarchy.",
      avoid_copying_notes: "Do not copy the composition exactly.",
      related_original_asset: "Forest arena",
    });

    expect(result).toEqual({ ok: true, errors: [] });
  });
});

describe("reference JSON fields", () => {
  it("parses JSON arrays and falls back to an empty array for invalid values", () => {
    expect(parseJsonArray('["pixel","cozy"]')).toEqual(["pixel", "cozy"]);
    expect(parseJsonArray("not-json")).toEqual([]);
    expect(parseJsonArray(null)).toEqual([]);
  });
});

