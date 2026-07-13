"use client";

import type React from "react";

import type { Language } from "../../lib/localization";
import {
  labelForAssetCategory,
  labelForLicenseStatus,
  labelForPublicStatus,
  labelForQualityStatus,
  uiCopy,
} from "../../lib/localization";
import type { SynthesisReferenceLink } from "../../lib/synthesis";

export type SynthesisReferenceCardProps = {
  language: Language;
  link: SynthesisReferenceLink;
  isRefreshing: boolean;
  isRefreshDisabled: boolean;
  onRefresh: (link: SynthesisReferenceLink) => void;
};

export function SynthesisReferenceCard(_props: SynthesisReferenceCardProps): React.JSX.Element {
  const { language, link, isRefreshing, isRefreshDisabled, onRefresh } = _props;
  const copy = uiCopy(language);
  const { snapshot } = link;
  const sourceMissing = !snapshot.source_url || !snapshot.site_name || !snapshot.author;
  const safetyMissing = snapshot.license_status === "unknown_license" || !snapshot.inspiration.avoid_copying_notes;
  const scoreValues = Object.values(snapshot.scores);
  const scoresMissing = scoreValues.some((score) => score === null);
  const tagsMissing = Object.values(snapshot.tags).every((tags) => tags.length === 0);
  const inspirationMissing = snapshot.inspiration.inspiration_points.length === 0
    && snapshot.inspiration.inspiration_entries.length === 0
    && !snapshot.inspiration.deconstruction_notes
    && !snapshot.inspiration.transformation_ideas;
  const warnings = [
    sourceMissing ? copy.qualitySourceGroup : null,
    safetyMissing ? copy.qualitySafetyGroup : null,
    scoresMissing ? copy.qualityScoresGroup : null,
    tagsMissing ? copy.tagAxes : null,
    inspirationMissing ? copy.qualityInspirationGroup : null,
  ].filter((warning): warning is string => Boolean(warning));
  const tags = Object.values(snapshot.tags).flat().slice(0, 6);

  return (
    <article className={`synthesis-reference-card${link.stale ? " is-stale" : ""}${!link.available ? " is-unavailable" : ""}`}>
      <header>
        <span>{link.position + 1}</span>
        <div>
          <h3>{snapshot.title}</h3>
          <a href={snapshot.source_url} target="_blank" rel="noreferrer">{snapshot.site_name || snapshot.source_url}</a>
        </div>
      </header>
      <p className="synthesis-reference-meta">
        {labelForAssetCategory(snapshot.asset_category, language)} · {labelForLicenseStatus(snapshot.license_status, language)} · {labelForPublicStatus(snapshot.public_status, language)} · {labelForQualityStatus(snapshot.quality_status, language)}
      </p>
      <dl className="synthesis-score-list">
        <div><dt>{copy.rating}</dt><dd>{snapshot.scores.rating ?? "-"}</dd></div>
        <div><dt>{copy.referenceValueScore}</dt><dd>{snapshot.scores.reference_value_score ?? "-"}</dd></div>
        <div><dt>{copy.transformabilityScore}</dt><dd>{snapshot.scores.transformability_score ?? "-"}</dd></div>
        <div><dt>{copy.copyrightRiskScore}</dt><dd>{snapshot.scores.copyright_risk_score ?? "-"}</dd></div>
        <div><dt>{copy.productionReadinessScore}</dt><dd>{snapshot.scores.production_readiness_score ?? "-"}</dd></div>
      </dl>
      {tags.length > 0 ? <p className="synthesis-reference-tags">{tags.map((tag) => <span key={tag}>{tag}</span>)}</p> : null}
      {snapshot.inspiration.inspiration_points.length > 0 ? <p>{snapshot.inspiration.inspiration_points.slice(0, 2).join(" · ")}</p> : null}
      {snapshot.inspiration.deconstruction_notes ? <p>{snapshot.inspiration.deconstruction_notes}</p> : null}
      {warnings.length > 0 ? <p className="synthesis-reference-warning">{warnings.join(" · ")}</p> : null}
      {link.stale ? <p className="synthesis-reference-warning" role="status">{copy.staleReference}</p> : null}
      {!link.available ? <p className="synthesis-reference-warning" role="status">{copy.unavailableReference}</p> : null}
      {link.available ? (
        <button className="ghost-button" type="button" onClick={() => onRefresh(link)} disabled={isRefreshing || isRefreshDisabled}>
          {isRefreshing ? copy.refreshingSnapshot : copy.refreshSnapshot}
        </button>
      ) : null}
    </article>
  );
}
