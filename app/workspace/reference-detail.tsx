"use client";

import { ArrowRight, Trash2 } from "lucide-react";
import {
  labelForLicenseStatus,
  labelForMediaType,
  labelForPublicStatus,
  labelForQualityStatus,
  Language,
  uiCopy,
} from "../../lib/localization";
import type { ReferenceRecord } from "../../lib/reference";
import {
  evaluateReferenceQuality,
  ReferenceQualityBadgeKind,
  ReferenceQualityIssue,
} from "../../lib/reference-quality";
import { buildReferenceScoreProfile } from "../../lib/reference-score-profile";
import { DetailSection } from "./detail-section";
import { ScoreRadar } from "./score-radar";

function isPresent(value: string | null | undefined): value is string {
  return Boolean(value);
}

type ReferenceDetailProps = {
  copy: ReturnType<typeof uiCopy>;
  deleteCopy: {
    body: string;
    cancel: string;
    confirm: string;
    title: string;
  };
  isDeleting: boolean;
  language: Language;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
  onRequestDelete: () => void;
  onStartQualityEditing: (issue: ReferenceQualityIssue) => void;
  pendingDelete: boolean;
  reference: ReferenceRecord;
};

function groupQualityIssues(issues: ReferenceQualityIssue[]) {
  return issues.reduce<Record<ReferenceQualityIssue["group"], ReferenceQualityIssue[]>>(
    (groups, issue) => {
      groups[issue.group].push(issue);
      return groups;
    },
    { source: [], safety: [], inspiration: [], scores: [] },
  );
}

