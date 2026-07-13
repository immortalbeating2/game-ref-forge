import { describe, expect, it } from "vitest";
import type { ReferenceRecord } from "../lib/reference";
import { createReferenceSnapshot, type SynthesisDetail } from "../lib/synthesis";
import {
  createEmptySynthesisDraft,
  detailToSynthesisDraft,
  draftToSynthesisInput,
  isSynthesisDraftDirty,
} from "../lib/synthesis-draft";

const reference = {
  id: "ref-1",
  title: "Material Study",
  source_url: "https://example.com/material",
  canonical_url: null,
  site_name: "Example",
  author: "Author",
  preview_url: null,
  media_type: "image",
  asset_category: "material_texture",
  source_category: null,
  style_tags: ["aged"],
  use_tags: ["environment"],
  mechanic_tags: ["exploration"],
  mood_tags: ["grounded"],
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
  inspiration_points: ["Wear follows use"],
  inspiration_entries: [],
  deconstruction_notes: "Wear clusters near contact edges.",
  transformation_ideas: "Apply the rule to an original prop.",
  avoid_copying_notes: "Do not copy the source texture.",
  related_original_asset: null,
  created_at: "2026-07-13T00:00:00.000Z",
  updated_at: "2026-07-13T01:00:00.000Z",
} satisfies ReferenceRecord;

const detail: SynthesisDetail = {
  id: "syn-1",
  title: "Study",
  target_asset: "Original prop",
  shared_principles: "Use wear to show contact.",
  key_differences: "One source is soft; one is angular.",
  original_direction: "Build an original prop with readable wear.",
  avoid_copying_notes: "Do not copy the source texture.",
  design_constraints: "Keep the silhouette readable at game distance.",
  experiment_plan: "Test two roughness variants.",
  next_actions: "Block out the prop.",
  additional_notes: "Review after the first paintover.",
  status: "draft",
  created_at: "2026-07-13T02:00:00.000Z",
  updated_at: "2026-07-13T03:00:00.000Z",
  references: [
    {
      id: "link-1",
      synthesis_id: "syn-1",
      reference_id: reference.id,
      position: 0,
      snapshot: createReferenceSnapshot(reference),
      snapshot_updated_at: "2026-07-13T03:00:00.000Z",
      available: true,
      stale: false,
    },
  ],
};

describe("synthesis drafts", () => {
  it("creates a blank draft with the draft status", () => {
    expect(createEmptySynthesisDraft()).toEqual({
      title: "",
      target_asset: "",
      shared_principles: "",
      key_differences: "",
      original_direction: "",
      avoid_copying_notes: "",
      design_constraints: "",
      experiment_plan: "",
      next_actions: "",
      additional_notes: "",
      status: "draft",
    });
  });

  it("converts a detail to a form draft and detects normalized changes", () => {
    const draft = detailToSynthesisDraft(detail);

    expect(draft.status).toBe("draft");
    expect(draftToSynthesisInput(draft)).toMatchObject({
      title: "Study",
      target_asset: "Original prop",
      shared_principles: "Use wear to show contact.",
    });
    expect(isSynthesisDraftDirty(draft, detail)).toBe(false);
    expect(isSynthesisDraftDirty({ ...draft, title: "Changed" }, detail)).toBe(true);
    expect(isSynthesisDraftDirty({ ...draft, title: " Study " }, detail)).toBe(false);
  });

  it("normalizes blank optional fields to null before saving", () => {
    expect(draftToSynthesisInput({
      ...createEmptySynthesisDraft(),
      title: "Study",
      target_asset: "  ",
      original_direction: "  ",
    })).toMatchObject({
      title: "Study",
      target_asset: null,
      original_direction: null,
      status: "draft",
    });
  });
});
