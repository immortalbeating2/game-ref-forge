# Research Workflow Efficiency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add sorting, pinned references, export actions, and structured-inspiration editing refinements to make the Round 7 workstation faster for repeated personal research use.

**Architecture:** Keep the existing single-page vinext/React app and D1 API unchanged. Add focused frontend helper modules for sorting, pinning, and export formatting, then wire them into `app/page.tsx` with localized copy and focused tests.

**Tech Stack:** vinext/React, TypeScript, CSS, Vitest, browser localStorage, browser Blob downloads.

---

## File Structure

- Create: `lib/pinned-references.ts`
  - Parse, serialize, and toggle device-local pinned reference ids.
- Create: `tests/pinned-references.test.ts`
  - Cover local-storage-safe parsing and toggling behavior.
- Create: `lib/reference-sort.ts`
  - Define sort modes and sort references with pinned-first behavior.
- Create: `tests/reference-sort.test.ts`
  - Cover pinned-first sorting, score sorting, missing scores, risk sorting, and title sorting.
- Create: `lib/reference-export.ts`
  - Format selected-reference Markdown, build full-library JSON payloads, and create safe filenames.
- Create: `tests/reference-export.test.ts`
  - Cover Markdown and JSON export content.
- Modify: `lib/localization.ts`
  - Add Round 8 UI copy keys for sorting, pinning, exports, and inspiration entry count.
- Modify: `tests/localization.test.ts`
  - Assert Chinese and English Round 8 copy exists.
- Modify: `app/page.tsx`
  - Add sort state, pinned state, export actions, pin buttons, and refined inspiration entry copy.
- Modify: `app/globals.css`
  - Style sort/export controls, pin button, and compact entry count without breaking Round 7 layout.
- Modify: `docs/progress/2026-06-26.md`, `docs/progress/status.md`, `docs/progress/timeline.md`
  - Record implementation and verification results.

## Task 1: Pinned Reference Helpers

**Files:**
- Create: `lib/pinned-references.ts`
- Create: `tests/pinned-references.test.ts`

- [x] **Step 1: Write failing tests**

Create `tests/pinned-references.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  parsePinnedReferenceIds,
  serializePinnedReferenceIds,
  togglePinnedReferenceId,
} from "../lib/pinned-references";

describe("pinned reference helpers", () => {
  it("parses a stored id list and drops invalid values", () => {
    expect(parsePinnedReferenceIds(JSON.stringify(["a", "", 7, "b", "a"]))).toEqual([
      "a",
      "b",
    ]);
  });

  it("falls back to an empty list for broken storage data", () => {
    expect(parsePinnedReferenceIds("not-json")).toEqual([]);
  });

  it("serializes unique non-empty ids", () => {
    expect(serializePinnedReferenceIds(["a", "", "b", "a"])).toBe(
      JSON.stringify(["a", "b"]),
    );
  });

  it("toggles ids while preserving order", () => {
    expect(togglePinnedReferenceId(["a"], "b")).toEqual(["a", "b"]);
    expect(togglePinnedReferenceId(["a", "b"], "a")).toEqual(["b"]);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- tests/pinned-references.test.ts
```

Expected: FAIL because `../lib/pinned-references` does not exist.

- [x] **Step 3: Implement helper**

Create `lib/pinned-references.ts`:

```ts
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
```

- [x] **Step 4: Run test to verify it passes**

Run:

```bash
npm test -- tests/pinned-references.test.ts
```

Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add lib/pinned-references.ts tests/pinned-references.test.ts
git commit -m "feat: 增加引用置顶 helper / add pinned reference helpers"
```

## Task 2: Reference Sorting

**Files:**
- Create: `lib/reference-sort.ts`
- Create: `tests/reference-sort.test.ts`

- [x] **Step 1: Write failing tests**

Create `tests/reference-sort.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { ReferenceRecord } from "../lib/reference";
import { sortReferences } from "../lib/reference-sort";

