import { describe, expect, it } from "vitest";
import { getVisibleDetailReference } from "../lib/ui-state";
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
  license_status: "private_reference",
  attribution_text: null,
  public_status: "private",
  rating: null,
  inspiration_points: [],
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
