# Round 10 Quality-Guided Editing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn every derived quality gap into a reliable entry point to the matching field in the existing detail edit form, with transient previous/next navigation and one manual save.

**Architecture:** Keep quality derivation in `lib/reference-quality.ts`, add a pure typed navigation helper in `lib/reference-quality-navigation.ts`, and keep transient edit-session state in `app/page.tsx`. The UI reuses the existing draft, validation, PUT, cancel, and selection-protection paths; no API route or D1 schema changes are permitted.

**Tech Stack:** TypeScript 5.9, React 19, vinext, Vitest 4, CSS, Codex Browser/Chrome automation, Codex App Sites.

---

## File Structure

- Modify `lib/reference-quality.ts`: introduce the closed quality-field union used by derivation and navigation.
- Create `lib/reference-quality-navigation.ts`: own field-to-control IDs and pure guided-session navigation.
- Create `tests/reference-quality-navigation.test.ts`: lock all 14 mappings, session creation, boundaries, and runtime fallback.
- Modify `lib/localization.ts`: add Chinese and English guided-editing copy.
- Modify `tests/localization.test.ts`: verify the new bilingual contract.
- Modify `app/page.tsx`: wire checklist actions, guided-edit state, focus effect, stable IDs, navigation UI, and cleanup paths.
- Modify `app/globals.css`: style checklist buttons, guided navigation, active targets, reduced motion, and mobile layout.
- Create `docs/qa/2026-07-10-quality-guided-editing.md`: record local and production acceptance evidence.
- Modify `AGENTS.md`: advance the stage after implementation and deployment.
- Modify `docs/progress/status.md`: maintain the current-stage summary.
- Modify `docs/progress/timeline.md`: record branch, commits, merge, deployment, and production CRUD.
- Modify `docs/progress/2026-07-10.md`: append implementation, verification, delegation, and deployment details.

## Preconditions

- The written design at `docs/superpowers/specs/2026-07-10-quality-guided-editing-design.md` is approved.
- `main` contains commit `5a7f7ae` or its pushed equivalent.
- Use `superpowers:using-git-worktrees` to create `codex/round-10-quality-guided-editing` under the repository-approved worktree directory.
- Run the baseline `npm test` in the worktree before implementation. Stop and diagnose if baseline tests fail.
- Do not create a D1 migration, API route, new persistence field, or package dependency.

### Task 1: Add the typed quality-navigation contract

**Files:**
- Modify: `lib/reference-quality.ts`
- Create: `lib/reference-quality-navigation.ts`
- Create: `tests/reference-quality-navigation.test.ts`

- [ ] **Step 1: Write the failing mapping and navigation tests**

Create `tests/reference-quality-navigation.test.ts` with this contract:

