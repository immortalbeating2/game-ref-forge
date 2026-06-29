# Data Quality Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a no-migration data-quality workflow that helps users find incomplete, high-value, low-risk, pinned, and production-ready references.

**Architecture:** Keep the existing D1 schema and API unchanged. Add a derived quality helper module, then wire review queue filtering, card quality chips, and detail-panel quality checklist into the existing single-page workspace.

**Tech Stack:** vinext/React, TypeScript, CSS, Vitest, existing browser-local pinned reference state.

---

## File Structure

- Create: `lib/reference-quality.ts`
  - Defines quality issue groups, positive quality badges, review queue modes, and queue filtering.
- Create: `tests/reference-quality.test.ts`
  - Covers issue detection, positive signal badges, and queue filtering.
- Modify: `lib/localization.ts`
  - Adds Round 9 queue and quality checklist copy in Chinese and English.
- Modify: `tests/localization.test.ts`
  - Asserts Round 9 copy exists.
- Modify: `app/page.tsx`
  - Adds `reviewQueue` state, queue filtering, card quality chips, and detail checklist.
- Modify: `app/globals.css`
  - Styles compact quality chips, queue control, and detail checklist rows.
- Modify: `docs/progress/2026-06-29.md`, `docs/progress/status.md`, `docs/progress/timeline.md`
  - Records Round 9 design/plan and later implementation/verification.

## Task 1: Reference Quality Helper

**Files:**
- Create: `lib/reference-quality.ts`
- Create: `tests/reference-quality.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/reference-quality.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { ReferenceRecord } from "../lib/reference";
import {
  evaluateReferenceQuality,
  filterReferencesByReviewQueue,
} from "../lib/reference-quality";

function record(overrides: Partial<ReferenceRecord> = {}): ReferenceRecord {
  return {
    id: "ref-1",
    title: "Complete Reference",
    source_url: "https://example.com/ref",
    canonical_url: "https://example.com/ref",
    site_name: "Example",
    author: "Example Author",
    preview_url: null,
    media_type: "image",
    asset_category: "prop",
    source_category: "Example source",
    style_tags: ["stylized"],
    use_tags: ["production"],
    mechanic_tags: ["crafting"],
    mood_tags: ["calm"],
    visual_language_tags: ["shape language"],
    license_status: "source_link_only",
    attribution_text: "Example attribution",
    public_status: "review",
    quality_status: "analyzed",
    rating: 4,
    reference_value_score: 5,
    transformability_score: 4,
    copyright_risk_score: 1,
    production_readiness_score: 4,
    inspiration_points: ["Useful silhouette rule"],
    inspiration_entries: [
      {
        id: "entry-1",
        observation: "Clear silhouette contrast.",
        principle: "Readable silhouettes improve scanning.",
        transferable_idea: "Use contrast hierarchy.",
        original_application: "Original prop set.",
        avoid_copying: "Do not copy exact shapes.",
      },
    ],
    deconstruction_notes: "Readable contrast.",
    transformation_ideas: "Apply to original props.",
    avoid_copying_notes: "Avoid copying exact protected expression.",
    related_original_asset: "Original prop kit",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-02T00:00:00.000Z",
    ...overrides,
  };
}

describe("evaluateReferenceQuality", () => {
  it("returns no issues and positive badges for a complete strong reference", () => {
    const quality = evaluateReferenceQuality(record());

    expect(quality.issueCount).toBe(0);
    expect(quality.issues).toEqual([]);
    expect(quality.badges.map((badge) => badge.kind)).toEqual([
      "high_value",
      "low_risk",
      "production_ready",
      "transformable",
      "analyzed",
    ]);
  });

  it("groups missing source, safety, inspiration, and score issues", () => {
    const quality = evaluateReferenceQuality(
      record({
        site_name: null,
        author: null,
        license_status: "unknown",
        attribution_text: null,
        avoid_copying_notes: null,
        rating: null,
        reference_value_score: null,
        inspiration_points: [],
        inspiration_entries: [],
        deconstruction_notes: null,
        transformation_ideas: null,
      }),
    );

    expect(quality.issueCount).toBeGreaterThan(0);
    expect(quality.issues.map((issue) => issue.group)).toContain("source");
    expect(quality.issues.map((issue) => issue.group)).toContain("safety");
    expect(quality.issues.map((issue) => issue.group)).toContain("inspiration");
    expect(quality.issues.map((issue) => issue.group)).toContain("scores");
  });
});

describe("filterReferencesByReviewQueue", () => {
  const complete = record({ id: "complete", title: "Complete", reference_value_score: 5, copyright_risk_score: 1 });
  const incomplete = record({ id: "incomplete", title: "Incomplete", author: null, inspiration_entries: [] });
  const risky = record({ id: "risky", title: "Risky", reference_value_score: 2, copyright_risk_score: 5, production_readiness_score: 2 });

  it("filters incomplete references", () => {
    expect(filterReferencesByReviewQueue([complete, incomplete], "incomplete", []).map((item) => item.id)).toEqual([
      "incomplete",
    ]);
  });

  it("filters pinned references", () => {
    expect(filterReferencesByReviewQueue([complete, incomplete], "pinned", ["complete"]).map((item) => item.id)).toEqual([
      "complete",
    ]);
  });

  it("filters high value, low risk, and production ready queues", () => {
    expect(filterReferencesByReviewQueue([complete, risky], "high_value", []).map((item) => item.id)).toEqual(["complete"]);
    expect(filterReferencesByReviewQueue([complete, risky], "low_risk", []).map((item) => item.id)).toEqual(["complete"]);
    expect(filterReferencesByReviewQueue([complete, risky], "production_ready", []).map((item) => item.id)).toEqual(["complete"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- tests/reference-quality.test.ts
```

