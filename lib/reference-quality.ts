import { ReferenceRecord } from "./reference";

export const REVIEW_QUEUE_MODES = [
  "all",
  "incomplete",
  "pinned",
  "high_value",
  "low_risk",
  "production_ready",
] as const;

export type ReviewQueueMode = (typeof REVIEW_QUEUE_MODES)[number];

export type ReferenceQualityIssueGroup = "source" | "safety" | "inspiration" | "scores";

export type ReferenceQualityIssue = {
  group: ReferenceQualityIssueGroup;
  field: string;
};

export type ReferenceQualityBadgeKind =
  | "high_value"
  | "low_risk"
  | "production_ready"
  | "transformable"
  | "analyzed";

export type ReferenceQualityBadge = {
  kind: ReferenceQualityBadgeKind;
};

function isBlank(value: string | null | undefined) {
  return !value || value.trim().length === 0;
}

function addIssue(
  issues: ReferenceQualityIssue[],
  group: ReferenceQualityIssueGroup,
  field: string,
) {
  issues.push({ group, field });
}

export function evaluateReferenceQuality(reference: ReferenceRecord) {
  const issues: ReferenceQualityIssue[] = [];
  const badges: ReferenceQualityBadge[] = [];

  if (isBlank(reference.site_name)) {
    addIssue(issues, "source", "site_name");
  }

  if (isBlank(reference.author)) {
    addIssue(issues, "source", "author");
  }

  if (reference.license_status === "unknown_license") {
    addIssue(issues, "safety", "license_status");
  }

  if (isBlank(reference.avoid_copying_notes)) {
    addIssue(issues, "safety", "avoid_copying_notes");
  }

  if (reference.public_status === "review" && isBlank(reference.attribution_text)) {
    addIssue(issues, "safety", "attribution_text");
  }

  if (reference.inspiration_points.length === 0) {
    addIssue(issues, "inspiration", "inspiration_points");
  }

  if (reference.inspiration_entries.length === 0) {
    addIssue(issues, "inspiration", "inspiration_entries");
  }

  if (isBlank(reference.deconstruction_notes)) {
    addIssue(issues, "inspiration", "deconstruction_notes");
  }

  if (isBlank(reference.transformation_ideas)) {
    addIssue(issues, "inspiration", "transformation_ideas");
  }

  if (reference.rating === null) {
    addIssue(issues, "scores", "rating");
  }

  if (reference.reference_value_score === null) {
    addIssue(issues, "scores", "reference_value_score");
  }

  if (reference.transformability_score === null) {
    addIssue(issues, "scores", "transformability_score");
  }

  if (reference.copyright_risk_score === null) {
    addIssue(issues, "scores", "copyright_risk_score");
  }

  if (reference.production_readiness_score === null) {
    addIssue(issues, "scores", "production_readiness_score");
  }

  if ((reference.reference_value_score ?? 0) >= 4) {
    badges.push({ kind: "high_value" });
  }

  if (reference.copyright_risk_score !== null && reference.copyright_risk_score <= 2) {
    badges.push({ kind: "low_risk" });
  }

  if ((reference.production_readiness_score ?? 0) >= 4) {
    badges.push({ kind: "production_ready" });
  }

  if ((reference.transformability_score ?? 0) >= 4) {
    badges.push({ kind: "transformable" });
  }

  if (reference.quality_status === "analyzed") {
    badges.push({ kind: "analyzed" });
  }

  return {
    issueCount: issues.length,
    issues,
    badges,
  };
}

export function filterReferencesByReviewQueue(
  references: ReferenceRecord[],
  mode: ReviewQueueMode,
  pinnedReferenceIds: string[],
) {
  const pinned = new Set(pinnedReferenceIds);

  return references.filter((reference) => {
    const quality = evaluateReferenceQuality(reference);

    switch (mode) {
      case "incomplete":
        return quality.issueCount > 0;
      case "pinned":
        return pinned.has(reference.id);
      case "high_value":
        return quality.badges.some((badge) => badge.kind === "high_value");
      case "low_risk":
        return quality.badges.some((badge) => badge.kind === "low_risk");
      case "production_ready":
        return quality.badges.some((badge) => badge.kind === "production_ready");
      case "all":
      default:
        return true;
    }
  });
}
