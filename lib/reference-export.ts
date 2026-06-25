import { ReferenceRecord } from "./reference";

function list(values: string[]) {
  return values.length > 0 ? values.join(", ") : "-";
}

function value(value: string | number | null | undefined) {
  return value === null || value === undefined || value === "" ? "-" : String(value);
}

export function safeExportFilename(title: string, extension: "md" | "json") {
  const slug =
    title
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "ref-forge-export";
  const stamp = new Date().toISOString().slice(0, 10);

  return `${slug}-${stamp}.${extension}`;
}

export function formatReferenceMarkdown(reference: ReferenceRecord) {
  const entries = reference.inspiration_entries
    .map(
      (entry, index) => `### Entry ${index + 1}

- Observation: ${value(entry.observation)}
- Principle: ${value(entry.principle)}
- Transferable idea: ${value(entry.transferable_idea)}
- Original application: ${value(entry.original_application)}
- Avoid copying: ${value(entry.avoid_copying)}`,
    )
    .join("\n\n");

  return `# ${reference.title}

## Source

- source_url: ${reference.source_url}
- canonical_url: ${value(reference.canonical_url)}
- site_name: ${value(reference.site_name)}
- author: ${value(reference.author)}

## Safety

- license_status: ${reference.license_status}
- public_status: ${reference.public_status}
- quality_status: ${reference.quality_status}
- avoid_copying_notes: ${value(reference.avoid_copying_notes)}

## Scores

- rating: ${value(reference.rating)}
- reference_value_score: ${value(reference.reference_value_score)}
- transformability_score: ${value(reference.transformability_score)}
- copyright_risk_score: ${value(reference.copyright_risk_score)}
- production_readiness_score: ${value(reference.production_readiness_score)}

## Tags

- style_tags: ${list(reference.style_tags)}
- use_tags: ${list(reference.use_tags)}
- mechanic_tags: ${list(reference.mechanic_tags)}
- mood_tags: ${list(reference.mood_tags)}
- visual_language_tags: ${list(reference.visual_language_tags)}

## Inspiration Points

${reference.inspiration_points.map((point) => `- ${point}`).join("\n") || "-"}

## Structured Inspiration

${entries || "-"}

## Notes

- deconstruction_notes: ${value(reference.deconstruction_notes)}
- transformation_ideas: ${value(reference.transformation_ideas)}
- related_original_asset: ${value(reference.related_original_asset)}
`;
}

export function createReferenceJsonExport(references: ReferenceRecord[]) {
  return {
    exported_at: new Date().toISOString(),
    count: references.length,
    references,
  };
}
