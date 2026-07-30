"use client";

import { Check, Pin, PinOff, Plus } from "lucide-react";
import { useState } from "react";
import {
  labelForAssetCategory,
  labelForLicenseStatus,
  labelForPublicStatus,
  labelForQualityStatus,
  type Language,
  type uiCopy,
} from "../../lib/localization";
import type { ReferenceRecord } from "../../lib/reference";
import {
  evaluateReferenceQuality,
  type ReferenceQualityBadgeKind,
} from "../../lib/reference-quality";
import type { WorkspaceDensity } from "../../lib/workspace-view-preferences";

type CardCopy = ReturnType<typeof uiCopy>;

export type ReferenceCardProps = {
  copy: CardCopy;
  density: WorkspaceDensity;
  disabled: boolean;
  isComparisonMode: boolean;
  isComparisonSelected: boolean;
  isPinned: boolean;
  isSelected: boolean;
  language: Language;
  limitReached: boolean;
  onActivate: () => void;
  onTogglePinned: () => void;
  reference: ReferenceRecord;
};

function qualityBadgeLabel(kind: ReferenceQualityBadgeKind, copy: CardCopy) {
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

export function ReferenceCard({
  copy,
  density,
  disabled,
  isComparisonMode,
  isComparisonSelected,
  isPinned,
  isSelected,
  language,
  limitReached,
  onActivate,
  onTogglePinned,
  reference,
}: ReferenceCardProps) {
  const [failedPreviewUrl, setFailedPreviewUrl] = useState<string | null>(null);
  const quality = evaluateReferenceQuality(reference);
  const previewVisible =
    Boolean(reference.preview_url) &&
    failedPreviewUrl !== reference.preview_url;
  const tags = [
    ...reference.mechanic_tags,
    ...reference.mood_tags,
    ...reference.visual_language_tags,
  ].slice(0, 3);

  return (
    <article
      className={[
        "reference-card",
        `reference-card--${density}`,
        isSelected ? "selected" : "",
        isComparisonSelected ? "comparison-selected" : "",
        limitReached ? "comparison-limit-reached" : "",
      ].filter(Boolean).join(" ")}
    >
      <button
        type="button"
        className="reference-card__select"
        role={isComparisonMode ? "checkbox" : undefined}
        aria-label={reference.title}
        aria-checked={isComparisonMode ? isComparisonSelected : undefined}
        aria-pressed={isComparisonMode ? undefined : isSelected}
        disabled={disabled}
        onClick={onActivate}
      >
        <span className={`thumbnail accent-${reference.asset_category}`}>
          {previewVisible ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={reference.preview_url ?? ""}
              alt=""
              onError={() => setFailedPreviewUrl(reference.preview_url)}
            />
          ) : (
            <span>{labelForAssetCategory(reference.asset_category, language)}</span>
          )}
          {previewVisible ? (
            <span className="reference-card__category">
              {labelForAssetCategory(reference.asset_category, language)}
            </span>
          ) : null}
          {isComparisonMode ? (
            <span className="reference-card__comparison-marker" aria-hidden="true">
              {isComparisonSelected ? <Check size={15} /> : <Plus size={15} />}
            </span>
          ) : null}
        </span>

        <span className="card-body">
          <span className="card-topline">
            {isComparisonSelected ? (
              <span className="comparison-selection-indicator">
                {copy.selectedForComparison}
              </span>
            ) : isPinned ? (
              <span>{copy.pinned}</span>
            ) : (
              <span>{reference.site_name ?? copy.unknownSource}</span>
            )}
          </span>

          <span className="card-meta">
            <span className="reference-card__title">{reference.title}</span>
            <span>{reference.site_name ?? copy.unknownSource}</span>
          </span>

          <span className="badge-row">
            <span>{labelForLicenseStatus(reference.license_status, language)}</span>
            <span>{labelForPublicStatus(reference.public_status, language)}</span>
            <span>{labelForQualityStatus(reference.quality_status, language)}</span>
          </span>

          <span className="compact-score-row" aria-label={copy.scoreSummary}>
            <span>
              {copy.referenceValueScore}: {reference.reference_value_score ?? "-"}
            </span>
            <span>
              {copy.transformabilityScore}: {reference.transformability_score ?? "-"}
            </span>
            <span>
              {copy.copyrightRiskScore}: {reference.copyright_risk_score ?? "-"}
            </span>
          </span>

          <span className="quality-chip-row" aria-label={copy.qualityChecklist}>
            <span
              className={`quality-chip ${
                quality.issueCount > 0 ? "warning" : "success"
              }`}
            >
              {quality.issueCount > 0
                ? `${copy.qualityIssueCount}: ${quality.issueCount}`
                : copy.qualityComplete}
            </span>
            {quality.badges.slice(0, 2).map((badge) => (
              <span className="quality-chip" key={badge.kind}>
                {qualityBadgeLabel(badge.kind, copy)}
              </span>
            ))}
          </span>

          <span className="tag-preview">
            {tags.join(" · ") || copy.defaultInspiration}
          </span>
        </span>
      </button>

      <button
        type="button"
        className="reference-card__pin"
        aria-label={isPinned ? copy.unpinReference : copy.pinReference}
        aria-pressed={isPinned}
        disabled={disabled || isComparisonMode}
        onClick={onTogglePinned}
      >
        {isPinned ? (
          <PinOff aria-hidden="true" size={15} />
        ) : (
          <Pin aria-hidden="true" size={15} />
        )}
      </button>
    </article>
  );
}