Expected: FAIL because `../lib/reference-quality` does not exist.

- [ ] **Step 3: Implement helper**

Create `lib/reference-quality.ts`:

```ts
import { ReferenceRecord } from "./reference";

export const REVIEW_QUEUE_MODES = [
  "all",
  "incomplete",
  "pinned",
  "high_value",
  "low_risk",
  "production_ready",
] as const;

export type ReviewQueueMode = (typeof REVIEW_QUEUE_MODES)[number];

export type ReferenceQualityIssueGroup = "source" | "safety" | "inspiration" | "scores";

export type ReferenceQualityIssue = {
  group: ReferenceQualityIssueGroup;
  field: string;
};

export type ReferenceQualityBadgeKind =
  | "high_value"
  | "low_risk"
  | "production_ready"
  | "transformable"
  | "analyzed";

export type ReferenceQualityBadge = {
  kind: ReferenceQualityBadgeKind;
};

function isBlank(value: string | null | undefined) {
  return !value || value.trim().length === 0;
}

function addIssue(
  issues: ReferenceQualityIssue[],
  group: ReferenceQualityIssueGroup,
  field: string,
) {
  issues.push({ group, field });
}

export function evaluateReferenceQuality(reference: ReferenceRecord) {
  const issues: ReferenceQualityIssue[] = [];
  const badges: ReferenceQualityBadge[] = [];

  if (isBlank(reference.site_name)) {
    addIssue(issues, "source", "site_name");
  }

  if (isBlank(reference.author)) {
    addIssue(issues, "source", "author");
  }

  if (reference.license_status === "unknown") {
    addIssue(issues, "safety", "license_status");
  }

  if (isBlank(reference.avoid_copying_notes)) {
    addIssue(issues, "safety", "avoid_copying_notes");
  }

  if (reference.public_status === "review" && isBlank(reference.attribution_text)) {
    addIssue(issues, "safety", "attribution_text");
  }

  if (reference.inspiration_points.length === 0) {
    addIssue(issues, "inspiration", "inspiration_points");
  }

  if (reference.inspiration_entries.length === 0) {
    addIssue(issues, "inspiration", "inspiration_entries");
  }

  if (isBlank(reference.deconstruction_notes)) {
    addIssue(issues, "inspiration", "deconstruction_notes");
  }

  if (isBlank(reference.transformation_ideas)) {
    addIssue(issues, "inspiration", "transformation_ideas");
  }

  if (reference.rating === null) {
    addIssue(issues, "scores", "rating");
  }

  if (reference.reference_value_score === null) {
    addIssue(issues, "scores", "reference_value_score");
  }

  if (reference.transformability_score === null) {
    addIssue(issues, "scores", "transformability_score");
  }

  if (reference.copyright_risk_score === null) {
    addIssue(issues, "scores", "copyright_risk_score");
  }

  if (reference.production_readiness_score === null) {
    addIssue(issues, "scores", "production_readiness_score");
  }

  if ((reference.reference_value_score ?? 0) >= 4) {
    badges.push({ kind: "high_value" });
  }

  if (reference.copyright_risk_score !== null && reference.copyright_risk_score <= 2) {
    badges.push({ kind: "low_risk" });
  }

  if ((reference.production_readiness_score ?? 0) >= 4) {
    badges.push({ kind: "production_ready" });
  }

  if ((reference.transformability_score ?? 0) >= 4) {
    badges.push({ kind: "transformable" });
  }

  if (reference.quality_status === "analyzed") {
    badges.push({ kind: "analyzed" });
  }

  return {
    issueCount: issues.length,
    issues,
    badges,
  };
}

export function filterReferencesByReviewQueue(
  references: ReferenceRecord[],
  mode: ReviewQueueMode,
  pinnedReferenceIds: string[],
) {
  const pinned = new Set(pinnedReferenceIds);

  return references.filter((reference) => {
    const quality = evaluateReferenceQuality(reference);

    switch (mode) {
      case "incomplete":
        return quality.issueCount > 0;
      case "pinned":
        return pinned.has(reference.id);
      case "high_value":
        return quality.badges.some((badge) => badge.kind === "high_value");
      case "low_risk":
        return quality.badges.some((badge) => badge.kind === "low_risk");
      case "production_ready":
        return quality.badges.some((badge) => badge.kind === "production_ready");
      case "all":
      default:
        return true;
    }
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npm test -- tests/reference-quality.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/reference-quality.ts tests/reference-quality.test.ts
git commit -m "feat: 增加引用质量 helper / add reference quality helpers"
```