export function ReferenceDetail({
  copy,
  deleteCopy,
  isDeleting,
  language,
  onCancelDelete,
  onConfirmDelete,
  onRequestDelete,
  onStartQualityEditing,
  pendingDelete,
  reference,
}: ReferenceDetailProps) {
  const quality = evaluateReferenceQuality(reference);
  const groupedIssues = groupQualityIssues(quality.issues);
  const scoreProfile = buildReferenceScoreProfile(reference, {
    rating: copy.rating,
    referenceValue: copy.referenceValueScore,
    transformability: copy.transformabilityScore,
    productionReadiness: copy.productionReadinessScore,
    safety: copy.safetyScore,
  });

  function labelForQualityBadge(kind: ReferenceQualityBadgeKind) {
    switch (kind) {
      case "high_value":
        return copy.qualityBadgeHighValue;
      case "low_risk":
        return copy.qualityBadgeLowRisk;
      case "production_ready":
        return copy.qualityBadgeProductionReady;
      case "transformable":
        return copy.qualityBadgeTransformable;
      case "analyzed":
      default:
        return copy.qualityBadgeAnalyzed;
    }
  }

  function labelForQualityIssue(issue: ReferenceQualityIssue) {
    switch (issue.field) {
      case "site_name":
        return copy.qualityMissingSite;
      case "author":
        return copy.qualityMissingAuthor;
      case "license_status":
        return copy.qualityMissingLicense;
      case "attribution_text":
        return copy.qualityMissingAttribution;
      case "avoid_copying_notes":
        return copy.qualityMissingAvoidCopying;
      case "inspiration_points":
        return copy.qualityMissingInspirationPoints;
      case "inspiration_entries":
        return copy.qualityMissingInspirationEntries;
      case "deconstruction_notes":
        return copy.qualityMissingDeconstruction;
      case "transformation_ideas":
        return copy.qualityMissingTransformation;
      case "rating":
        return copy.qualityMissingRating;
      case "reference_value_score":
        return copy.qualityMissingReferenceValue;
      case "transformability_score":
        return copy.qualityMissingTransformability;
      case "copyright_risk_score":
        return copy.qualityMissingCopyrightRisk;
      case "production_readiness_score":
      default:
        return copy.qualityMissingProductionReadiness;
    }
  }

  function labelForQualityGroup(group: ReferenceQualityIssue["group"]) {
    switch (group) {
      case "source":
        return copy.qualitySourceGroup;
      case "safety":
        return copy.qualitySafetyGroup;
      case "inspiration":
        return copy.qualityInspirationGroup;
      case "scores":
      default:
        return copy.qualityScoresGroup;
    }
  }

  const observations = [
    ...reference.inspiration_points,
    ...reference.inspiration_entries.map((entry) => entry.observation),
    reference.deconstruction_notes,
  ].filter(isPresent);
  const principles = reference.inspiration_entries
    .flatMap((entry) => [entry.principle, entry.transferable_idea])
    .filter(isPresent);
  const avoidCopying = [
    reference.avoid_copying_notes,
    ...reference.inspiration_entries.map((entry) => entry.avoid_copying),
  ].filter(isPresent);
  const transformationDirections = [
    reference.transformation_ideas,
    ...reference.inspiration_entries.map((entry) => entry.original_application),
    reference.related_original_asset,
  ].filter(isPresent);

  return (
    <div className="reference-detail">
      <DetailSection title={copy.sourceAndSafety} collapsible={false}>
        <dl className="source-safety-grid">
          <div><dt>{copy.site}</dt><dd>{reference.site_name ?? copy.unknown}</dd></div>
          <div><dt>{copy.author}</dt><dd>{reference.author ?? copy.unknown}</dd></div>
          <div><dt>{copy.media}</dt><dd>{labelForMediaType(reference.media_type, language)}</dd></div>
          <div><dt>{copy.license}</dt><dd>{labelForLicenseStatus(reference.license_status, language)}</dd></div>
          <div><dt>{copy.public}</dt><dd>{labelForPublicStatus(reference.public_status, language)}</dd></div>
          <div><dt>{copy.qualityStatus}</dt><dd>{labelForQualityStatus(reference.quality_status, language)}</dd></div>
        </dl>
        <p className="detail-callout">{reference.avoid_copying_notes ?? copy.defaultAvoidCopying}</p>
      </DetailSection>

      <DetailSection title={copy.scoreMatrix}>
        <div className="score-inspector-grid">
          <ScoreRadar
            profile={scoreProfile}
            title={copy.scoreProfile}
            incompleteLabel={copy.scoreProfileIncomplete}
          />
          <div className="score-summary">
            <span>{copy.rating}: {reference.rating ?? "-"}</span>
            <span>{copy.referenceValueScore}: {reference.reference_value_score ?? "-"}</span>
            <span>{copy.transformabilityScore}: {reference.transformability_score ?? "-"}</span>
            <span>{copy.copyrightRiskScore}: {reference.copyright_risk_score ?? "-"}</span>
            <span>{copy.productionReadinessScore}: {reference.production_readiness_score ?? "-"}</span>
          </div>
        </div>
      </DetailSection>

      <DetailSection
        title={copy.qualityChecklist}
        summary={
          <span className={`quality-chip ${quality.issueCount > 0 ? "warning" : "success"}`}>
            {quality.issueCount > 0
              ? `${copy.qualityIssueCount}: ${quality.issueCount}`
              : copy.qualityComplete}
          </span>
        }
      >
        <div className="quality-checklist">
          {quality.badges.length > 0 ? (
            <p className="quality-positive-signals">
              {copy.qualityPositiveSignals}: {quality.badges.map((badge) => labelForQualityBadge(badge.kind)).join(", ")}
            </p>
          ) : null}
          <div className="quality-checklist-grid">
            {(["source", "safety", "inspiration", "scores"] as const).map((group) => (
              <div className="quality-checklist-group" key={group}>
                <h4>{labelForQualityGroup(group)}</h4>
                {groupedIssues[group].length > 0 ? (
                  <ul>
                    {groupedIssues[group].map((issue) => (
                      <li key={`${issue.group}-${issue.field}`}>
                        <button
                          type="button"
                          className="quality-checklist-action"
                          data-quality-issue-field={issue.field}
                          onClick={() => onStartQualityEditing(issue)}
                          aria-label={`${copy.completeQualityIssue}: ${labelForQualityIssue(issue)}`}
                        >
                          <span>{labelForQualityIssue(issue)}</span>
                          <ArrowRight aria-hidden="true" size={15} />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>{copy.qualityComplete}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </DetailSection>

      <DetailSection title={copy.tagAxes}>
        <div className="tag-groups">
          <p><strong>{copy.styleTags}</strong> {reference.style_tags.join(", ") || "-"}</p>
          <p><strong>{copy.useTags}</strong> {reference.use_tags.join(", ") || "-"}</p>
          <p><strong>{copy.mechanicTags}</strong> {reference.mechanic_tags.join(", ") || "-"}</p>
          <p><strong>{copy.moodTags}</strong> {reference.mood_tags.join(", ") || "-"}</p>
          <p><strong>{copy.visualLanguageTags}</strong> {reference.visual_language_tags.join(", ") || "-"}</p>
        </div>
      </DetailSection>

      <DetailSection title={copy.inspirationExtraction}>
        <div className="inspiration-extraction">
          <InspirationGroup title={copy.inspirationObservation} items={observations} empty={copy.defaultInspiration} />
          <InspirationGroup title={copy.reusablePrinciples} items={principles} empty={copy.emptyInspirationEntries} />
          <InspirationGroup title={copy.inspirationAvoidCopying} items={avoidCopying} empty={copy.defaultAvoidCopying} />
          <InspirationGroup title={copy.transformationDirection} items={transformationDirections} empty={copy.defaultInspiration} />
        </div>
      </DetailSection>

      <div className="reference-detail__danger-zone">
        <button className="danger-button" type="button" onClick={onRequestDelete}>
          <Trash2 aria-hidden="true" size={16} />
          {copy.deleteReference}
        </button>
        {pendingDelete ? (
          <div className="delete-confirmation" role="alertdialog" aria-labelledby="delete-confirmation-title">
            <h3 id="delete-confirmation-title">{deleteCopy.title}</h3>
            <p>{deleteCopy.body}</p>
            <div className="confirmation-actions">
              <button type="button" className="ghost-button" onClick={onCancelDelete} disabled={isDeleting}>
                {deleteCopy.cancel}
              </button>
              <button type="button" className="danger-button" onClick={onConfirmDelete} disabled={isDeleting}>
                {isDeleting ? copy.deleting : deleteCopy.confirm}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function InspirationGroup({
  empty,
  items,
  title,
}: {
  empty: string;
  items: string[];
  title: string;
}) {
  return (
    <section className="inspiration-extraction__group">
      <h4>{title}</h4>
      {items.length > 0 ? (
        <ul>{items.map((item, index) => <li key={`${title}-${index}`}>{item}</li>)}</ul>
      ) : (
        <p>{empty}</p>
      )}
    </section>
  );
}
