import type { ReferenceRecord } from "../../lib/reference";
import type { RefForgeBackupV1 } from "../../lib/backup";
import { createReferenceSnapshot, type SynthesisRecord } from "../../lib/synthesis";

export function makeReference(overrides: Partial<ReferenceRecord> = {}): ReferenceRecord {
  return {
    id: "ref-1",
    title: "Material study",
    source_url: "https://example.com/material-study",
    canonical_url: "https://example.com/material-study",
    site_name: "Example",
    author: "RefForge",
    preview_url: "https://example.com/material-study.png",
    media_type: "image",
    asset_category: "material_texture",
    source_category: "portfolio",
    style_tags: ["weathered"],
    use_tags: ["environment"],
    mechanic_tags: ["exploration"],
    mood_tags: ["grounded"],
    visual_language_tags: ["edge wear"],
    license_status: "private_reference",
    attribution_text: "Example attribution",
    public_status: "private",
    quality_status: "analyzed",
    rating: 4,
    reference_value_score: 5,
    transformability_score: 4,
    copyright_risk_score: 2,
    production_readiness_score: 3,
    inspiration_points: ["Wear follows use"],
    inspiration_entries: [
      {
        id: "entry-1",
        observation: "Wear clusters at contact edges.",
        principle: "Contact predicts wear.",
        transferable_idea: "Map wear to original interaction points.",
        original_application: "Original prop material pass.",
        avoid_copying: "Do not copy the source texture.",
      },
    ],
    deconstruction_notes: "Wear clusters near contact edges.",
    transformation_ideas: "Apply the rule to an original prop.",
    avoid_copying_notes: "Do not copy the source texture.",
    related_original_asset: "Workshop prop set",
    created_at: "2026-07-27T00:00:00.000Z",
    updated_at: "2026-07-27T00:00:00.000Z",
    ...overrides,
  };
}

export function makeSynthesis(overrides: Partial<SynthesisRecord> = {}): SynthesisRecord {
  return {
    id: "syn-1",
    title: "Shared direction",
    target_asset: "Workshop interface",
    shared_principles: "Readable material hierarchy.",
    key_differences: "Preserve original layout.",
    original_direction: "Use the principle in an original scene.",
    avoid_copying_notes: "Do not recreate source arrangements.",
    design_constraints: "Keep the interaction readable.",
    experiment_plan: "Test three material passes.",
    next_actions: "Create a greybox.",
    additional_notes: "Review after the first playtest.",
    status: "actionable",
    created_at: "2026-07-27T00:00:00.000Z",
    updated_at: "2026-07-27T00:00:00.000Z",
    ...overrides,
  };
}

export function makeBackupFixture(): RefForgeBackupV1 {
  const first = makeReference({ id: "ref-1", title: "Material study" });
  const second = makeReference({
    id: "ref-2",
    title: "UI study",
    source_url: "https://example.com/ui-study",
    canonical_url: null,
    preview_url: null,
  });
  const synthesis = makeSynthesis({ id: "syn-1", title: "Shared direction" });

  return {
    format: "ref-forge-backup",
    schema_version: 1,
    exported_at: "2026-07-27T00:00:00.000Z",
    app: { name: "RefForge" },
    data: {
      references: [first, second],
      syntheses: [synthesis],
      synthesis_references: [
        {
          id: "link-1",
          synthesis_id: synthesis.id,
          reference_id: first.id,
          position: 0,
          snapshot: createReferenceSnapshot(first),
          snapshot_updated_at: "2026-07-27T00:00:00.000Z",
        },
        {
          id: "link-2",
          synthesis_id: synthesis.id,
          reference_id: null,
          position: 1,
          snapshot: createReferenceSnapshot(second),
          snapshot_updated_at: "2026-07-27T00:00:00.000Z",
        },
      ],
    },
    preferences: null,
  };
}
