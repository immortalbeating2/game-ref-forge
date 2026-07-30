"use client";

import { ChevronDown, ChevronUp, Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  labelForAssetCategory,
  type Language,
  type uiCopy,
} from "../../lib/localization";
import type { ReferenceRecord } from "../../lib/reference";

type ComparisonCopy = ReturnType<typeof uiCopy>;

function ComparisonPreview({
  language,
  reference,
}: {
  language: Language;
  reference: ReferenceRecord;
}) {
  const previewUrl = reference.preview_url;
  const [failedPreviewUrl, setFailedPreviewUrl] = useState<string | null>(null);
  const previewVisible = Boolean(previewUrl) && failedPreviewUrl !== previewUrl;

  return previewVisible ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={previewUrl ?? ""}
      alt=""
      onError={() => setFailedPreviewUrl(previewUrl)}
    />
  ) : (
    <span>{labelForAssetCategory(reference.asset_category, language)}</span>
  );
}

export type ComparisonDockProps = {
  canHandoff: boolean;
  copy: ComparisonCopy;
  language?: Language;
  onCancel: () => void;
  onEnter: () => void;
  onRemove: (referenceId: string) => void;
  references: ReferenceRecord[];
};

export function ComparisonDock({
  canHandoff,
  copy,
  language = "en",
  onCancel,
  onEnter,
  onRemove,
  references,
}: ComparisonDockProps) {
  const [expanded, setExpanded] = useState(true);
  const missingCount = Math.max(0, 2 - references.length);
  const toggleLabel = expanded
    ? copy.collapseComparisonDock
    : copy.expandComparisonDock;

  useEffect(() => {
    function collapseOnEscape(event: KeyboardEvent) {
      if (
        event.key === "Escape" &&
        expanded &&
        !document.querySelector('[role="dialog"], [role="alertdialog"]')
      ) {
        setExpanded(false);
      }
    }

    window.addEventListener("keydown", collapseOnEscape);
    return () => window.removeEventListener("keydown", collapseOnEscape);
  }, [expanded]);

  return (
    <section
      className={`comparison-dock${expanded ? "" : " comparison-dock--collapsed"}`}
      role="status"
      aria-live="polite"
    >
      <header className="comparison-dock__header">
        <div>
          <p className="panel-kicker">{copy.startComparison}</p>
          <strong>
            {copy.comparisonCount.replace("{count}", String(references.length))}
          </strong>
          {missingCount > 0 ? (
            <span>
              {copy.comparisonNeedsMore.replace(
                "{count}",
                String(missingCount),
              )}
            </span>
          ) : null}
        </div>
        <button
          type="button"
          className="comparison-dock__toggle"
          aria-label={toggleLabel}
          aria-expanded={expanded}
          title={toggleLabel}
          onClick={() => setExpanded((current) => !current)}
        >
          {expanded ? (
            <ChevronDown aria-hidden="true" size={17} />
          ) : (
            <ChevronUp aria-hidden="true" size={17} />
          )}
        </button>
      </header>

      {expanded ? (
        <ol className="comparison-dock__items">
          {references.map((reference, index) => (
            <li key={reference.id}>
              <span className="comparison-dock__position">{index + 1}</span>
              <span
                className={`comparison-dock__thumbnail accent-${reference.asset_category}`}
              >
                <ComparisonPreview
                  language={language}
                  reference={reference}
                />
              </span>
              <span className="comparison-dock__identity">
                <strong>{reference.title}</strong>
                <span>{reference.site_name ?? copy.unknownSource}</span>
              </span>
              <button
                type="button"
                className="comparison-dock__remove"
                aria-label={`${copy.removeFromComparison}: ${reference.title}`}
                title={copy.removeFromComparison}
                onClick={() => onRemove(reference.id)}
              >
                <X aria-hidden="true" size={15} />
              </button>
            </li>
          ))}
        </ol>
      ) : null}

      <div className="comparison-dock__actions">
        <button className="ghost-button" type="button" onClick={onCancel}>
          {copy.cancelComparison}
        </button>
        <button type="button" onClick={onEnter} disabled={!canHandoff}>
          <Sparkles aria-hidden="true" size={16} />
          {copy.enterSynthesis}
        </button>
      </div>
    </section>
  );
}
