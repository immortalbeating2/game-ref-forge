import { describe, expect, it } from "vitest";
import {
  DEFAULT_REFERENCE_INPUT,
  createReferenceRecord,
  parseInspirationEntries,
  parseJsonArray,
  serializeInspirationEntries,
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
    expect(record.mechanic_tags).toEqual([]);
    expect(record.mood_tags).toEqual([]);
    expect(record.visual_language_tags).toEqual([]);
    expect(record.inspiration_entries).toEqual([]);
    expect(record.quality_status).toBe("captured");
    expect(record.reference_value_score).toBeNull();
    expect(record.transformability_score).toBeNull();
    expect(record.copyright_risk_score).toBeNull();
    expect(record.production_readiness_score).toBeNull();
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
      reference_value_score: 4,
      transformability_score: 5,
      copyright_risk_score: 2,
      production_readiness_score: 3,
      inspiration_points: ["Composition"],
      mechanic_tags: ["navigation"],
      mood_tags: ["mystery"],
      visual_language_tags: ["framing"],
      quality_status: "analyzed",
      inspiration_entries: [
        {
          id: "entry-1",
          observation: "Light frames the path.",
          principle: "Contrast guides attention.",
          transferable_idea: "Use value contrast for navigation.",
          original_application: "Apply to an original cave entrance.",
          avoid_copying: "Do not copy exact composition.",
        },
      ],
      deconstruction_notes: "Layered focal points.",
      transformation_ideas: "Original layout with similar hierarchy.",
      avoid_copying_notes: "Do not copy the composition exactly.",
      related_original_asset: "Forest arena",
    });

    expect(result).toEqual({ ok: true, errors: [] });
  });

  it("rejects invalid quality scores and statuses", () => {
    expect(validateReferenceInput({
      ...DEFAULT_REFERENCE_INPUT,
      title: "Bad score",
      source_url: "https://example.com",
      reference_value_score: 6,
    })).toEqual({
      ok: false,
      errors: ["reference_value_score must be between 1 and 5"],
    });

    expect(validateReferenceInput({
      ...DEFAULT_REFERENCE_INPUT,
      title: "Decimal score",
      source_url: "https://example.com",
      transformability_score: 1.5,
    })).toEqual({
      ok: false,
      errors: ["transformability_score must be an integer between 1 and 5"],
    });

    expect(validateReferenceInput({
      ...DEFAULT_REFERENCE_INPUT,
      title: "Bad status",
      source_url: "https://example.com",
      quality_status: "done" as never,
    })).toEqual({
      ok: false,
      errors: ["quality_status is invalid"],
    });
  });

  it("cleans richer tags and structured inspiration entries", () => {
    const record = createReferenceRecord({
      ...DEFAULT_REFERENCE_INPUT,
      title: "Structured ref",
      source_url: "https://example.com/structured",
      mechanic_tags: [" crafting ", "", "inventory"],
      mood_tags: [" cozy "],
      visual_language_tags: [" chunky silhouette "],
      inspiration_entries: [
        {
          id: "",
          observation: "  Big button states ",
          principle: "Readable state contrast ",
          transferable_idea: " Use stronger idle/hover separation ",
          original_application: " Apply to a forge inventory UI ",
          avoid_copying: " Do not copy icon shapes ",
        },
        {
          id: "",
          observation: " ",
          principle: "",
          transferable_idea: "",
          original_application: "",
          avoid_copying: "",
        },
      ],
    });

    expect(record.mechanic_tags).toEqual(["crafting", "inventory"]);
    expect(record.mood_tags).toEqual(["cozy"]);
    expect(record.visual_language_tags).toEqual(["chunky silhouette"]);
    expect(record.inspiration_entries).toHaveLength(1);
    expect(record.inspiration_entries[0]).toEqual({
      id: expect.any(String),
      observation: "Big button states",
      principle: "Readable state contrast",
      transferable_idea: "Use stronger idle/hover separation",
      original_application: "Apply to a forge inventory UI",
      avoid_copying: "Do not copy icon shapes",
    });
  });
});

describe("reference JSON fields", () => {
  it("parses JSON arrays and falls back to an empty array for invalid values", () => {
    expect(parseJsonArray('["pixel","cozy"]')).toEqual(["pixel", "cozy"]);
    expect(parseJsonArray("not-json")).toEqual([]);
    expect(parseJsonArray(null)).toEqual([]);
  });

  it("parses and serializes structured inspiration entries defensively", () => {
    const serialized = serializeInspirationEntries([
      {
        id: "entry-1",
        observation: "Value grouping",
        principle: "Cluster related stats",
        transferable_idea: "Reuse information grouping",
        original_application: "Inventory compare panel",
        avoid_copying: "Avoid exact layout",
      },
      {
        id: "",
        observation: "",
        principle: "",
        transferable_idea: "",
        original_application: "",
        avoid_copying: "",
      },
    ]);

    expect(parseInspirationEntries(serialized)).toEqual([
      {
        id: "entry-1",
        observation: "Value grouping",
        principle: "Cluster related stats",
        transferable_idea: "Reuse information grouping",
        original_application: "Inventory compare panel",
        avoid_copying: "Avoid exact layout",
      },
    ]);
    expect(parseInspirationEntries("not-json")).toEqual([]);
  });
});