```ts
import { describe, expect, it } from "vitest";
import { REFERENCE_QUALITY_ISSUE_FIELDS } from "../lib/reference-quality";
import type { ReferenceQualityIssue } from "../lib/reference-quality";
import {
  QUALITY_FIELD_TARGET_IDS,
  createQualityEditSession,
  getAdjacentQualityIssueIndex,
  getQualityFieldTargetId,
} from "../lib/reference-quality-navigation";

const issues: ReferenceQualityIssue[] = [
  { group: "source", field: "site_name" },
  { group: "safety", field: "license_status" },
  { group: "inspiration", field: "inspiration_entries" },
  { group: "scores", field: "rating" },
];

describe("quality field targets", () => {
  it("maps all quality fields to unique edit-control ids", () => {
    const ids = REFERENCE_QUALITY_ISSUE_FIELDS.map(
      (field) => QUALITY_FIELD_TARGET_IDS[field],
    );

    expect(ids).toHaveLength(14);
    expect(new Set(ids).size).toBe(14);
    expect(ids.every((id) => id.startsWith("quality-edit-"))).toBe(true);
  });

  it("returns null for an unknown runtime field", () => {
    expect(getQualityFieldTargetId("not-a-quality-field")).toBeNull();
  });
});

describe("quality edit session", () => {
  it("captures the issue list and selected issue index", () => {
    expect(createQualityEditSession(issues, issues[2])).toEqual({
      issues,
      activeIndex: 2,
    });
  });

  it("returns null when the selected issue is absent", () => {
    expect(
      createQualityEditSession(issues, {
        group: "scores",
        field: "production_readiness_score",
      }),
    ).toBeNull();
  });

  it("moves within boundaries without wrapping", () => {
    expect(getAdjacentQualityIssueIndex(1, issues.length, "previous")).toBe(0);
    expect(getAdjacentQualityIssueIndex(1, issues.length, "next")).toBe(2);
    expect(getAdjacentQualityIssueIndex(0, issues.length, "previous")).toBeNull();
    expect(getAdjacentQualityIssueIndex(3, issues.length, "next")).toBeNull();
  });
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```powershell
npm test -- tests/reference-quality-navigation.test.ts
```

Expected: FAIL because `REFERENCE_QUALITY_ISSUE_FIELDS` and `lib/reference-quality-navigation.ts` do not exist.

- [ ] **Step 3: Close the quality issue field type**

Add this field vocabulary to `lib/reference-quality.ts` and use it for `ReferenceQualityIssue.field` and `addIssue`:

```ts
export const REFERENCE_QUALITY_ISSUE_FIELDS = [
  "site_name",
  "author",
  "license_status",
  "avoid_copying_notes",
  "attribution_text",
  "inspiration_points",
  "inspiration_entries",
  "deconstruction_notes",
  "transformation_ideas",
  "rating",
  "reference_value_score",
  "transformability_score",
  "copyright_risk_score",
  "production_readiness_score",
] as const;

export type ReferenceQualityIssueField =
  (typeof REFERENCE_QUALITY_ISSUE_FIELDS)[number];

export type ReferenceQualityIssue = {
  group: ReferenceQualityIssueGroup;
  field: ReferenceQualityIssueField;
};
```

Change `addIssue` to accept `field: ReferenceQualityIssueField`. Do not change any quality rule or badge threshold.

- [ ] **Step 4: Implement the pure navigation helper**

Create `lib/reference-quality-navigation.ts`:

```ts
import {
  REFERENCE_QUALITY_ISSUE_FIELDS,
} from "./reference-quality";
import type {
  ReferenceQualityIssue,
  ReferenceQualityIssueField,
} from "./reference-quality";

export const QUALITY_FIELD_TARGET_IDS = {
  site_name: "quality-edit-site-name",
  author: "quality-edit-author",
  license_status: "quality-edit-license-status",
  avoid_copying_notes: "quality-edit-avoid-copying-notes",
  attribution_text: "quality-edit-attribution-text",
  inspiration_points: "quality-edit-inspiration-points",
  inspiration_entries: "quality-edit-inspiration-entry-observation",
  deconstruction_notes: "quality-edit-deconstruction-notes",
  transformation_ideas: "quality-edit-transformation-ideas",
  rating: "quality-edit-rating",
  reference_value_score: "quality-edit-reference-value-score",
  transformability_score: "quality-edit-transformability-score",
  copyright_risk_score: "quality-edit-copyright-risk-score",
  production_readiness_score: "quality-edit-production-readiness-score",
} as const satisfies Record<ReferenceQualityIssueField, string>;

const qualityIssueFields = new Set<string>(REFERENCE_QUALITY_ISSUE_FIELDS);

export type QualityEditSession = {
  issues: ReferenceQualityIssue[];
  activeIndex: number;
};

export function getQualityFieldTargetId(field: unknown) {
  if (typeof field !== "string" || !qualityIssueFields.has(field)) {
    return null;
  }

  return QUALITY_FIELD_TARGET_IDS[field as ReferenceQualityIssueField];
}