## Task 2: Localization Copy

**Files:**
- Modify: `lib/localization.ts`
- Modify: `tests/localization.test.ts`

- [ ] **Step 1: Write failing localization expectations**

Add to `tests/localization.test.ts`:

```ts
expect(uiCopy().reviewQueue).toBe("整理队列");
expect(uiCopy().queueIncomplete).toBe("待补全");
expect(uiCopy().qualityChecklist).toBe("质量清单");
expect(uiCopy().qualityComplete).toBe("资料完整");
expect(uiCopy("en").reviewQueue).toBe("Review queue");
expect(uiCopy("en").queueIncomplete).toBe("Incomplete");
expect(uiCopy("en").qualityChecklist).toBe("Quality checklist");
expect(uiCopy("en").qualityComplete).toBe("Complete");
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- tests/localization.test.ts
```

Expected: FAIL because the new copy keys do not exist.

- [ ] **Step 3: Add copy keys**

Add Chinese keys to `lib/localization.ts`:

```ts
reviewQueue: "整理队列",
queueAll: "全部参考",
queueIncomplete: "待补全",
queuePinned: "已置顶",
queueHighValue: "高价值",
queueLowRisk: "低版权风险",
queueProductionReady: "可制作",
qualityChecklist: "质量清单",
qualityComplete: "资料完整",
qualityIssueCount: "待补全",
qualityPositiveSignals: "优势信号",
qualitySourceGroup: "来源信息",
qualitySafetyGroup: "安全信息",
qualityInspirationGroup: "灵感信息",
qualityScoresGroup: "评分信息",
qualityMissingSite: "补充站点",
qualityMissingAuthor: "补充作者",
qualityMissingLicense: "确认授权",
qualityMissingAttribution: "补充署名",
qualityMissingAvoidCopying: "补充避免复制说明",
qualityMissingInspirationPoints: "补充灵感要点",
qualityMissingInspirationEntries: "补充结构化灵感",
qualityMissingDeconstruction: "补充拆解笔记",
qualityMissingTransformation: "补充转化思路",
qualityMissingRating: "补充评分",
qualityMissingReferenceValue: "补充参考价值",
qualityMissingTransformability: "补充可转化性",
qualityMissingCopyrightRisk: "补充版权风险",
qualityMissingProductionReadiness: "补充制作就绪度",
qualityBadgeHighValue: "高价值",
qualityBadgeLowRisk: "低风险",
qualityBadgeProductionReady: "可制作",
qualityBadgeTransformable: "可转化",
qualityBadgeAnalyzed: "已分析",
```

