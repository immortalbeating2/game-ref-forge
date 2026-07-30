# Round 14 Visual Workstation Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recreate the approved Round 14 visual target as a responsive, accessible RefForge research workstation without changing the existing domain, API, D1, migration, or Backup v1 contracts.

**Architecture:** Keep `app/page.tsx` as the owner of reference CRUD and workspace orchestration, but extract the Round 14 presentation units into focused workspace components. Add one pure versioned preference module for card density, preserve the existing Round 12 layout module, and use the existing reference/synthesis data as the only source of visible product content.

**Tech Stack:** vinext/React 19, TypeScript, CSS, Vitest, Testing Library, lucide-react, localStorage, built-in ImageGen, Sites hosting.

## Global Constraints

- The selected target is `docs/product/assets/round-14-visual-target.png`; the written spec wins when the image conflicts with real product behavior.
- Do not change reference, synthesis, relation, Backup v1, API, D1, migration, R2, source policy, or production data contracts.
- Keep Chinese as the default language and preserve the existing English option.
- Preserve Round 12 desktop splitter, keyboard resize, collapse/recovery, and responsive fallback behavior.
- Comparison selection remains ordered and limited to 2-4 references.
- The generated workspace texture must be original, contain no text/brand/character/third-party asset, have a solid-color fallback, and be no larger than `300 KB` after WebP optimization.
- Use existing `lucide-react` icons; do not create handwritten SVG, CSS art, emoji controls, or text-glyph icons.
- Card radius stays at `8px` or less; no marketing hero, glassmorphism, neon/cyberpunk, decorative orb, or nested-card layout.
- Desktop supports compact and comfortable density; mobile `<=820px` always uses the comfortable touch layout.
- All new controls require visible focus, localized accessible labels, and reduced-motion behavior.
- Every code task follows red-green-refactor and ends in a focused bilingual commit.

---

### Task 1: Versioned Workspace View Preferences

**Files:**
- Create: `lib/workspace-view-preferences.ts`
- Create: `tests/workspace-view-preferences.test.ts`
- Modify: `lib/localization.ts`
- Modify: `tests/localization.test.ts`

**Interfaces:**
- Produces: `WorkspaceDensity = "compact" | "comfortable"`.
- Produces: `WORKSPACE_VIEW_PREFERENCES_STORAGE_KEY = "ref-forge-workspace-view-v1"`.
- Produces: `parseWorkspaceViewPreferences(raw: string | null): WorkspaceViewPreferences`.
- Produces: `serializeWorkspaceViewPreferences(value: WorkspaceViewPreferences): string`.
- Produces localization keys `density`, `compactDensity`, `comfortableDensity`, `densityControl`, `searchShortcut`, `collapseComparisonDock`, `expandComparisonDock`, `removeFromComparison`, `comparisonNeedsMore`, `inspirationExtraction`, `reusablePrinciples`, and `transformationDirection`.

- [ ] **Step 1: Write failing preference tests**

```ts
import { describe, expect, it } from "vitest";
import {
  DEFAULT_WORKSPACE_VIEW_PREFERENCES,
  parseWorkspaceViewPreferences,
  serializeWorkspaceViewPreferences,
} from "../lib/workspace-view-preferences";

describe("workspace view preferences", () => {
  it("defaults to compact density", () => {
    expect(parseWorkspaceViewPreferences(null)).toEqual(DEFAULT_WORKSPACE_VIEW_PREFERENCES);
  });

  it("round-trips version 1", () => {
    const value = { version: 1 as const, density: "comfortable" as const };
    expect(parseWorkspaceViewPreferences(serializeWorkspaceViewPreferences(value))).toEqual(value);
  });

  it.each(["{}", "null", "{\"version\":2}", "{\"version\":1,\"density\":\"dense\"}"])(
    "falls back for invalid input %s",
    (raw) => expect(parseWorkspaceViewPreferences(raw)).toEqual(DEFAULT_WORKSPACE_VIEW_PREFERENCES),
  );
});
```

- [ ] **Step 2: Run the new test and confirm the missing-module failure**

Run: `npm test -- tests/workspace-view-preferences.test.ts`

