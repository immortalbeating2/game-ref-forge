import { describe, expect, it } from "vitest";
import { ReferenceRecord } from "../lib/reference";
import {
  createReferenceJsonExport,
  formatReferenceMarkdown,
  safeExportFilename,
} from "../lib/reference-export";

const reference: ReferenceRecord = {
  id: "ref-1",
  title: "Kenney UI Pack",
  source_url: "https://kenney.nl/assets/ui-pack",
  canonical_url: null,
  site_name: "Kenney",
  author: "Kenney",
  preview_url: null,
  media_type: "asset_pack",
  asset_category: "ui_hud",
  source_category: null,
  style_tags: ["clean"],
  use_tags: ["inventory"],
  mechanic_tags: ["interaction feedback"],
  mood_tags: ["friendly"],
  visual_language_tags: ["panel rhythm"],
  license_status: "cc0_or_public_domain",
  attribution_text: null,
  public_status: "review",
  quality_status: "analyzed",
  rating: 4,
  reference_value_score: 4,
  transformability_score: 5,
  copyright_risk_score: 1,
  production_readiness_score: 4,
  inspiration_points: ["Button state clarity"],
  inspiration_entries: [
    {
      id: "entry-1",
      observation: "Buttons have clear state contrast.",
      principle: "Readable state contrast helps stressful HUD use.",
      transferable_idea: "Use contrast hierarchy, not exact art.",
      original_application: "Original crafting interface.",
      avoid_copying: "Do not copy icons.",
    },
  ],
  deconstruction_notes: "Useful panel rhythm.",
  transformation_ideas: "Apply to a crafting UI.",
  avoid_copying_notes: "Do not copy exact icons.",
  related_original_asset: "Inventory HUD",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-02T00:00:00.000Z",
};

describe("reference export helpers", () => {
  it("formats markdown with source, safety, scores, tags, and structured inspiration", () => {
    const markdown = formatReferenceMarkdown(reference);

    expect(markdown).toContain("# Kenney UI Pack");
    expect(markdown).toContain("https://kenney.nl/assets/ui-pack");
    expect(markdown).toContain("cc0_or_public_domain");
    expect(markdown).toContain("reference_value_score: 4");
    expect(markdown).toContain("interaction feedback");
    expect(markdown).toContain("Buttons have clear state contrast.");
  });

  it("creates a full-library JSON export payload", () => {
    const payload = createReferenceJsonExport([reference]);

    expect(payload.exported_at).toEqual(expect.any(String));
    expect(payload.count).toBe(1);
    expect(payload.references[0].id).toBe("ref-1");
  });

  it("creates safe filenames", () => {
    expect(safeExportFilename("Kenney UI Pack!", "md")).toMatch(/^kenney-ui-pack-.*\.md$/);
  });
});
