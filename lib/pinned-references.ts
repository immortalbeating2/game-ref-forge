export const PINNED_REFERENCES_STORAGE_KEY = "ref-forge:pinned-reference-ids";

function normalizeIds(ids: unknown[]) {
  const unique = new Set<string>();

  ids.forEach((id) => {
    if (typeof id === "string" && id.trim().length > 0) {
      unique.add(id.trim());
    }
  });

  return Array.from(unique);
}

export function parsePinnedReferenceIds(value: string | null) {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? normalizeIds(parsed) : [];
  } catch {
    return [];
  }
}

export function serializePinnedReferenceIds(ids: string[]) {
  return JSON.stringify(normalizeIds(ids));
}

export function togglePinnedReferenceId(ids: string[], id: string) {
  const normalized = normalizeIds(ids);
  const target = id.trim();

  if (!target) {
    return normalized;
  }

  return normalized.includes(target)
    ? normalized.filter((item) => item !== target)
    : [...normalized, target];
}