Expected: FAIL because `lib/workspace-view-preferences.ts` does not exist.

- [ ] **Step 3: Implement the pure preference contract**

```ts
export type WorkspaceDensity = "compact" | "comfortable";
export type WorkspaceViewPreferences = { version: 1; density: WorkspaceDensity };
export const WORKSPACE_VIEW_PREFERENCES_STORAGE_KEY = "ref-forge-workspace-view-v1";
export const DEFAULT_WORKSPACE_VIEW_PREFERENCES: WorkspaceViewPreferences = {
  version: 1,
  density: "compact",
};

export function parseWorkspaceViewPreferences(raw: string | null): WorkspaceViewPreferences {
  if (!raw) return DEFAULT_WORKSPACE_VIEW_PREFERENCES;
  try {
    const value = JSON.parse(raw) as Partial<WorkspaceViewPreferences>;
    return value.version === 1 && (value.density === "compact" || value.density === "comfortable")
      ? { version: 1, density: value.density }
      : DEFAULT_WORKSPACE_VIEW_PREFERENCES;
  } catch {
    return DEFAULT_WORKSPACE_VIEW_PREFERENCES;
  }
}

export function serializeWorkspaceViewPreferences(value: WorkspaceViewPreferences) {
  return JSON.stringify(value);
}
```

- [ ] **Step 4: Add bilingual copy and assertions**

Add the listed keys to both language records in `lib/localization.ts`. Extend `tests/localization.test.ts` so every new key is non-empty in `zh` and `en`, with exact assertions for `紧凑`, `舒适`, `Compact`, and `Comfortable`.

- [ ] **Step 5: Run focused and full tests**

Run: `npm test -- tests/workspace-view-preferences.test.ts tests/localization.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/workspace-view-preferences.ts lib/localization.ts tests/workspace-view-preferences.test.ts tests/localization.test.ts
git commit -m "feat: 增加工作区密度偏好 / add workspace density preference"
```

### Task 2: Toolbar, Density Control, and Search Shortcut

**Files:**
- Create: `app/workspace/reference-toolbar.tsx`
- Create: `tests/reference-toolbar.test.tsx`
- Modify: `app/page.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: `WorkspaceDensity`, `ReferenceSortMode`, localized copy, current query and existing callbacks.
- Produces: `ReferenceToolbar` with a forwarded search input ref and accessible density group.
- Produces: page-level `/` shortcut that only fires outside editable controls.

- [ ] **Step 1: Write failing component tests**

Create a jsdom test that renders `ReferenceToolbar`, verifies search/sort/density/add controls, switches density, and asserts the toolbar exposes the search input through `searchInputRef`.

```tsx
// @vitest-environment jsdom
const onDensityChange = vi.fn();
render(<ReferenceToolbar {...makeProps({ density: "compact", onDensityChange })} />);
await user.click(screen.getByRole("radio", { name: "Comfortable" }));
expect(onDensityChange).toHaveBeenCalledWith("comfortable");
expect(screen.getByRole("searchbox")).toBeTruthy();
```

- [ ] **Step 2: Run the focused test and confirm failure**

Run: `npm test -- tests/reference-toolbar.test.tsx`

Expected: FAIL because `ReferenceToolbar` does not exist.

- [ ] **Step 3: Implement `ReferenceToolbar`**

Use `Search`, `ArrowUpDown`, `Rows3`, `Grid2X2`, `GitCompareArrows`, `DatabaseBackup`, and `Plus` from `lucide-react`. Preserve existing export, data management, comparison, add, search, and sort callbacks. Use real labels for major commands and tooltips for compact icon controls.

- [ ] **Step 4: Integrate device-local density**

In `app/page.tsx`, initialize from `parseWorkspaceViewPreferences`, persist with `serializeWorkspaceViewPreferences` in a guarded `try/catch`, and add `workspace--density-${density}` to the root class list. Do not add the preference to `BackupDevicePreferences`.

- [ ] **Step 5: Add `/` shortcut with editable-target guard**

```ts
function isEditableTarget(target: EventTarget | null) {
  return target instanceof HTMLElement &&
    (target.matches("input, textarea, select, [contenteditable='true']") || target.isContentEditable);
}
```

Register one window `keydown` handler. When `event.key === "/"`, no modifier is pressed, and the target is not editable, prevent default and focus/select the search input. Do not intercept Escape in Task 2.

- [ ] **Step 6: Add toolbar and density CSS**

Keep controls at stable heights, use a segmented density control, and stack the toolbar before `1280px`. Hide density controls at `<=820px`; CSS must force the comfortable card layout there.

- [ ] **Step 7: Run tests and gates**

Run:

```bash
npm test -- tests/reference-toolbar.test.tsx tests/workspace-view-preferences.test.ts tests/workspace-layout-components.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add app/workspace/reference-toolbar.tsx app/page.tsx app/globals.css tests/reference-toolbar.test.tsx
git commit -m "feat: 重构参考工具栏与快捷搜索 / refine toolbar and quick search"
```

### Task 3: Dense Reference Card Component

**Files:**
- Create: `app/workspace/reference-card.tsx`
- Create: `tests/reference-card.test.tsx`
- Modify: `app/page.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: `ReferenceRecord`, evaluated quality, `WorkspaceDensity`, selection/comparison/pinned state, labels, and callbacks.
- Produces: `ReferenceCard` preserving the existing `button`/`checkbox` semantics and keyboard activation.