Add English equivalents:

```ts
reviewQueue: "Review queue",
queueAll: "All references",
queueIncomplete: "Incomplete",
queuePinned: "Pinned",
queueHighValue: "High value",
queueLowRisk: "Low copyright risk",
queueProductionReady: "Production ready",
qualityChecklist: "Quality checklist",
qualityComplete: "Complete",
qualityIssueCount: "Incomplete",
qualityPositiveSignals: "Positive signals",
qualitySourceGroup: "Source",
qualitySafetyGroup: "Safety",
qualityInspirationGroup: "Inspiration",
qualityScoresGroup: "Scores",
qualityMissingSite: "Add site",
qualityMissingAuthor: "Add author",
qualityMissingLicense: "Confirm license",
qualityMissingAttribution: "Add attribution",
qualityMissingAvoidCopying: "Add avoid-copying notes",
qualityMissingInspirationPoints: "Add inspiration points",
qualityMissingInspirationEntries: "Add structured inspiration",
qualityMissingDeconstruction: "Add deconstruction notes",
qualityMissingTransformation: "Add transformation ideas",
qualityMissingRating: "Add rating",
qualityMissingReferenceValue: "Add reference value",
qualityMissingTransformability: "Add transformability",
qualityMissingCopyrightRisk: "Add copyright risk",
qualityMissingProductionReadiness: "Add production readiness",
qualityBadgeHighValue: "High value",
qualityBadgeLowRisk: "Low risk",
qualityBadgeProductionReady: "Production ready",
qualityBadgeTransformable: "Transformable",
qualityBadgeAnalyzed: "Analyzed",
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npm test -- tests/localization.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/localization.ts tests/localization.test.ts
git commit -m "feat: 增加质量整理文案 / add quality workflow copy"
```

## Task 3: Wire Review Queue And Card Chips

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Import helper and add state**

In `app/page.tsx`, import:

```ts
import {
  evaluateReferenceQuality,
  filterReferencesByReviewQueue,
  REVIEW_QUEUE_MODES,
  ReviewQueueMode,
  ReferenceQualityBadgeKind,
  ReferenceQualityIssue,
} from "../lib/reference-quality";
```

Add state near existing filter/sort state:

```ts
const [reviewQueue, setReviewQueue] = useState<ReviewQueueMode>("all");
```

- [ ] **Step 2: Add label helpers in component**

Add helpers inside `Home`:

```ts
function labelForReviewQueue(mode: ReviewQueueMode) {
  switch (mode) {
    case "incomplete":
      return copy.queueIncomplete;
    case "pinned":
      return copy.queuePinned;
    case "high_value":
      return copy.queueHighValue;
    case "low_risk":
      return copy.queueLowRisk;
    case "production_ready":
      return copy.queueProductionReady;
    case "all":
    default:
      return copy.queueAll;
  }
}

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
      return copy.qualityMissingProductionReadiness;
    default:
      return issue.field;
  }
}
```

- [ ] **Step 3: Filter by review queue before sorting**

After `filteredReferences`, add:

