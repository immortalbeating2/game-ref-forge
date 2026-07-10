import { describe, expect, it } from "vitest";
import {
  REFERENCE_QUALITY_ISSUE_FIELDS,
  type ReferenceQualityIssue,
} from "../lib/reference-quality";
import {
  QUALITY_FIELD_TARGET_IDS,
  createQualityEditSession,
  getAdjacentQualityIssueIndex,
  getQualityFieldTargetId,
} from "../lib/reference-quality-navigation";

const issues: ReferenceQualityIssue[] = [
  { group: "source", field: "site_name" },
  { group: "safety", field: "license_status" },
  { group: "inspiration", field: "inspiration_entries" },
  { group: "scores", field: "rating" },
];

describe("quality field targets", () => {
  it("defines exactly the 14 quality issue fields", () => {
    expect(REFERENCE_QUALITY_ISSUE_FIELDS).toEqual([
      "site_name",
      "author",
      "license_status",
      "avoid_copying_notes",
      "attribution_text",
      "inspiration_points",
      "inspiration_entries",
      "deconstruction_notes",
      "transformation_ideas",
      "rating",
      "reference_value_score",
      "transformability_score",
      "copyright_risk_score",
      "production_readiness_score",
    ]);
  });

  it("provides a unique prefixed target ID for every quality issue field", () => {
    const targetIds = REFERENCE_QUALITY_ISSUE_FIELDS.map(
      (field) => QUALITY_FIELD_TARGET_IDS[field],
    );

    expect(Object.keys(QUALITY_FIELD_TARGET_IDS)).toHaveLength(14);
    expect(new Set(targetIds).size).toBe(14);
    expect(targetIds.every((targetId) => targetId.startsWith("quality-edit-"))).toBe(
      true,
    );
  });

  it("returns null for a field outside the quality contract", () => {
    expect(getQualityFieldTargetId("not-a-quality-field")).toBeNull();
  });

  it.each(REFERENCE_QUALITY_ISSUE_FIELDS)(
    "returns the configured target ID for %s",
    (field) => {
      expect(getQualityFieldTargetId(field)).toBe(QUALITY_FIELD_TARGET_IDS[field]);
    },
  );
});

describe("quality edit sessions", () => {
  it("copies issues and activates the selected group and field", () => {
    const session = createQualityEditSession(issues, {
      group: "inspiration",
      field: "inspiration_entries",
    });

    expect(session).toEqual({ issues, activeIndex: 2 });
    expect(session?.issues).not.toBe(issues);
  });

  it("returns null when the selected issue is absent", () => {
    expect(
      createQualityEditSession(issues, {
        group: "source",
        field: "license_status",
      }),
    ).toBeNull();
  });
});

describe("adjacent quality issue navigation", () => {
  it("moves to adjacent issues without cycling past either boundary", () => {
    expect(getAdjacentQualityIssueIndex(2, 4, "previous")).toBe(1);
    expect(getAdjacentQualityIssueIndex(2, 4, "next")).toBe(3);
    expect(getAdjacentQualityIssueIndex(0, 4, "previous")).toBeNull();
    expect(getAdjacentQualityIssueIndex(3, 4, "next")).toBeNull();
  });

  it.each([
    { activeIndex: -1, issueCount: 4 },
    { activeIndex: 4, issueCount: 4 },
    { activeIndex: Number.NaN, issueCount: 4 },
    { activeIndex: 1.5, issueCount: 4 },
    { activeIndex: 0, issueCount: 0 },
    { activeIndex: 0, issueCount: Number.NaN },
    { activeIndex: 0, issueCount: 3.5 },
  ])(
    "rejects invalid state activeIndex=$activeIndex issueCount=$issueCount",
    ({ activeIndex, issueCount }) => {
      expect(getAdjacentQualityIssueIndex(activeIndex, issueCount, "previous")).toBeNull();
      expect(getAdjacentQualityIssueIndex(activeIndex, issueCount, "next")).toBeNull();
    },
  );
});
