import { describe, expect, it } from "vitest";
import type { ReferenceRecord } from "../lib/reference";
import {
  createReferenceSnapshot,
  createSynthesisRecord,
  deriveSnapshotState,
  parseReferenceSnapshot,
  validateCreateSynthesisInput,
  validateSynthesisInput,
} from "../lib/synthesis";

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

describe("synthesis domain contract", () => {
  it("accepts a valid synthesis with two to four unique references", () => {
    expect(validateCreateSynthesisInput({
      title: "Dungeon material direction",
      status: "draft",
      reference_ids: ["ref-1", "ref-2"],
    })).toEqual({ ok: true, errors: [] });
  });

  it.each<[string[]]>([[["ref-1"]], [["a", "b", "c", "d", "e"]], [["a", "a"]]])(
    "rejects an invalid reference set %j",
    (reference_ids: string[]) => {
      expect(validateCreateSynthesisInput({
        title: "Invalid",
        status: "draft",
        reference_ids,
      }).ok).toBe(false);
    },
  );

  it("enforces title, status, and exact field limits", () => {
    expect(validateSynthesisInput({ title: " ", status: "draft" }).ok).toBe(false);
    expect(validateSynthesisInput({ title: "x".repeat(161), status: "draft" }).ok).toBe(false);
    expect(validateSynthesisInput({ title: "Valid", target_asset: "x".repeat(241), status: "draft" }).ok).toBe(false);
    expect(validateSynthesisInput({ title: "Valid", original_direction: "x".repeat(8001), status: "draft" }).ok).toBe(false);
    expect(validateSynthesisInput({ title: "Valid", status: "unknown" as "draft" }).ok).toBe(false);
  });

  it("normalizes a synthesis record with an injected server timestamp", () => {
    expect(createSynthesisRecord({
      title: "  Study  ",
      status: "draft",
      target_asset: "  Prop  ",
    }, "2026-07-13T00:00:00.000Z")).toMatchObject({
      title: "Study",
      target_asset: "Prop",
      shared_principles: null,
      status: "draft",
      created_at: "2026-07-13T00:00:00.000Z",
      updated_at: "2026-07-13T00:00:00.000Z",
    });
  });

  it("creates a versioned snapshot and safely parses it", () => {
    const snapshot = createReferenceSnapshot(reference);
    expect(snapshot).toMatchObject({ schema_version: 1, reference_id: "ref-1", title: "Material Study" });
    expect(parseReferenceSnapshot(JSON.stringify(snapshot))).toEqual(snapshot);
    expect(parseReferenceSnapshot("not-json")).toBeNull();
  });

  it("rejects snapshots with the wrong schema version", () => {
    const snapshot = createReferenceSnapshot(reference);
    expect(parseReferenceSnapshot(JSON.stringify({ ...snapshot, schema_version: 2 }))).toBeNull();
  });

  it("falls back to an unavailable snapshot when stored data is malformed", () => {
    expect(parseReferenceSnapshot("not-json", "ref-1")).toEqual({
      schema_version: 1,
      reference_id: "ref-1",
      reference_updated_at: "",
      title: "Unavailable snapshot",
      source_url: "",
      canonical_url: null,
      site_name: null,
      author: null,
      media_type: "mixed",
      asset_category: "prop",
      license_status: "unknown_license",
      public_status: "private",
      quality_status: "captured",
      scores: {
        rating: null,
        reference_value_score: null,
        transformability_score: null,
        copyright_risk_score: null,
        production_readiness_score: null,
      },
      tags: {
        style_tags: [],
        use_tags: [],
        mechanic_tags: [],
        mood_tags: [],
        visual_language_tags: [],
      },
      inspiration: {
        inspiration_points: [],
        inspiration_entries: [],
        deconstruction_notes: null,
        transformation_ideas: null,
        avoid_copying_notes: null,
      },
    });
  });

  it.each([
    "media_type",
    "asset_category",
    "license_status",
    "public_status",
    "quality_status",
  ] as const)("rejects snapshots with an illegal %s", (field) => {
    const snapshot = createReferenceSnapshot(reference);
    expect(parseReferenceSnapshot(JSON.stringify({ ...snapshot, [field]: "illegal" }))).toBeNull();
  });

  it("rejects snapshots with malformed scores", () => {
    const snapshot = createReferenceSnapshot(reference);
    const malformed = { ...snapshot, scores: { ...snapshot.scores, rating: "5" } };
    expect(parseReferenceSnapshot(JSON.stringify(malformed))).toBeNull();
  });

  it.each([
    ["top level", (snapshot: ReturnType<typeof createReferenceSnapshot>) => ({ ...snapshot, extra: true })],
    ["scores", (snapshot: ReturnType<typeof createReferenceSnapshot>) => ({ ...snapshot, scores: { ...snapshot.scores, extra: 3 } })],
    ["tags", (snapshot: ReturnType<typeof createReferenceSnapshot>) => ({ ...snapshot, tags: { ...snapshot.tags, extra: [] } })],
    ["inspiration", (snapshot: ReturnType<typeof createReferenceSnapshot>) => ({ ...snapshot, inspiration: { ...snapshot.inspiration, extra: "unsafe" } })],
    ["inspiration entry", (snapshot: ReturnType<typeof createReferenceSnapshot>) => ({
      ...snapshot,
      inspiration: {
        ...snapshot.inspiration,
        inspiration_entries: [{
          id: "entry-1",
          observation: "Observe",
          principle: "Principle",
          transferable_idea: "Transfer",
          original_application: "Apply",
          avoid_copying: "Avoid",
          extra: { rendered: "object" },
        }],
      },
    })],
  ] as const)("rejects unknown keys at the %s", (_level, mutate) => {
    const snapshot = createReferenceSnapshot(reference);
    expect(parseReferenceSnapshot(JSON.stringify(mutate(snapshot)))).toBeNull();
  });

  it.each([
    ["rating below range", { rating: 0 }],
    ["rating above range", { rating: 6 }],
    ["quality score below range", { reference_value_score: 0 }],
    ["quality score above range", { transformability_score: 6 }],
    ["quality score not integral", { copyright_risk_score: 1.5 }],
  ])("rejects %s", (_label, scoreOverride) => {
    const snapshot = createReferenceSnapshot(reference);
    const malformed = { ...snapshot, scores: { ...snapshot.scores, ...scoreOverride } };
    expect(parseReferenceSnapshot(JSON.stringify(malformed))).toBeNull();
  });

  it("rejects snapshots with malformed tags", () => {
    const snapshot = createReferenceSnapshot(reference);
    const malformed = { ...snapshot, tags: { ...snapshot.tags, style_tags: ["aged", 42] } };
    expect(parseReferenceSnapshot(JSON.stringify(malformed))).toBeNull();
  });

  it("falls back before malformed nested objects can reach rendering", () => {
    const snapshot = createReferenceSnapshot(reference);
    const malformed = {
      ...snapshot,
      tags: { ...snapshot.tags, style_tags: [{ unsafe: "react child" }] },
    };

    const fallback = parseReferenceSnapshot(JSON.stringify(malformed), "ref-stored");

    expect(fallback.reference_id).toBe("ref-stored");
    expect(fallback.tags.style_tags).toEqual([]);
    expect(fallback.inspiration.inspiration_entries).toEqual([]);
  });

  it("rejects snapshots with malformed inspiration", () => {
    const snapshot = createReferenceSnapshot(reference);
    const malformed = {
      ...snapshot,
      inspiration: { ...snapshot.inspiration, inspiration_entries: [{}] },
    };
    expect(parseReferenceSnapshot(JSON.stringify(malformed))).toBeNull();
  });

  it.each([
    ["missing", undefined],
    ["empty", ""],
  ] as const)("rejects inspiration entries with a %s id", (_label, id) => {
    const snapshot = createReferenceSnapshot(reference);
    const entry = {
      ...(id === undefined ? {} : { id }),
      observation: "Observe",
      principle: "Principle",
      transferable_idea: "Transfer",
      original_application: "Apply",
      avoid_copying: "Avoid",
    };
    const malformed = {
      ...snapshot,
      inspiration: { ...snapshot.inspiration, inspiration_entries: [entry] },
    };

    expect(parseReferenceSnapshot(JSON.stringify(malformed))).toBeNull();
  });

  it("derives current, stale, and unavailable states without persisting them", () => {
    const snapshot = createReferenceSnapshot(reference);
    expect(deriveSnapshotState(snapshot, reference.updated_at, true)).toEqual({ available: true, stale: false });
    expect(deriveSnapshotState(snapshot, "2026-07-13T02:00:00.000Z", true)).toEqual({ available: true, stale: true });
    expect(deriveSnapshotState(snapshot, null, false)).toEqual({ available: false, stale: false });
  });

  it("treats invalid snapshot timestamps as not stale", () => {
    const snapshot = createReferenceSnapshot(reference);
    expect(deriveSnapshotState(snapshot, "not-a-timestamp", true)).toEqual({ available: true, stale: false });
    expect(deriveSnapshotState({ ...snapshot, reference_updated_at: "invalid" }, reference.updated_at, true)).toEqual({ available: true, stale: false });
  });
});
