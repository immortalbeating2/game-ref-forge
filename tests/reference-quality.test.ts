import { describe, expect, it } from "vitest";
import { ReferenceRecord } from "../lib/reference";
import {
  evaluateReferenceQuality,
  filterReferencesByReviewQueue,
} from "../lib/reference-quality";

function record(overrides: Partial<ReferenceRecord> = {}): ReferenceRecord {
  return {
    id: "ref-1",
    title: "Complete Reference",
    source_url: "https://example.com/ref",
    canonical_url: "https://example.com/ref",
    site_name: "Example",
    author: "Example Author",
    preview_url: null,
    media_type: "image",
    asset_category: "prop",
    source_category: "Example source",
    style_tags: ["stylized"],
    use_tags: ["production"],
    mechanic_tags: ["crafting"],
    mood_tags: ["calm"],
    visual_language_tags: ["shape language"],
    license_status: "source_link_only",
    attribution_text: "Example attribution",
    public_status: "review",
    quality_status: "analyzed",
    rating: 4,
    reference_value_score: 5,
    transformability_score: 4,
    copyright_risk_score: 1,
    production_readiness_score: 4,
    inspiration_points: ["Useful silhouette rule"],
    inspiration_entries: [
      {
        id: "entry-1",
        observation: "Clear silhouette contrast.",
        principle: "Readable silhouettes improve scanning.",
        transferable_idea: "Use contrast hierarchy.",
        original_application: "Original prop set.",
        avoid_copying: "Do not copy exact shapes.",
      },
    ],
    deconstruction_notes: "Readable contrast.",
    transformation_ideas: "Apply to original props.",
    avoid_copying_notes: "Avoid copying exact protected expression.",
    related_original_asset: "Original prop kit",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-02T00:00:00.000Z",
    ...overrides,
  };
}

describe("evaluateReferenceQuality", () => {
  it("returns no issues and positive badges for a complete strong reference", () => {
    const quality = evaluateReferenceQuality(record());

    expect(quality.issueCount).toBe(0);
    expect(quality.issues).toEqual([]);
    expect(quality.badges.map((badge) => badge.kind)).toEqual([
      "high_value",
      "low_risk",
      "production_ready",
      "transformable",
      "analyzed",
    ]);
  });

  it("groups missing source, safety, inspiration, and score issues", () => {
    const quality = evaluateReferenceQuality(
      record({
        site_name: null,
        author: null,
        license_status: "unknown",
        attribution_text: null,
        avoid_copying_notes: null,
        rating: null,
        reference_value_score: null,
        inspiration_points: [],
        inspiration_entries: [],
        deconstruction_notes: null,
        transformation_ideas: null,
      }),
    );

    expect(quality.issueCount).toBeGreaterThan(0);
    expect(quality.issues.map((issue) => issue.group)).toContain("source");
    expect(quality.issues.map((issue) => issue.group)).toContain("safety");
    expect(quality.issues.map((issue) => issue.group)).toContain("inspiration");
    expect(quality.issues.map((issue) => issue.group)).toContain("scores");
  });
});

describe("filterReferencesByReviewQueue", () => {
  const complete = record({
    id: "complete",
    title: "Complete",
    reference_value_score: 5,
    copyright_risk_score: 1,
  });
  const incomplete = record({
    id: "incomplete",
    title: "Incomplete",
    author: null,
    inspiration_entries: [],
  });
  const risky = record({
    id: "risky",
    title: "Risky",
    reference_value_score: 2,
    copyright_risk_score: 5,
    production_readiness_score: 2,
  });

  it("filters incomplete references", () => {
    expect(
      filterReferencesByReviewQueue([complete, incomplete], "incomplete", []).map(
        (item) => item.id,
      ),
    ).toEqual(["incomplete"]);
  });

  it("filters pinned references", () => {
    expect(
      filterReferencesByReviewQueue([complete, incomplete], "pinned", ["complete"]).map(
        (item) => item.id,
      ),
    ).toEqual(["complete"]);
  });

  it("filters high value, low risk, and production ready queues", () => {
    expect(
      filterReferencesByReviewQueue([complete, risky], "high_value", []).map(
        (item) => item.id,
      ),
    ).toEqual(["complete"]);
    expect(
      filterReferencesByReviewQueue([complete, risky], "low_risk", []).map(
        (item) => item.id,
      ),
    ).toEqual(["complete"]);
    expect(
      filterReferencesByReviewQueue([complete, risky], "production_ready", []).map(
        (item) => item.id,
      ),
    ).toEqual(["complete"]);
  });
});