export function createQualityEditSession(
  issues: ReferenceQualityIssue[],
  selectedIssue: ReferenceQualityIssue,
): QualityEditSession | null {
  const activeIndex = issues.findIndex(
    (issue) =>
      issue.group === selectedIssue.group && issue.field === selectedIssue.field,
  );

  return activeIndex >= 0 ? { issues: [...issues], activeIndex } : null;
}

export function getAdjacentQualityIssueIndex(
  activeIndex: number,
  issueCount: number,
  direction: "previous" | "next",
) {
  const candidate = activeIndex + (direction === "previous" ? -1 : 1);
  return candidate >= 0 && candidate < issueCount ? candidate : null;
}
```

- [ ] **Step 5: Run focused and regression tests and verify GREEN**

Run:

```powershell
npm test -- tests/reference-quality-navigation.test.ts tests/reference-quality.test.ts
```

Expected: PASS with the new navigation tests plus the existing quality tests.

- [ ] **Step 6: Run typecheck and commit Task 1**

Run:

```powershell
npm run typecheck
git add lib/reference-quality.ts lib/reference-quality-navigation.ts tests/reference-quality-navigation.test.ts
git commit -m "feat: 增加质量编辑导航契约 / add quality edit navigation contract"
```

Expected: typecheck exits 0 and the commit contains only Task 1 files.

### Task 2: Add bilingual guided-editing copy

**Files:**
- Modify: `lib/localization.ts`
- Modify: `tests/localization.test.ts`

- [ ] **Step 1: Add failing localization expectations**

Extend the Chinese and English assertions in `tests/localization.test.ts`:

```ts
expect(uiCopy().qualityGuidedEditing).toBe("补全导航");
expect(uiCopy().qualityGuidedPosition).toBe("当前项");
expect(uiCopy().previousQualityIssue).toBe("上一项");
expect(uiCopy().nextQualityIssue).toBe("下一项");
expect(uiCopy().completeQualityIssue).toBe("补全");
expect(uiCopy().qualityTargetMissing).toBe("未找到对应编辑字段；草稿已保留。");

expect(uiCopy("en").qualityGuidedEditing).toBe("Completion navigator");
expect(uiCopy("en").qualityGuidedPosition).toBe("Current item");
expect(uiCopy("en").previousQualityIssue).toBe("Previous item");
expect(uiCopy("en").nextQualityIssue).toBe("Next item");
expect(uiCopy("en").completeQualityIssue).toBe("Complete");
expect(uiCopy("en").qualityTargetMissing).toBe(
  "The matching edit field was not found; your draft is preserved.",
);
```

- [ ] **Step 2: Run localization test and verify RED**

Run:

```powershell
npm test -- tests/localization.test.ts
```

Expected: FAIL because the six new keys are absent.

- [ ] **Step 3: Add the Chinese and English copy**

Add these keys beside the existing quality checklist copy in both locale objects in `lib/localization.ts`:

```ts
// Chinese
qualityGuidedEditing: "补全导航",
qualityGuidedPosition: "当前项",
previousQualityIssue: "上一项",
nextQualityIssue: "下一项",
completeQualityIssue: "补全",
qualityTargetMissing: "未找到对应编辑字段；草稿已保留。",