- [ ] **Step 1: Write failing card tests**

Test normal selection, comparison checkbox semantics, pin-button propagation, preview fallback text, explicit safety/quality badges, and compact/comfortable class names.

```tsx
expect(screen.getByRole("button", { name: /Kenney UI Pack/ })).toHaveClass("reference-card--compact");
expect(screen.getByText("CC0 or public domain")).toBeTruthy();
expect(screen.getByText("Analyzed")).toBeTruthy();
```

- [ ] **Step 2: Run the test and confirm the missing-component failure**

Run: `npm test -- tests/reference-card.test.tsx`

Expected: FAIL because `ReferenceCard` does not exist.

- [ ] **Step 3: Implement `ReferenceCard`**

Move the existing card markup and keyboard behavior out of `app/page.tsx`. Use a stable `16:9` media region and classify the card with `reference-card--compact` or `reference-card--comfortable`. Use lucide `Pin` for an unpinned reference, `PinOff` for a pinned reference, `Check` for a selected comparison item, and `Plus` for an available comparison item. Keep all domain values derived from the provided `ReferenceRecord`.

- [ ] **Step 4: Integrate cards without changing sort/filter behavior**

Replace only the `sortedReferences.map` card body. Keep `evaluateReferenceQuality`, selected-reference behavior, comparison limit behavior, and pinned localStorage ownership in `app/page.tsx`.

- [ ] **Step 5: Add dense visual rules**

Compact desktop cards show the ordered source/safety/quality/three-score/tag hierarchy. Comfortable cards increase padding and image height but keep the same safety information. Hover and selection must not change card dimensions.

- [ ] **Step 6: Run focused regression gates**

Run:

```bash
npm test -- tests/reference-card.test.tsx tests/reference-quality.test.ts tests/synthesis-selection.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add app/workspace/reference-card.tsx app/page.tsx app/globals.css tests/reference-card.test.tsx
git commit -m "feat: 升级高密度参考卡 / upgrade dense reference cards"
```

### Task 4: Ordered Comparison Dock

**Files:**
- Create: `app/workspace/comparison-dock.tsx`
- Create: `tests/comparison-dock.test.tsx`
- Modify: `app/page.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: ordered selected references, `canHandoff`, localized labels, cancel/remove/collapse/enter callbacks.
- Produces: `ComparisonDock` with ordered items, 2-4 gate, session-only collapsed state, and no duplicated synthesis form.

- [ ] **Step 1: Write failing dock tests**

Render one, two, and four selected references. Assert order numbers, remove callbacks, disabled/enabled enter action, collapse without clearing, and status copy.

- [ ] **Step 2: Run focused test and confirm failure**

Run: `npm test -- tests/comparison-dock.test.tsx`

Expected: FAIL because `ComparisonDock` does not exist.

- [ ] **Step 3: Implement the dock**

Use `ChevronDown`, `ChevronUp`, `X`, and `Sparkles` from `lucide-react`. Items show order, safe thumbnail/fallback, title, and remove button. Keep collapsed state in the component and expose it with `aria-expanded`.

- [ ] **Step 4: Wire ordered records in the page**

Derive:

```ts
const comparisonReferences = comparisonReferenceIds
  .map((id) => referenceDataSourceRecords.find((reference) => reference.id === id))
  .filter((reference): reference is ReferenceRecord => Boolean(reference));
