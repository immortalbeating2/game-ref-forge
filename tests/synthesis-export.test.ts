import { describe, expect, it, vi } from "vitest";
import type { ReferenceRecord } from "../lib/reference";
import { createReferenceSnapshot, type SynthesisDetail } from "../lib/synthesis";
import {
  formatSynthesisMarkdown,
  safeSynthesisExportFilename,
} from "../lib/synthesis-export";

function makeReference(id: string, title: string): ReferenceRecord {
  return {
    id,
    title,
    source_url: `https://example.com/${id}`,
    canonical_url: null,
    site_name: "Example",
    author: "Author",
    preview_url: "https://example.com/preview.png",
    media_type: "image",
    asset_category: "prop",
    source_category: null,
    style_tags: ["aged"],
    use_tags: ["environment"],
    mechanic_tags: [],
    mood_tags: [],
    visual_language_tags: ["edge wear"],
    license_status: "private_reference",
    attribution_text: null,
    public_status: "private",
    quality_status: "analyzed",
    rating: 4,
    reference_value_score: 5,
    transformability_score: 4,
    copyright_risk_score: 2,
    production_readiness_score: 3,
    inspiration_points: [],
    inspiration_entries: [],
    deconstruction_notes: null,
    transformation_ideas: null,
    avoid_copying_notes: null,
    related_original_asset: null,
    created_at: "2026-07-13T00:00:00.000Z",
    updated_at: "2026-07-13T01:00:00.000Z",
  };
}

const firstReference = makeReference("ref-1", "First material");
const secondReference = makeReference("ref-2", "Second material");

const detail: SynthesisDetail = {
  id: "syn-1",
  title: "Study",
  target_asset: "Original prop",
  shared_principles: "Use wear to show contact.",
  key_differences: null,
  original_direction: "Build an original prop.",
  avoid_copying_notes: "Do not copy the source texture.",
  design_constraints: null,
  experiment_plan: "Test two variants.",
  next_actions: null,
  additional_notes: null,
  status: "draft",
  created_at: "2026-07-13T02:00:00.000Z",
  updated_at: "2026-07-13T03:00:00.000Z",
  references: [
    {
      id: "link-1",
      synthesis_id: "syn-1",
      reference_id: firstReference.id,
      position: 0,
      snapshot: createReferenceSnapshot(firstReference),
      snapshot_updated_at: "2026-07-13T03:00:00.000Z",
      available: true,
      stale: false,
    },
    {
      id: "link-2",
      synthesis_id: "syn-1",
      reference_id: null,
      position: 1,
      snapshot: createReferenceSnapshot(secondReference),
      snapshot_updated_at: "2026-07-13T03:00:00.000Z",
      available: false,
      stale: false,
    },
  ],
};

describe("synthesis Markdown export", () => {
  it("renders fixed sections in order with source links and unsaved warning", () => {
    const markdown = formatSynthesisMarkdown(detail, {
      unsaved: true,
      exportedAt: "2026-07-13T00:00:00.000Z",
    });

    expect(markdown).toContain("# Study");
    expect(markdown).toContain("Unsaved changes");
    expect(markdown).toContain("https://example.com/ref-1");
    expect(markdown).toContain("Second material");
    expect(markdown).toContain("Unavailable");
    expect(markdown).not.toContain("preview_url");

    const sections = [
      "# Study",
      "## Status and target asset",
      "## Unsaved changes",
      "## References",
      "## Shared principles",
      "## Key differences",
      "## Original direction",
      "## Avoid copying",
      "## Design constraints",
      "## Experiment plan",
      "## Next actions",
      "## Additional notes",
      "## Exported at",
    ];
    expect(sections).toEqual([...sections].sort((a, b) => markdown.indexOf(a) - markdown.indexOf(b)));
  });

  it("renders empty fields as a dash", () => {
    const markdown = formatSynthesisMarkdown({
      ...detail,
      target_asset: null,
      shared_principles: null,
      key_differences: null,
      original_direction: null,
      avoid_copying_notes: null,
      design_constraints: null,
      experiment_plan: null,
      next_actions: null,
      additional_notes: null,
      references: [],
    }, { exportedAt: "2026-07-13T00:00:00.000Z" });

    expect(markdown).toContain("- target_asset: -");
    expect(markdown).toContain("## Shared principles\n\n-");
    expect(markdown).toContain("## References\n\n-");
  });
});

describe("synthesis export filenames", () => {
  it("uses the title slug, synthesis suffix, and export date", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-13T00:00:00.000Z"));

    expect(safeSynthesisExportFilename(" Dungeon Direction! ")).toBe(
      "dungeon-direction-synthesis-2026-07-13.md",
    );
  });
});