// English
qualityGuidedEditing: "Completion navigator",
qualityGuidedPosition: "Current item",
previousQualityIssue: "Previous item",
nextQualityIssue: "Next item",
completeQualityIssue: "Complete",
qualityTargetMissing: "The matching edit field was not found; your draft is preserved.",
```

- [ ] **Step 4: Run localization and type tests and verify GREEN**

Run:

```powershell
npm test -- tests/localization.test.ts
npm run typecheck
```

Expected: both commands exit 0.

- [ ] **Step 5: Commit Task 2**

```powershell
git add lib/localization.ts tests/localization.test.ts
git commit -m "feat: 增加质量补全文案 / add guided quality editing copy"
```

### Task 3: Wire checklist activation and guided-edit state

**Files:**
- Modify: `app/page.tsx`
- Test: `tests/reference-quality-navigation.test.ts`

- [ ] **Step 1: Strengthen the session test for snapshot isolation**

Add this test before page wiring:

```ts
it("copies the issue array so the edit session remains a snapshot", () => {
  const session = createQualityEditSession(issues, issues[0]);
  issues.pop();

  expect(session?.issues).toHaveLength(4);
});
```

- [ ] **Step 2: Run the focused test and verify current behavior**

Run:

```powershell
npm test -- tests/reference-quality-navigation.test.ts
```

Expected: PASS because Task 1 copies the issue array. If it fails, fix `createQualityEditSession` before touching page state.

- [ ] **Step 3: Import navigation types and add transient state**

Update the React import to include `useEffect`. Import the quality types separately from runtime navigation exports:

```ts
import type { ReferenceQualityIssue } from "../lib/reference-quality";
import {
  QUALITY_FIELD_TARGET_IDS,
  createQualityEditSession,
  getAdjacentQualityIssueIndex,
  getQualityFieldTargetId,
} from "../lib/reference-quality-navigation";
import type { QualityEditSession } from "../lib/reference-quality-navigation";
```

Add state beside the existing edit state:

```ts
const [qualityEditSession, setQualityEditSession] =
  useState<QualityEditSession | null>(null);

const activeQualityIssue = qualityEditSession
  ? qualityEditSession.issues[qualityEditSession.activeIndex] ?? null
  : null;
```

- [ ] **Step 4: Add explicit start, move, and clear functions**

Keep ordinary editing separate from guided editing:

```ts
function clearQualityEditSession() {
  setQualityEditSession(null);
}

function startEditing(reference: ReferenceRecord) {
  clearQualityEditSession();
  setEditingId(reference.id);
  setEditDraft(recordToReferenceDraft(reference));
  setMessage(copy.editingSelected);
}

function startQualityEditing(
  reference: ReferenceRecord,
  issue: ReferenceQualityIssue,
) {
  const session = createQualityEditSession(
    evaluateReferenceQuality(reference).issues,
    issue,
  );

  if (!session) {
    setMessage(copy.qualityTargetMissing);
    return;
  }

  setQualityEditSession(session);
  setEditingId(reference.id);
  setEditDraft(recordToReferenceDraft(reference));
  setMessage(copy.editingSelected);
}

function moveQualityIssue(direction: "previous" | "next") {
  setQualityEditSession((current) => {
    if (!current) return current;
    const activeIndex = getAdjacentQualityIssueIndex(
      current.activeIndex,
      current.issues.length,
      direction,
    );
    return activeIndex === null ? current : { ...current, activeIndex };
  });
}
```

- [ ] **Step 5: Clear guided state on every existing edit exit**

Call `clearQualityEditSession()` in these existing paths:

- `cancelEditing`.
- Selection changes that close another edit draft.
- Filter changes that hide the edited reference.
- Successful new-reference save.
- Successful reference edit after clearing `editingId` and `editDraft`.
- Successful delete of the edited/selected reference.

Do not clear it in the edit-save catch block; failed saves must preserve the draft and current position.

- [ ] **Step 6: Convert missing checklist rows into actions**

Replace each issue list item body with a button while retaining the list structure:

```tsx
<li key={`${issue.group}-${issue.field}`}>
  <button
    type="button"
    className="quality-checklist-action"
    data-quality-issue-field={issue.field}
    onClick={() => startQualityEditing(selectedReference, issue)}
    aria-label={`${copy.completeQualityIssue}: ${labelForQualityIssue(issue)}`}
  >
    <span>{labelForQualityIssue(issue)}</span>
    <span aria-hidden="true">→</span>
  </button>
