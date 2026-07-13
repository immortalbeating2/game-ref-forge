import type {
  SynthesisDetail,
  SynthesisReferenceLink,
} from "./synthesis";

function value(input: string | null | undefined) {
  const trimmed = input?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : "-";
}

function textSection(input: string | null | undefined) {
  return value(input);
}

function formatReference(link: SynthesisReferenceLink, index: number) {
  const snapshot = link.snapshot;
  const source = snapshot.source_url
    ? `[${snapshot.source_url}](${snapshot.source_url})`
    : "-";
  const state = link.available
    ? link.stale
      ? "Stale snapshot"
      : "Available"
    : "Unavailable";

  return `### ${index + 1}. ${value(snapshot.title)}

- Source: ${source}
- State: ${state}`;
}

function section(title: string, body: string) {
  return `## ${title}\n\n${body || "-"}`;
}

export function formatSynthesisMarkdown(
  detail: SynthesisDetail,
  options: { unsaved?: boolean; exportedAt?: string } = {},
) {
  const references = [...detail.references]
    .sort((left, right) => left.position - right.position)
    .map(formatReference)
    .join("\n\n");
  const sections = [
    `# ${value(detail.title)}`,
    section(
      "Status and target asset",
      `- status: ${detail.status}\n- target_asset: ${value(detail.target_asset)}`,
    ),
  ];

  if (options.unsaved) {
    sections.push(section("Unsaved changes", "- This export includes unsaved changes."));
  }

  sections.push(
    section("References", references),
    section("Shared principles", textSection(detail.shared_principles)),
    section("Key differences", textSection(detail.key_differences)),
    section("Original direction", textSection(detail.original_direction)),
    section("Avoid copying", textSection(detail.avoid_copying_notes)),
    section("Design constraints", textSection(detail.design_constraints)),
    section("Experiment plan", textSection(detail.experiment_plan)),
    section("Next actions", textSection(detail.next_actions)),
    section("Additional notes", textSection(detail.additional_notes)),
    section("Exported at", `- exported_at: ${value(options.exportedAt ?? new Date().toISOString())}`),
  );

  return `${sections.join("\n\n")}\n`;
}

function slugForSynthesis(title: string) {
  return (
    title
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "synthesis-export"
  );
}

export function safeSynthesisExportFilename(title: string, date = new Date()) {
  const stamp = date.toISOString().slice(0, 10);
  return `${slugForSynthesis(title)}-synthesis-${stamp}.md`;
}