```ts
const queuedReferences = useMemo(
  () => filterReferencesByReviewQueue(filteredReferences, reviewQueue, pinnedReferenceIds),
  [filteredReferences, pinnedReferenceIds, reviewQueue],
);
```

Then change sorting:

```ts
const sortedReferences = useMemo(
  () => sortReferences(queuedReferences, sortMode, pinnedReferenceIds),
  [queuedReferences, pinnedReferenceIds, sortMode],
);
```

- [ ] **Step 4: Add sidebar queue control**

In the sidebar near existing filters, add:

```tsx
<label>
  {copy.reviewQueue}
  <select
    value={reviewQueue}
    onChange={(event) => setReviewQueue(event.target.value as ReviewQueueMode)}
  >
    {REVIEW_QUEUE_MODES.map((mode) => (
      <option key={mode} value={mode}>
        {labelForReviewQueue(mode)}
      </option>
    ))}
  </select>
</label>
```

Update clear filters to reset:

```ts
setReviewQueue("all");
```

- [ ] **Step 5: Add card quality chips**

Inside each card render, compute:

```tsx
const quality = evaluateReferenceQuality(reference);
```

Render below the compact score row:

```tsx
<div className="quality-chip-row">
  <span className={quality.issueCount > 0 ? "quality-chip warning" : "quality-chip success"}>
    {quality.issueCount > 0
      ? `${copy.qualityIssueCount} ${quality.issueCount}`
      : copy.qualityComplete}
  </span>
  {quality.badges.slice(0, 2).map((badge) => (
    <span className="quality-chip" key={badge.kind}>
      {labelForQualityBadge(badge.kind)}
    </span>
  ))}
</div>
```

If inline `const quality` is awkward inside JSX, extract card rendering into a small function within the component.

- [ ] **Step 6: Style chips**

Add to `app/globals.css`:

```css
.quality-chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.quality-chip {
  border: 1px solid var(--border);
  border-radius: 999px;
  background: #111517;
  color: var(--muted-strong);
  font-size: 0.68rem;
  font-weight: 800;
  line-height: 1;
  padding: 6px 7px;
}

.quality-chip.warning {
  border-color: var(--warning);
  background: var(--warning-soft);
  color: #f7e4aa;
}

.quality-chip.success {
  border-color: var(--accent);
  background: var(--accent-soft);
  color: var(--accent-strong);
}
```

- [ ] **Step 7: Run validation**

Run:

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

Expected: all PASS.

- [ ] **Step 8: Commit**

```bash
git add app/page.tsx app/globals.css
git commit -m "feat: 增加质量整理队列 / add quality review queues"
```

## Task 4: Detail Quality Checklist

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Add grouped issue helper**

Inside `Home`, add:

```ts
function groupQualityIssues(issues: ReferenceQualityIssue[]) {
  return {
    source: issues.filter((issue) => issue.group === "source"),
    safety: issues.filter((issue) => issue.group === "safety"),
    inspiration: issues.filter((issue) => issue.group === "inspiration"),
    scores: issues.filter((issue) => issue.group === "scores"),
  };
}
```

- [ ] **Step 2: Render checklist in detail panel**

Inside the non-editing detail view, after the score matrix section or before tag axes, add:

```tsx
<section>
  <h3 className="detail-section-title">{copy.qualityChecklist}</h3>
  {(() => {
    const quality = evaluateReferenceQuality(selectedReference);
    const grouped = groupQualityIssues(quality.issues);

    return (
      <div className="quality-checklist">
        {quality.issueCount === 0 ? <p>{copy.qualityComplete}</p> : null}
        {([
          [copy.qualitySourceGroup, grouped.source],
          [copy.qualitySafetyGroup, grouped.safety],
          [copy.qualityInspirationGroup, grouped.inspiration],
          [copy.qualityScoresGroup, grouped.scores],
        ] as const).map(([label, issues]) => (
          <div className="quality-checklist-row" key={label}>
            <strong>{label}</strong>
            <span>
              {issues.length > 0
                ? issues.map((issue) => labelForQualityIssue(issue)).join(" / ")
                : copy.qualityComplete}
            </span>
          </div>
        ))}
        {quality.badges.length > 0 ? (
          <div className="quality-positive-signals">
            <strong>{copy.qualityPositiveSignals}</strong>
            <div className="quality-chip-row">
              {quality.badges.map((badge) => (
                <span className="quality-chip success" key={badge.kind}>
                  {labelForQualityBadge(badge.kind)}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    );
  })()}
</section>
```