</li>
```

- [ ] **Step 7: Run focused tests, typecheck, and commit state wiring**

Run:

```powershell
npm test -- tests/reference-quality-navigation.test.ts tests/reference-quality.test.ts
npm run typecheck
git add app/page.tsx tests/reference-quality-navigation.test.ts
git commit -m "feat: 接入质量缺口编辑状态 / wire quality issue editing state"
```

Expected: tests and typecheck exit 0.

### Task 4: Add focus targets, navigator UI, and responsive styling

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Capture browser RED before adding target IDs**

Start the worktree dev server and open a reference with quality gaps. In browser automation, evaluate:

```js
({
  checklistAction: Boolean(document.querySelector("[data-quality-issue-field]")),
  target: Boolean(document.getElementById("quality-edit-site-name")),
  navigator: Boolean(document.querySelector("[data-quality-guided-navigation]")),
})
```

Expected before this task: `checklistAction` is true; `target` and `navigator` are false.

- [ ] **Step 2: Add the focus effect with a safe fallback**

Add an effect driven by edit state and the active issue:

```ts
useEffect(() => {
  if (!isEditingSelected || !activeQualityIssue) return;

  const targetId = getQualityFieldTargetId(activeQualityIssue.field);
  if (!targetId) {
    setMessage(copy.qualityTargetMissing);
    return;
  }

  const frame = window.requestAnimationFrame(() => {
    const target = document.getElementById(targetId);
    if (!(target instanceof HTMLElement)) {
      setMessage(copy.qualityTargetMissing);
      return;
    }

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    target.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "center",
    });
    target.focus({ preventScroll: true });
  });

  return () => window.cancelAnimationFrame(frame);
}, [
  activeQualityIssue,
  copy.qualityTargetMissing,
  isEditingSelected,
]);
```

- [ ] **Step 3: Render the guided navigator above edit sections**

Inside `detail-edit-form`, before the first section, render only when a session and active issue exist:

```tsx
{qualityEditSession && activeQualityIssue ? (
  <section
    className="quality-guided-navigation"
    data-quality-guided-navigation
    aria-label={copy.qualityGuidedEditing}
  >
    <div>
      <p className="eyebrow">{copy.qualityGuidedEditing}</p>
      <strong>{labelForQualityIssue(activeQualityIssue)}</strong>
      <span>
        {copy.qualityGuidedPosition} {qualityEditSession.activeIndex + 1} / {qualityEditSession.issues.length}
      </span>
    </div>
    <div className="quality-guided-actions">
      <button
        type="button"
        className="ghost-button"
        title={copy.previousQualityIssue}
        aria-label={copy.previousQualityIssue}
        disabled={isSavingEdit || qualityEditSession.activeIndex === 0}
        onClick={() => moveQualityIssue("previous")}
      >
        <span aria-hidden="true">←</span>
      </button>
      <button
        type="button"
        className="ghost-button"
        title={copy.nextQualityIssue}
        aria-label={copy.nextQualityIssue}
        disabled={
          isSavingEdit ||
          qualityEditSession.activeIndex === qualityEditSession.issues.length - 1
        }
        onClick={() => moveQualityIssue("next")}
      >
        <span aria-hidden="true">→</span>
      </button>
    </div>
  </section>
) : null}
```

- [ ] **Step 4: Add stable IDs and active-field classes to all 14 controls**

For every approved field mapping, add the matching ID from `QUALITY_FIELD_TARGET_IDS`. Apply this class to the containing label or structured-inspiration container:

```ts
function qualityTargetClass(field: ReferenceQualityIssue["field"]) {
  return activeQualityIssue?.field === field ? "quality-target-active" : undefined;
}
```

Representative controls:

```tsx
<label className={qualityTargetClass("site_name")}>
  {copy.site}
  <input
    id={QUALITY_FIELD_TARGET_IDS.site_name}
    value={editDraft.site_name}
    onChange={(event) =>
      setEditDraft({ ...editDraft, site_name: event.target.value })
    }
  />
</label>

<label className={qualityTargetClass("license_status")}>
  {copy.licenseStatus}
  <select id={QUALITY_FIELD_TARGET_IDS.license_status}>
    {/* keep the existing options and onChange */}
  </select>
