import { describe, expect, it } from "vitest";
import { buildReferenceSearchText, getVisibleDetailReference } from "../lib/ui-state";
import type { ReferenceRecord } from "../lib/reference";

const reference = {
  id: "qa-1",
  title: "QA Test",
  source_url: "https://example.com",
  canonical_url: null,
  site_name: "Example",
  author: null,
  preview_url: null,
  media_type: "image",
  asset_category: "prop",
  source_category: null,
  style_tags: [],
  use_tags: [],
  mechanic_tags: ["crafting loop"],
  mood_tags: ["cozy tension"],
  visual_language_tags: ["chunky silhouette"],
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
  inspiration_entries: [
    {
      id: "entry-1",
      observation: "Large button states",
      principle: "State contrast guides quick scanning",
      transferable_idea: "Separate hover and idle values",
      original_application: "Forge inventory action bar",
      avoid_copying: "Do not copy exact icon shapes",
    },
  ],
  deconstruction_notes: null,
  transformation_ideas: null,
  avoid_copying_notes: null,
  related_original_asset: null,
  created_at: "2026-06-10T00:00:00.000Z",
  updated_at: "2026-06-10T00:00:00.000Z",
} satisfies ReferenceRecord;

describe("visible detail reference", () => {
  it("returns null when filters hide every reference", () => {
    expect(getVisibleDetailReference([], [reference], reference.id)).toBeNull();
  });

  it("keeps the selected filtered reference when it is visible", () => {
    expect(getVisibleDetailReference([reference], [reference], reference.id)?.id).toBe("qa-1");
  });
});

describe("reference search text", () => {
  it("includes richer tags and structured inspiration entries", () => {
    const searchable = buildReferenceSearchText(reference);

    expect(searchable).toContain("crafting loop");
    expect(searchable).toContain("cozy tension");
    expect(searchable).toContain("chunky silhouette");
    expect(searchable).toContain("state contrast guides quick scanning");
    expect(searchable).toContain("forge inventory action bar");
  });
});