```

Add a targeted remove callback that reuses `toggleComparisonSelection`. Keep cancel and enter behavior unchanged.

- [ ] **Step 5: Style desktop, medium, and mobile states**

Desktop dock is sticky only inside the center pane; `<=1280px` uses normal flow; `<=820px` stacks readable items and actions without horizontal overflow.

- [ ] **Step 6: Run regression gates**

Run:

```bash
npm test -- tests/comparison-dock.test.tsx tests/synthesis-selection.test.ts tests/synthesis-page-state.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add app/workspace/comparison-dock.tsx app/page.tsx app/globals.css tests/comparison-dock.test.tsx
git commit -m "feat: 增加有序参考对比坞 / add ordered comparison dock"
```

### Task 5: Structured Read-Only Detail Panel

**Files:**
- Create: `app/workspace/reference-detail.tsx`
- Create: `app/workspace/detail-section.tsx`
- Create: `tests/reference-detail.test.tsx`
- Modify: `app/page.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: selected `ReferenceRecord`, evaluated quality, localized label functions, and existing edit/open/export actions.
- Produces: fixed section order: source/safety, scores, quality, tag axes, inspiration extraction.
- Produces: `DetailSection` with native button semantics and `aria-expanded`.

- [ ] **Step 1: Write failing detail tests**

Verify section heading order, source/safety initially expanded, other long sections collapsible, quality issue count visible while collapsed, and the four inspiration labels: observation, reusable principle, avoid copying, transformation direction.

- [ ] **Step 2: Run focused test and confirm failure**

Run: `npm test -- tests/reference-detail.test.tsx`

Expected: FAIL because the new components do not exist.

- [ ] **Step 3: Implement `DetailSection`**

Use `ChevronDown`/`ChevronRight`. Generate stable IDs with `useId`, wire `aria-expanded` and `aria-controls`, and allow `collapsible={false}` for source/safety.

- [ ] **Step 4: Implement `ReferenceDetail`**

Move only the current read-only selected-reference content. Preserve current values and fallbacks; do not create a radar chart or derive new scores. Keep edit mode and the large edit form in `app/page.tsx`.

- [ ] **Step 5: Integrate read-only/edit branches**

The right aside remains in `app/page.tsx` so the Round 12 collapse button and edit form are unchanged. Render `ReferenceDetail` only when `!isEditingSelected`.

- [ ] **Step 6: Add progressive-disclosure styles**

Use low-contrast sections, 8px-or-less radii, visible section summaries, and `180ms` maximum opacity/translate animation. Disable nonessential motion under `prefers-reduced-motion`.

- [ ] **Step 7: Run focused and regression gates**

Run:

```bash
npm test -- tests/reference-detail.test.tsx tests/reference-quality.test.ts tests/reference-quality-navigation.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add app/workspace/reference-detail.tsx app/workspace/detail-section.tsx app/page.tsx app/globals.css tests/reference-detail.test.tsx
git commit -m "feat: 重组结构化参考详情 / structure reference inspection"
```

### Task 6: Generated Workbench Texture and Visual System

**Files:**
- Create: `public/art/workbench-graphite.webp`
- Create: `tests/visual-assets.test.ts`
- Modify: `app/globals.css`

**Interfaces:**
- Produces: one original low-contrast background asset at or below `300 KB`.
- Consumes: existing CSS tokens and approved target.

- [ ] **Step 1: Write the failing asset contract**

```ts
import { readFileSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";

const asset = new URL("../public/art/workbench-graphite.webp", import.meta.url);

describe("Round 14 visual assets", () => {
  it("ships an optimized WebP workstation texture", () => {
    expect(readFileSync(asset).subarray(8, 12).toString("ascii")).toBe("WEBP");
    expect(statSync(asset).size).toBeLessThanOrEqual(300 * 1024);
  });
});
```