function record(overrides: Partial<ReferenceRecord>): ReferenceRecord {
  return {
    id: "base",
    title: "Base",
    source_url: "https://example.com/base",
    canonical_url: null,
    site_name: null,
    author: null,
    preview_url: null,
    media_type: "image",
    asset_category: "prop",
    source_category: null,
    style_tags: [],
    use_tags: [],
    mechanic_tags: [],
    mood_tags: [],
    visual_language_tags: [],
    license_status: "private_reference",
    attribution_text: null,
    public_status: "private",
    quality_status: "captured",
    rating: null,
    reference_value_score: null,
    transformability_score: null,
    copyright_risk_score: null,
    production_readiness_score: null,
    inspiration_points: [],
    inspiration_entries: [],
    deconstruction_notes: null,
    transformation_ideas: null,
    avoid_copying_notes: null,
    related_original_asset: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("sortReferences", () => {
  it("keeps pinned references first before applying updated sort", () => {
    const rows = [
      record({ id: "old-pinned", title: "Old pinned", updated_at: "2026-01-01T00:00:00.000Z" }),
      record({ id: "new", title: "New", updated_at: "2026-02-01T00:00:00.000Z" }),
    ];

    expect(sortReferences(rows, "updated_desc", ["old-pinned"]).map((item) => item.id)).toEqual([
      "old-pinned",
      "new",
    ]);
  });

  it("sorts reference value score descending with missing values last", () => {
    const rows = [
      record({ id: "missing", reference_value_score: null }),
      record({ id: "low", reference_value_score: 2 }),
      record({ id: "high", reference_value_score: 5 }),
    ];

    expect(sortReferences(rows, "reference_value_desc", []).map((item) => item.id)).toEqual([
      "high",
      "low",
      "missing",
    ]);
  });

  it("sorts copyright risk ascending", () => {
    const rows = [
      record({ id: "high-risk", copyright_risk_score: 5 }),
      record({ id: "low-risk", copyright_risk_score: 1 }),
    ];

    expect(sortReferences(rows, "copyright_risk_asc", []).map((item) => item.id)).toEqual([
      "low-risk",
      "high-risk",
    ]);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- tests/reference-sort.test.ts
```

Expected: FAIL because `../lib/reference-sort` does not exist.

- [x] **Step 3: Implement sorter**

Create `lib/reference-sort.ts`:

```ts
import { ReferenceRecord } from "./reference";

export const REFERENCE_SORT_MODES = [
  "updated_desc",
  "reference_value_desc",
  "transformability_desc",
  "copyright_risk_asc",
  "production_readiness_desc",
  "title_asc",
] as const;

export type ReferenceSortMode = (typeof REFERENCE_SORT_MODES)[number];

function compareNullableScore(
  left: number | null,
  right: number | null,
  direction: "asc" | "desc",
) {
  if (left === null && right === null) {
    return 0;
  }

  if (left === null) {
    return 1;
  }

  if (right === null) {
    return -1;
  }

  return direction === "asc" ? left - right : right - left;
}

function compareByMode(
  left: ReferenceRecord,
  right: ReferenceRecord,
  mode: ReferenceSortMode,
) {
  switch (mode) {
    case "reference_value_desc":
      return compareNullableScore(left.reference_value_score, right.reference_value_score, "desc");
    case "transformability_desc":
      return compareNullableScore(left.transformability_score, right.transformability_score, "desc");
    case "copyright_risk_asc":
      return compareNullableScore(left.copyright_risk_score, right.copyright_risk_score, "asc");
    case "production_readiness_desc":
      return compareNullableScore(
        left.production_readiness_score,
        right.production_readiness_score,
        "desc",
      );
    case "title_asc":
      return left.title.localeCompare(right.title);
    case "updated_desc":
    default:
      return right.updated_at.localeCompare(left.updated_at);
  }
}

export function sortReferences(
  references: ReferenceRecord[],
  mode: ReferenceSortMode,
  pinnedIds: string[],
) {
  const pinned = new Set(pinnedIds);

  return [...references].sort((left, right) => {
    const leftPinned = pinned.has(left.id);
    const rightPinned = pinned.has(right.id);

    if (leftPinned !== rightPinned) {
      return leftPinned ? -1 : 1;
    }

    const modeResult = compareByMode(left, right, mode);
    return modeResult === 0 ? left.title.localeCompare(right.title) : modeResult;
  });
}
```

- [x] **Step 4: Run test to verify it passes**

Run:

```bash
npm test -- tests/reference-sort.test.ts
```

Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add lib/reference-sort.ts tests/reference-sort.test.ts
git commit -m "feat: 增加引用排序 helper / add reference sorting helpers"
```

## Task 3: Export Formatting

**Files:**
- Create: `lib/reference-export.ts`
- Create: `tests/reference-export.test.ts`

- [x] **Step 1: Write failing tests**

Create `tests/reference-export.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { ReferenceRecord } from "../lib/reference";
import {
  createReferenceJsonExport,
  formatReferenceMarkdown,
  safeExportFilename,
} from "../lib/reference-export";

const reference: ReferenceRecord = {
  id: "ref-1",
  title: "Kenney UI Pack",
  source_url: "https://kenney.nl/assets/ui-pack",
  canonical_url: null,
  site_name: "Kenney",
  author: "Kenney",
  preview_url: null,
  media_type: "asset_pack",
  asset_category: "ui_hud",
  source_category: null,
  style_tags: ["clean"],
  use_tags: ["inventory"],
  mechanic_tags: ["interaction feedback"],
  mood_tags: ["friendly"],
  visual_language_tags: ["panel rhythm"],
  license_status: "cc0_or_public_domain",
  attribution_text: null,
  public_status: "review",
  quality_status: "analyzed",
  rating: 4,
  reference_value_score: 4,
  transformability_score: 5,
  copyright_risk_score: 1,
  production_readiness_score: 4,
  inspiration_points: ["Button state clarity"],
  inspiration_entries: [
    {
      id: "entry-1",
      observation: "Buttons have clear state contrast.",
      principle: "Readable state contrast helps stressful HUD use.",
      transferable_idea: "Use contrast hierarchy, not exact art.",
      original_application: "Original crafting interface.",
      avoid_copying: "Do not copy icons.",
    },
  ],
  deconstruction_notes: "Useful panel rhythm.",
  transformation_ideas: "Apply to a crafting UI.",
  avoid_copying_notes: "Do not copy exact icons.",
  related_original_asset: "Inventory HUD",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-02T00:00:00.000Z",
};

describe("reference export helpers", () => {
  it("formats markdown with source, safety, scores, tags, and structured inspiration", () => {
    const markdown = formatReferenceMarkdown(reference);

    expect(markdown).toContain("# Kenney UI Pack");
    expect(markdown).toContain("https://kenney.nl/assets/ui-pack");
    expect(markdown).toContain("cc0_or_public_domain");
    expect(markdown).toContain("reference_value_score: 4");
    expect(markdown).toContain("interaction feedback");
    expect(markdown).toContain("Buttons have clear state contrast.");
  });

  it("creates a full-library JSON export payload", () => {
    const payload = createReferenceJsonExport([reference]);

    expect(payload.exported_at).toEqual(expect.any(String));
    expect(payload.count).toBe(1);
    expect(payload.references[0].id).toBe("ref-1");
  });

  it("creates safe filenames", () => {
    expect(safeExportFilename("Kenney UI Pack!", "md")).toMatch(/^kenney-ui-pack-.*\\.md$/);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- tests/reference-export.test.ts
```

Expected: FAIL because `../lib/reference-export` does not exist.

- [x] **Step 3: Implement export helpers**

Create `lib/reference-export.ts`:

```ts
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
```

- [x] **Step 4: Run test to verify it passes**

Run:

```bash
npm test -- tests/reference-export.test.ts
```

Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add lib/reference-export.ts tests/reference-export.test.ts
git commit -m "feat: 增加引用导出 helper / add reference export helpers"
```

## Task 4: Localization Copy

**Files:**
- Modify: `lib/localization.ts`
- Modify: `tests/localization.test.ts`

- [x] **Step 1: Write failing localization expectations**

Add expectations to `tests/localization.test.ts`:

```ts
expect(uiCopy().sortBy).toBe("排序");
expect(uiCopy().pinReference).toBe("置顶参考");
expect(uiCopy().exportMarkdown).toBe("导出 Markdown");
expect(uiCopy().exportJson).toBe("导出 JSON");
expect(uiCopy("en").sortBy).toBe("Sort by");
expect(uiCopy("en").pinReference).toBe("Pin reference");
expect(uiCopy("en").exportMarkdown).toBe("Export Markdown");
expect(uiCopy("en").exportJson).toBe("Export JSON");
```

- [x] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- tests/localization.test.ts
```

Expected: FAIL because the new copy keys do not exist.

- [x] **Step 3: Add copy keys**

Add these keys to both language objects in `lib/localization.ts`:

```ts
sortBy: "排序",
sortUpdated: "最近更新",
sortReferenceValue: "参考价值",
sortTransformability: "可转化性",
sortCopyrightRisk: "版权风险最低",
sortProductionReadiness: "制作就绪度",
sortTitle: "标题",
pinReference: "置顶参考",
unpinReference: "取消置顶",
pinned: "已置顶",
exportMarkdown: "导出 Markdown",
exportJson: "导出 JSON",
exportUnavailable: "请选择一条参考后再导出。",
inspirationEntryCount: "结构化灵感条目",
```

Use English equivalents in the English object:

```ts
sortBy: "Sort by",
sortUpdated: "Recently updated",
sortReferenceValue: "Reference value",
sortTransformability: "Transformability",
sortCopyrightRisk: "Lowest copyright risk",
sortProductionReadiness: "Production readiness",
sortTitle: "Title",
pinReference: "Pin reference",
unpinReference: "Unpin reference",
pinned: "Pinned",
exportMarkdown: "Export Markdown",
exportJson: "Export JSON",
exportUnavailable: "Select a reference before exporting.",
inspirationEntryCount: "Structured inspiration entries",
```

- [x] **Step 4: Run test to verify it passes**

Run:

```bash
npm test -- tests/localization.test.ts
```

Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add lib/localization.ts tests/localization.test.ts
git commit -m "feat: 增加研究效率文案 / add research workflow copy"
```

## Task 5: Wire UI Behavior

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/globals.css`

- [x] **Step 1: Import helpers and add state**

In `app/page.tsx`, import:

```ts
import {
  PINNED_REFERENCES_STORAGE_KEY,
  parsePinnedReferenceIds,
  serializePinnedReferenceIds,
  togglePinnedReferenceId,
} from "../lib/pinned-references";
import { formatReferenceMarkdown, createReferenceJsonExport, safeExportFilename } from "../lib/reference-export";
import { ReferenceSortMode, REFERENCE_SORT_MODES, sortReferences } from "../lib/reference-sort";
```

Add state:

```ts
const [sortMode, setSortMode] = useState<ReferenceSortMode>("updated_desc");
const [pinnedReferenceIds, setPinnedReferenceIds] = useState<string[]>([]);
```

- [x] **Step 2: Load and persist pinned ids**

Add effects:

```ts
useEffect(() => {
  setPinnedReferenceIds(
    parsePinnedReferenceIds(window.localStorage.getItem(PINNED_REFERENCES_STORAGE_KEY)),
  );
}, []);

useEffect(() => {
  window.localStorage.setItem(
    PINNED_REFERENCES_STORAGE_KEY,
    serializePinnedReferenceIds(pinnedReferenceIds),
  );
}, [pinnedReferenceIds]);
```

- [x] **Step 3: Sort filtered references**

Replace direct use of `filteredReferences` in selection/gallery rendering with:

```ts
const sortedReferences = useMemo(
  () => sortReferences(filteredReferences, sortMode, pinnedReferenceIds),
  [filteredReferences, pinnedReferenceIds, sortMode],
);
```

Pass `sortedReferences` to `getVisibleDetailReference` and card rendering.

- [x] **Step 4: Add sort and export controls**

In the toolbar actions, add a sort `<select>` and JSON export button. Use `REFERENCE_SORT_MODES` and localized labels.

- [x] **Step 5: Add pin toggle**

On each card, add a compact pin button:

```tsx
<button
  type="button"
  className="pin-button"
  aria-pressed={pinnedReferenceIds.includes(reference.id)}
  onClick={(event) => {
    event.stopPropagation();
    setPinnedReferenceIds((current) => togglePinnedReferenceId(current, reference.id));
  }}
>
  {pinnedReferenceIds.includes(reference.id) ? copy.pinned : copy.pinReference}
</button>
```

- [x] **Step 6: Add export helpers in component**

Add download helper:

```ts
function downloadText(filename: string, text: string, type: string) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
```

Add actions:

```ts
function exportSelectedMarkdown() {
  if (!selectedReference) {
    setMessage(copy.exportUnavailable);
    return;
  }

  downloadText(
    safeExportFilename(selectedReference.title, "md"),
    formatReferenceMarkdown(selectedReference),
    "text/markdown;charset=utf-8",
  );
}

function exportLibraryJson() {
  downloadText(
    safeExportFilename("ref-forge-library", "json"),
    JSON.stringify(createReferenceJsonExport(references), null, 2),
    "application/json;charset=utf-8",
  );
}
```

- [x] **Step 7: Style controls**

In `app/globals.css`, add:

```css
.sort-label {
  min-width: 160px;
}

.pin-button {
  min-height: 32px;
  border-color: var(--border);
  background: transparent;
  color: var(--muted-strong);
  font-size: 0.72rem;
  padding: 6px 8px;
}

.pin-button[aria-pressed="true"] {
  border-color: var(--accent);
  background: var(--accent-soft);
  color: var(--accent-strong);
}

.export-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
```

- [x] **Step 8: Run validation**

Run:

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

Expected: all PASS.

- [x] **Step 9: Commit**

```bash
git add app/page.tsx app/globals.css
git commit -m "feat: 增强研究工作流界面 / enhance research workflow UI"
```

## Task 6: Browser QA And Traceability

**Files:**
- Modify: `docs/progress/2026-06-26.md`
- Modify: `docs/progress/status.md`
- Modify: `docs/progress/timeline.md`

- [x] **Step 1: Run local browser smoke**

Start the dev server and verify:

- Sort control appears.
- Changing sort changes card order for seeded records where applicable.
- Pin button toggles state and survives reload.
- Export Markdown action is available for the selected reference.
- Export JSON action is available.
- Add reference still opens the form.
- 390px mobile width has no horizontal overflow.

- [x] **Step 2: Update progress docs**

Record:

- What changed.
- Why.
- Validation commands.
- Browser smoke result.
- Any production deployment caveat.

- [x] **Step 3: Commit docs**

```bash
git add docs/progress/2026-06-26.md docs/progress/status.md docs/progress/timeline.md
git commit -m "docs: 记录第八轮研究效率增强 / record round 8 workflow efficiency"
```

- [ ] **Step 4: Push**

Run:

```bash
git push origin main
```

Expected:

- PASS when GitHub connectivity is available.
- If GitHub HTTPS fails, record the exact failure in `docs/progress/2026-06-26.md`.

## Self-Review

- Spec coverage: sorting, pinning, export, editing ergonomics, tests, browser QA, and traceability are all represented.
- Placeholder scan: no placeholders remain.
- Type consistency: sort mode names match the design spec and planned helper module.
- Scope check: no API route, D1 migration, upload, public sharing, or production E2E token work is included.
