import {
  REFERENCE_QUALITY_ISSUE_FIELDS,
  type ReferenceQualityIssue,
  type ReferenceQualityIssueField,
} from "./reference-quality";

export const QUALITY_FIELD_TARGET_IDS = {
  site_name: "quality-edit-site-name",
  author: "quality-edit-author",
  license_status: "quality-edit-license-status",
  avoid_copying_notes: "quality-edit-avoid-copying-notes",
  attribution_text: "quality-edit-attribution-text",
  inspiration_points: "quality-edit-inspiration-points",
  inspiration_entries: "quality-edit-inspiration-entry-observation",
  deconstruction_notes: "quality-edit-deconstruction-notes",
  transformation_ideas: "quality-edit-transformation-ideas",
  rating: "quality-edit-rating",
  reference_value_score: "quality-edit-reference-value-score",
  transformability_score: "quality-edit-transformability-score",
  copyright_risk_score: "quality-edit-copyright-risk-score",
  production_readiness_score: "quality-edit-production-readiness-score",
} satisfies Record<ReferenceQualityIssueField, string>;

const qualityIssueFields = new Set<string>(REFERENCE_QUALITY_ISSUE_FIELDS);

export function getQualityFieldTargetId(field: unknown): string | null {
  if (typeof field !== "string" || !qualityIssueFields.has(field)) {
    return null;
  }

  return QUALITY_FIELD_TARGET_IDS[field as ReferenceQualityIssueField];
}

export type QualityEditSession = {
  issues: ReferenceQualityIssue[];
  activeIndex: number;
};

export function createQualityEditSession(
  issues: ReferenceQualityIssue[],
  selectedIssue: ReferenceQualityIssue,
): QualityEditSession | null {
  const activeIndex = issues.findIndex(
    (issue) =>
      issue.group === selectedIssue.group && issue.field === selectedIssue.field,
  );

  if (activeIndex === -1) {
    return null;
  }

  return {
    issues: [...issues],
    activeIndex,
  };
}

export function getAdjacentQualityIssueIndex(
  activeIndex: number,
  issueCount: number,
  direction: "previous" | "next",
): number | null {
  const candidate = activeIndex + (direction === "previous" ? -1 : 1);

  return candidate >= 0 && candidate < issueCount ? candidate : null;
}