- [ ] **Step 2: Run the test and confirm the missing-file failure**

Run: `npm test -- tests/visual-assets.test.ts`

Expected: FAIL because the texture does not exist.

- [ ] **Step 3: Generate the raster asset**

Use built-in ImageGen with the approved visual target as reference. Prompt for a seamless-looking, low-contrast, matte forged graphite surface with no text, logo, symbol, character, object, gradient orb, or recognizable third-party content. Save the selected result under the workspace before use.

- [ ] **Step 4: Convert and optimize**

Convert the selected PNG to `public/art/workbench-graphite.webp`, preserving enough resolution for large desktop tiling. Adjust WebP quality until the file is `<=300 KB`; keep the original generated source outside runtime assets or in ignored temporary state.

- [ ] **Step 5: Apply the Round 14 tokens and surfaces**

Update `:root`, `body`, `.workspace`, panels, toolbar, cards, detail groups, splitters, fields, scrollbars, and dialogs to match the approved graphite/mint direction. Use:

```css
body {
  background-color: var(--background);
  background-image: url("/art/workbench-graphite.webp");
}
```

Add a dark solid fallback and an overlay surface through existing elements, not new decorative DOM.

- [ ] **Step 6: Audit CSS constraints**

Search for purple-dominant gradients, radii over 8px on cards, negative letter spacing, text glyph icons, and hover rules that resize layout. Fix every Round 14-owned occurrence.

- [ ] **Step 7: Run asset and engineering gates**

Run:

```bash
npm test -- tests/visual-assets.test.ts
npm run typecheck
npm run lint
npm run build
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add public/art/workbench-graphite.webp app/globals.css tests/visual-assets.test.ts
git commit -m "feat: 加入锻造石墨视觉系统 / add forged graphite visual system"
```

### Task 7: Full Integration, Visual QA, and Responsive Repair

**Files:**
- Create: `design-qa.md`
- Create: `docs/qa/2026-07-30-visual-workstation-polish.md`
- Modify: `app/page.tsx`
- Modify: `app/globals.css`
- Modify: `tests/reference-toolbar.test.tsx`
- Modify: `tests/reference-card.test.tsx`
- Modify: `tests/comparison-dock.test.tsx`
- Modify: `tests/reference-detail.test.tsx`
- Modify: `tests/workspace-layout-components.test.ts`

**Interfaces:**
- Consumes: all prior Round 14 components and the approved visual target.
- Produces: `design-qa.md` with `final result: passed`.
- Produces: reproducible QA evidence for desktop, medium, and mobile states.

- [ ] **Step 1: Run the full automated baseline**

Run:

```bash
npm test
npm run typecheck
npm run lint
npm run build
git diff --check
```

Expected: all commands exit 0.

- [ ] **Step 2: Start the existing local dev server**

Use the existing project runtime and an available port. Do not initialize a new Sites or Product Design template.

- [ ] **Step 3: Capture the same-state desktop comparison**

At a viewport matching the approved target as closely as practical, show reference mode, two selected comparison items, and a populated right detail panel. Capture the implementation and compare it side-by-side with `docs/product/assets/round-14-visual-target.png`.

- [ ] **Step 4: Write the first `design-qa.md`**

Record P0-P3 differences for hierarchy, card density, toolbar order, panel proportions, text clipping, borders, radii, texture contrast, and interaction states. Set `final result: blocked` until every P0/P1/P2 is fixed.

- [ ] **Step 5: Repair P0/P1/P2 issues with regression tests**

For each behavioral defect, add a failing test before the fix. For purely visual defects, record exact selectors and viewport evidence in the QA document.

- [ ] **Step 6: Verify primary interactions**

Cover:

- search and `/` focus;
- sort;
- compact/comfortable density and refresh persistence;
- card select and pin;
- comparison 1/2/4-item gates, remove, collapse, enter synthesis;
- detail section expand/collapse;
- left/right splitter pointer and keyboard behavior;
- add form, edit entry, and data management entry;
- Chinese/English;
- reduced-motion;
- console error 0.

