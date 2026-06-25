import { describe, expect, it } from "vitest";
import { ReferenceRecord } from "../lib/reference";
import { sortReferences } from "../lib/reference-sort";

function record(overrides: Partial<ReferenceRecord>): ReferenceRecord {
  return {
    id: "base",
    title: "Base",
    source_url: "https://example.com/base",
    canonical_url: null,
    site_name: null,
    author: null,
    preview_url: null,
    media_type: "image",
    asset_category: "prop",
    source_category: null,
    style_tags: [],
    use_tags: [],
    mechanic_tags: [],
    mood_tags: [],
    visual_language_tags: [],
    license_status: "private_reference",
    attribution_text: null,
    public_status: "private",
    quality_status: "captured",
    rating: null,
    reference_value_score: null,
    transformability_score: null,
    copyright_risk_score: null,
    production_readiness_score: null,
    inspiration_points: [],
    inspiration_entries: [],
    deconstruction_notes: null,
    transformation_ideas: null,
    avoid_copying_notes: null,
    related_original_asset: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("sortReferences", () => {
  it("keeps pinned references first before applying updated sort", () => {
    const rows = [
      record({ id: "old-pinned", title: "Old pinned", updated_at: "2026-01-01T00:00:00.000Z" }),
      record({ id: "new", title: "New", updated_at: "2026-02-01T00:00:00.000Z" }),
    ];

    expect(sortReferences(rows, "updated_desc", ["old-pinned"]).map((item) => item.id)).toEqual([
      "old-pinned",
      "new",
    ]);
  });

  it("sorts reference value score descending with missing values last", () => {
    const rows = [
      record({ id: "missing", reference_value_score: null }),
      record({ id: "low", reference_value_score: 2 }),
      record({ id: "high", reference_value_score: 5 }),
    ];

    expect(sortReferences(rows, "reference_value_desc", []).map((item) => item.id)).toEqual([
      "high",
      "low",
      "missing",
    ]);
  });

  it("sorts copyright risk ascending", () => {
    const rows = [
      record({ id: "high-risk", copyright_risk_score: 5 }),
      record({ id: "low-risk", copyright_risk_score: 1 }),
    ];

    expect(sortReferences(rows, "copyright_risk_asc", []).map((item) => item.id)).toEqual([
      "low-risk",
      "high-risk",
    ]);
  });
});