- [ ] **Step 3: Style checklist**

Add to `app/globals.css`:

```css
.quality-checklist {
  display: grid;
  gap: 8px;
}

.quality-checklist p {
  margin: 0;
}

.quality-checklist-row {
  display: grid;
  grid-template-columns: 110px 1fr;
  gap: 10px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: #111517;
  padding: 9px;
}

.quality-checklist-row strong,
.quality-positive-signals strong {
  color: var(--foreground);
}

.quality-checklist-row span {
  color: var(--muted-strong);
}

.quality-positive-signals {
  display: grid;
  gap: 8px;
}
```

In the mobile media query, add:

```css
.quality-checklist-row {
  grid-template-columns: 1fr;
}
```

- [ ] **Step 4: Run validation**

Run:

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx app/globals.css
git commit -m "feat: 增加质量清单详情 / add quality checklist detail"
```

## Task 5: Browser QA And Traceability

**Files:**
- Modify: `docs/progress/2026-06-29.md`
- Modify: `docs/progress/status.md`
- Modify: `docs/progress/timeline.md`

- [ ] **Step 1: Run local browser smoke**

Start dev server:

```bash
npm run dev -- --host 127.0.0.1 --port 3000
```

Verify:

- Review queue control appears.
- `待补全` queue can be selected.
- `已置顶` queue shows pinned records after pinning one seed record.
- Card quality chips are visible.
- Detail quality checklist is visible.
- `+ 添加参考` still opens the form.
- Current desktop width has no horizontal overflow.
- 390px mobile width has no horizontal overflow.

- [ ] **Step 2: Run automated checks**

Run:

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

Expected: all PASS.

- [ ] **Step 3: Update progress docs**

Record:

- What changed.
- Why no D1 migration was used.
- Validation command results.
- Local browser smoke result.
- Production smoke scope and any automation limitations.

- [ ] **Step 4: Commit docs**

```bash
git add docs/progress/2026-06-29.md docs/progress/status.md docs/progress/timeline.md
git commit -m "docs: 记录第九轮质量整理 / record round 9 quality workflow"
```

## Optional Task 6: Production Deployment And Smoke

This task should run only after the user approves implementation and local validation passes.

**Files:**
- Modify as needed: `docs/progress/2026-06-29.md`, `docs/progress/status.md`, `docs/progress/timeline.md`

- [ ] **Step 1: Merge to main**

From the feature branch:

```bash
git checkout main
git merge --ff-only codex/round-9-data-quality-workflow
```

- [ ] **Step 2: Validate merged main**

Run:

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

Expected: all PASS.

- [ ] **Step 3: Push GitHub**

Run:

```bash
git push origin main
```

Expected: PASS.

- [ ] **Step 4: Deploy Sites**

Use the existing `.openai/hosting.json` project id and Sites source workflow. Save and deploy a new Sites version from the pushed commit.

- [ ] **Step 5: Authenticated production smoke**

Verify without writing production data:

- Review queue control appears.
- `待补全` can be selected.
- Card quality chips appear.
- Detail checklist appears.
- Add form still opens.
- Desktop layout has no horizontal overflow.

Record download/mobile/browser automation limitations if they recur.

## Self-Review

- Spec coverage: derived quality, review queues, card chips, detail checklist, localization, tests, browser QA, and traceability are represented.
- Placeholder scan: no placeholders remain.
- Scope check: no D1 migration, API route change, public sharing, upload, or batch edit implementation is included.
- Type consistency: review queue mode names match the design spec and planned helper module.
