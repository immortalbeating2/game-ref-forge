import type { ReferenceRecord } from "./reference";

export type ReferenceScoreAxis = {
  key:
    | "rating"
    | "reference_value"
    | "transformability"
    | "production_readiness"
    | "safety";
  label: string;
  value: number | null;
};

export type ReferenceScoreProfile = {
  axes: ReferenceScoreAxis[];
  complete: boolean;
};

type ReferenceScoreLabels = {
  rating: string;
  referenceValue: string;
  transformability: string;
  productionReadiness: string;
  safety: string;
};

function score(value: number | null) {
  return value !== null && Number.isInteger(value) && value >= 1 && value <= 5
    ? value
    : null;
}

export function buildReferenceScoreProfile(
  reference: ReferenceRecord,
  labels: ReferenceScoreLabels,
): ReferenceScoreProfile {
  const copyrightRisk = score(reference.copyright_risk_score);
  const safety = copyrightRisk === null ? null : 6 - copyrightRisk;
  const axes: ReferenceScoreAxis[] = [
    { key: "rating", label: labels.rating, value: score(reference.rating) },
    {
      key: "reference_value",
      label: labels.referenceValue,
      value: score(reference.reference_value_score),
    },
    {
      key: "transformability",
      label: labels.transformability,
      value: score(reference.transformability_score),
    },
    {
      key: "production_readiness",
      label: labels.productionReadiness,
      value: score(reference.production_readiness_score),
    },
    { key: "safety", label: labels.safety, value: safety },
  ];

  return {
    axes,
    complete: axes.every((axis) => axis.value !== null),
  };
}