</label>

<div
  className={`inspiration-entry-editor ${
    qualityTargetClass("inspiration_entries") ?? ""
  }`.trim()}
>
  {/* keep the existing editor */}
  <textarea
    id={QUALITY_FIELD_TARGET_IDS.inspiration_entries}
    value={entry.observation}
    onChange={(event) =>
      updateEditInspirationEntry(index, "observation", event.target.value)
    }
  />
</div>
```

Assign the structured-inspiration ID only to index `0`; later entries must not duplicate it.

- [ ] **Step 5: Add styles without changing the visual direction**

Add scoped rules to `app/globals.css`:

```css
.quality-checklist-group li {
  list-style: none;
}

.quality-checklist-group ul {
  padding-left: 0;
}

.quality-checklist-action {
  display: flex;
  width: 100%;
  min-height: 34px;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: #151a1c;
  color: var(--muted-strong);
  padding: 7px 9px;
  text-align: left;
}

.quality-checklist-action:hover {
  border-color: var(--accent);
  color: var(--foreground);
}

.quality-guided-navigation {
  position: sticky;
  top: 0;
  z-index: 2;
  display: flex !important;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-color: rgba(117, 216, 189, 0.55) !important;
  background: #141a1a !important;
}

.quality-guided-navigation > div:first-child {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.quality-guided-navigation span {
  color: var(--muted-strong);
  font-size: 0.78rem;
}

.quality-guided-actions {
  display: flex;
  gap: 8px;
}

.quality-guided-actions button {
  width: 40px;
  min-width: 40px;
  min-height: 40px;
  padding: 0;
}

.quality-target-active {
  border-radius: 6px;
  outline: 2px solid rgba(117, 216, 189, 0.72);
  outline-offset: 4px;
  background: rgba(117, 216, 189, 0.08);
}

@media (prefers-reduced-motion: reduce) {
  .quality-target-active {
    transition: none;
  }
}

@media (max-width: 820px) {
  .quality-guided-navigation {
    position: static;
    align-items: stretch;
    flex-direction: column;
  }

  .quality-guided-actions button {
    flex: 1 1 0;
    width: auto;
  }
}
```

Adapt selectors to the existing `.detail-panel section` rules if needed, but keep card radius at 8px or less and do not add decorative gradients or nested cards.

- [ ] **Step 6: Run browser GREEN for focus and navigation**

Click a source-group quality action, then evaluate:

```js
({
  navigator: Boolean(document.querySelector("[data-quality-guided-navigation]")),
  activeId: document.activeElement?.id ?? null,
  activeField: document.querySelector(".quality-target-active input, .quality-target-active select, .quality-target-active textarea")?.id ?? null,
  overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
})
```

Expected: navigator is true, `activeId` matches `activeField`, and desktop overflow is `0`.

Use the next button and verify `document.activeElement.id` changes to the next mapped control. Set viewport width to 390px and verify overflow remains `0`.

- [ ] **Step 7: Run automated gates and commit Task 4**

Run:

```powershell
npm test
npm run typecheck
npm run lint
git add app/page.tsx app/globals.css
git commit -m "feat: 增加质量引导编辑界面 / add quality-guided editing UI"
```

Expected: all commands exit 0.

### Task 5: Complete local CRUD and interaction QA

**Files:**
- Create: `docs/qa/2026-07-10-quality-guided-editing.md`
- Modify: `docs/progress/2026-07-10.md`

- [ ] **Step 1: Create a temporary incomplete local reference**

Use the running local UI to create a reference titled `Round 10 Local QA`, with a valid source URL and deliberately missing author, license confirmation, inspiration fields, and scores. Record its ID after save.

- [ ] **Step 2: Verify all four quality groups**

For one issue in each of source, safety, inspiration, and scores:

- Click the quality action.
- Assert the guided navigator is visible.
- Assert the expected target is `document.activeElement`.
- Use previous/next and assert focus changes.
- Cancel and confirm the record is unchanged.

- [ ] **Step 3: Verify one-save completion and persistence**

Enter guided editing again, fill at least author, license status, one inspiration value, and one score, then click the existing save button once. Reload and assert the values persist and those issues no longer appear in the recalculated checklist.

- [ ] **Step 4: Verify ordinary editing and localization**

- Open the ordinary Edit action and assert the guided navigator is absent.
- Cancel ordinary editing.
- Switch to English, open a quality issue, and assert English navigator copy and focus behavior.
- Return to Chinese before ending QA.

- [ ] **Step 5: Verify desktop and mobile layout**

At the current desktop viewport and at 390px width, assert:

```js
document.documentElement.scrollWidth - document.documentElement.clientWidth === 0
```

Confirm the guided navigator does not cover the sticky save actions.

- [ ] **Step 6: Delete the temporary local reference and document evidence**

Delete `Round 10 Local QA`, reload, and confirm it is absent. Create `docs/qa/2026-07-10-quality-guided-editing.md` with environment, cases, results, record cleanup, screenshots or DOM evidence, and remaining risks.

- [ ] **Step 7: Update the daily log and commit QA evidence**

Append local implementation and QA evidence to `docs/progress/2026-07-10.md`, including a `Delegation Log` for every subagent used.

```powershell
git add docs/qa/2026-07-10-quality-guided-editing.md docs/progress/2026-07-10.md
git commit -m "test: 验证质量引导编辑 / verify quality-guided editing"
```

### Task 6: Review, verify, and finish the feature branch

**Files:**
- Modify: files required by valid review findings only
- Modify: `docs/progress/status.md`
- Modify: `docs/progress/timeline.md`
- Modify: `docs/progress/2026-07-10.md`

- [ ] **Step 1: Request code review against the branch base**

Use `superpowers:requesting-code-review` with:

- Base SHA: the `main` commit used to create the worktree.
- Head SHA: current feature branch HEAD.
- Requirements: the approved Round 10 design and this implementation plan.
- Review priorities: missing target IDs, duplicated IDs, stale guided state, focus-effect loops, save-failure draft loss, mobile overlap, and unintended API/D1 changes.

- [ ] **Step 2: Resolve every Critical or Important finding**

For each valid behavior defect, add or extend a failing unit or browser regression check, verify RED, implement the smallest fix, and verify GREEN. Record Minor findings that are intentionally deferred.

- [ ] **Step 3: Run fresh full verification**

Run in this order:

```powershell
npm test
npm run typecheck
npm run lint
npm run build
git diff --check
git status --short --branch
```

Expected: 0 test failures, all gates exit 0, diff check is clean, and only intentional trace-document changes remain.

- [ ] **Step 4: Update all three progress traces**

Update:

- `docs/progress/status.md`: Round 10 implemented and locally verified on the feature branch.
- `docs/progress/timeline.md`: branch creation, implementation commits, review, and verification.
- `docs/progress/2026-07-10.md`: what, why, impact, exact verification, risks, next step, and Delegation Log.

- [ ] **Step 5: Commit implementation trace**

```powershell
git add docs/progress/status.md docs/progress/timeline.md docs/progress/2026-07-10.md
git commit -m "docs: 记录第十轮质量引导实现 / record round 10 guided editing"
```

- [ ] **Step 6: Use `superpowers:finishing-a-development-branch`**

Select local merge into `main`, because the user requested the complete Round 10 flow and this repository uses verified `main` as the stable deployment source. The finishing skill must re-run tests before merge, merge from the main repository, verify the merged result, remove the owned worktree, and delete the local feature branch only after successful merge.

### Task 7: Push, deploy Sites, and run production CRUD

**Files:**
- Modify: `AGENTS.md`
- Modify: `docs/qa/2026-07-10-quality-guided-editing.md`
- Modify: `docs/progress/status.md`
- Modify: `docs/progress/timeline.md`
- Modify: `docs/progress/2026-07-10.md`

- [ ] **Step 1: Verify merged `main` before external writes**

Run:

```powershell
git status --short --branch
git log -1 --oneline --decorate
npm test
npm run typecheck
npm run lint
npm run build
```

Expected: clean `main`, all gates exit 0.

- [ ] **Step 2: Push GitHub `main`**

```powershell
git push origin main
```

Expected: `origin/main` advances to the merged Round 10 implementation commit.

- [ ] **Step 3: Synchronize the Sites source repository**

Read `.openai/hosting.json`, reuse its exact `project_id`, obtain a short-lived Sites source credential, and push the exact merged `main` commit using a per-command authentication header. Do not print, save, or embed the token in Git configuration or a remote URL.

- [ ] **Step 4: Save and deploy the next Sites version**

Use the Sites hosting skill and connector to:

- Save a version whose `commit_sha` exactly matches the pushed Sites source commit.
- Deploy the saved version with the verified private deployment path when owner-only access is confirmed.
- Poll a non-terminal deployment until `succeeded` or `failed`.
- Record project, version, deployment, source commit, and production URL without recording credentials.

- [ ] **Step 5: Run production temporary-reference CRUD**

Against `https://game-ref-forge.yeep-6613.chatgpt-team.site/`:

1. Create `Round 10 Production QA <timestamp>` with deliberate quality gaps.
2. Reload and confirm it persists.
3. Open a quality gap and assert target focus plus navigator visibility.
4. Fill at least two fields from different groups and save once.
5. Reload and confirm values persist and the matching gaps disappear.
6. Delete the temporary reference.
7. Reload and confirm it remains absent.
8. Verify desktop and 390px horizontal overflow are both `0`.

If UI automation fails after creating data, use the authenticated production API only to locate and delete the exact temporary title/ID, then record that cleanup separately. Do not report full CRUD as passed unless the UI create, guided edit, save, refresh, and delete assertions all pass.

- [ ] **Step 6: Finalize stage and deployment documentation**

Update `AGENTS.md` to `Round 10 deployed`, append production evidence to the QA document and daily log, update status and timeline, then verify documentation:

```powershell
git diff --check
rg -n "Round 10|Sites version|Production QA|cleanup|清理" AGENTS.md docs/qa/2026-07-10-quality-guided-editing.md docs/progress/status.md docs/progress/timeline.md docs/progress/2026-07-10.md
```

- [ ] **Step 7: Commit and push deployment trace**

```powershell
git add AGENTS.md docs/qa/2026-07-10-quality-guided-editing.md docs/progress/status.md docs/progress/timeline.md docs/progress/2026-07-10.md
git commit -m "docs: 记录第十轮部署结果 / record round 10 deployment"
git push origin main
git status --short --branch
```

Expected: clean `main` aligned with `origin/main`. The Sites source commit may remain one docs-only commit behind GitHub `main`; record that distinction explicitly.

## Final Verification Checklist

- [ ] The quality issue field type contains exactly the 14 derived fields.
- [ ] Every field maps to a unique existing control ID.
- [ ] Checklist actions enter guided editing and focus the intended control.
- [ ] Previous/next navigation is non-cyclic and disabled at boundaries.
- [ ] Ordinary editing does not show guided navigation.
- [ ] Save failure preserves draft and navigator position.
- [ ] Save/cancel/selection/filter/delete success clears guided state.
- [ ] Chinese and English copy pass tests and browser checks.
- [ ] Desktop and 390px layouts have no horizontal overflow or action overlap.
- [ ] No API, D1 schema, migration, or package dependency changed.
- [ ] Local temporary data is deleted.
- [ ] Production temporary data is deleted and absence is confirmed after reload.
- [ ] Tests, typecheck, lint, and build pass on merged `main`.
- [ ] All three progress documents and the QA record contain exact evidence.
- [ ] GitHub `main` is pushed and the new Sites version is deployed successfully.