- [ ] **Step 7: Verify responsive states**

Capture and measure `1600x900`, `1280x900`, `1024x768`, and `390x844`. At each viewport verify document/body horizontal overflow is 0, labels do not overlap, and controls remain reachable.

- [ ] **Step 8: Complete visual QA**

Repeat same-state screenshot comparison after repairs. `design-qa.md` must end with `final result: passed`; remaining P3 polish may be listed as follow-up.

- [ ] **Step 9: Run an independent reviewer**

Give one reviewer the written spec, plan, approved target, final diff, `design-qa.md`, and QA evidence. Fix all Critical/Important findings and rerun affected tests.

- [ ] **Step 10: Run final branch gates**

Run:

```bash
npm test
npm run typecheck
npm run lint
npm run build
git diff --check
```

Expected: all commands exit 0 on the final feature head.

- [ ] **Step 11: Commit**

```bash
git add app lib tests public design-qa.md docs/qa/2026-07-30-visual-workstation-polish.md
git commit -m "test: 完成第十四轮视觉验收 / complete round 14 visual acceptance"
```

### Task 8: Traceability, Merge, Sites Deployment, and Production QA

**Files:**
- Modify: `AGENTS.md`
- Modify: `docs/progress/status.md`
- Modify: `docs/progress/timeline.md`
- Modify: `docs/progress/2026-07-30.md`
- Modify: `docs/qa/2026-07-30-visual-workstation-polish.md`
- Modify: `public/screenshot.jpeg`

**Interfaces:**
- Produces: synchronized GitHub `main`, Sites source commit, saved version, production deployment, and cleanup evidence.

- [ ] **Step 1: Update implementation trace docs on the feature branch**

Record task commits, asset provenance, test counts, responsive evidence, reviewer result, known P3s, and no API/D1/Backup change. Set stage to `Round 14 implemented and locally verified; merge pending`.

- [ ] **Step 2: Commit feature traceability**

```bash
git add AGENTS.md docs/progress/status.md docs/progress/timeline.md docs/progress/2026-07-30.md docs/qa/2026-07-30-visual-workstation-polish.md public/screenshot.jpeg
git commit -m "docs: 记录第十四轮本地验证 / record round 14 local verification"
```

- [ ] **Step 3: Finish the branch through the approved local-merge path**

Use `superpowers:finishing-a-development-branch`. The user has already requested execution through completion, but do not delete the feature branch/worktree until merged-main verification succeeds.

- [ ] **Step 4: Verify merged `main`**

Run on merged `main`:

```bash
npm test
npm run typecheck
npm run lint
npm run build
git diff --check
```

Expected: all commands exit 0.

- [ ] **Step 5: Push exact merged source**

Push `main` to GitHub and then push the exact same commit to the Sites source repository. Confirm both remote heads equal the local commit before saving a Sites version.

- [ ] **Step 6: Save and deploy Sites**

Read `.openai/hosting.json`, reuse its exact `project_id`, package the exact pushed source state, save one new Sites version, deploy only that saved version, and inspect deployment until terminal success.

- [ ] **Step 7: Run authenticated production read-only QA**

At production verify:

- Round 14 texture and visual hierarchy loaded;
- compact/comfortable density persists across refresh;
- `/` focuses search outside editable controls;
- comparison dock and detail disclosure work;
- splitters retain Round 12 behavior;
- `1600/1280/390px` have zero horizontal overflow;
- Chinese/English and console error 0;
- no reference/synthesis write is required.

- [ ] **Step 8: Record production evidence and commit**

Update the three trace documents and QA report with commit SHA, Sites version/deployment IDs, production viewport evidence, and any tool-only evidence boundary. Set stage to `Round 14 complete; Round 15 design-ready`.

- [ ] **Step 9: Push documentation closure**

Push the closure commit to GitHub. If it changes docs/screenshots only, record that Sites runtime remains on the verified runtime commit.

- [ ] **Step 10: Clean the owned branch and worktree**

After merged-main, remote sync, deployment, and production QA all pass, remove only the Round 14 worktree, prune worktree metadata, and delete the merged local feature branch. Verify no Round 14 branch or worktree remains.
