"use client";

import { useState, type ReactNode } from "react";
import { labelForAssetCategory, type Language } from "../../lib/localization";
import { referenceArtFor } from "../../lib/reference-art";
import type { ReferenceRecord } from "../../lib/reference";

export type ReferencePreviewProps = {
  categoryLabelVisible?: boolean;
  className?: string;
  language: Language;
  overlay?: ReactNode;
  reference: ReferenceRecord;
};

function RemoteReferencePreview({ url }: { url: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return null;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className="reference-preview__remote"
      src={url}
      alt=""
      draggable={false}
      onError={() => setFailed(true)}
      style={{ gridArea: "1 / 1" }}
    />
  );
}

export function ReferencePreview({
  categoryLabelVisible = false,
  className,
  language,
  overlay,
  reference,
}: ReferencePreviewProps) {
  const previewUrl = reference.preview_url;

  return (
    <span
      className={["reference-preview", className].filter(Boolean).join(" ")}
      data-reference-art={reference.asset_category}
      style={{
        display: "grid",
        width: "100%",
        height: "100%",
        minHeight: 0,
        placeItems: "stretch",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="reference-preview__local"
        src={referenceArtFor(reference.asset_category)}
        alt=""
        draggable={false}
        style={{ gridArea: "1 / 1" }}
      />
      {previewUrl ? (
        <RemoteReferencePreview key={previewUrl} url={previewUrl} />
      ) : null}
      {categoryLabelVisible ? (
        <span className="reference-card__category reference-preview__category">
          {labelForAssetCategory(reference.asset_category, language)}
        </span>
      ) : null}
      {overlay}
    </span>
  );
}
