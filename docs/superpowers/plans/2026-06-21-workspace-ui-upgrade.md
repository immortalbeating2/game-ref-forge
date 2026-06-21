# Workspace UI Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the RefForge main workspace into a clearer Chinese-first `灵感提炼` workstation without changing the data model or API behavior.

**Architecture:** Keep the existing single-page React state model and API calls. Reorganize the rendered markup into stronger semantic regions, improve copy for source/safety/inspiration hierarchy, and replace the current flat dark styling with a denser product-workbench visual system in CSS.

**Tech Stack:** vinext/React, TypeScript, CSS, Vitest.

---

## File Structure

- Modify: `lib/localization.ts`
  - Add small UI copy keys for Round 7 section headers and score/tag summaries.
- Modify: `tests/localization.test.ts`
  - Cover the new Chinese-first copy keys.
- Modify: `app/page.tsx`
  - Reorganize sidebar, gallery toolbar, reference cards, detail header, score summary, tag groups, and structured inspiration blocks.
- Modify: `app/globals.css`
  - Implement Round 7 layout, density, panel hierarchy, card styling, responsive behavior, and state visuals.
- Modify: `docs/progress/2026-06-21.md`, `docs/progress/status.md`, `docs/progress/timeline.md`
  - Record implementation and validation results.

## Task 1: Round 7 Copy Hooks

**Files:**
- Modify: `lib/localization.ts`
- Modify: `tests/localization.test.ts`

- [x] **Step 1: Write failing localization expectations**

Add expectations for:

```ts
expect(uiCopy().workspaceMode).toBe("灵感提炼工作台");
expect(uiCopy().sourceAndSafety).toBe("来源与安全");
expect(uiCopy().scoreMatrix).toBe("评分矩阵");
expect(uiCopy().tagAxes).toBe("标签轴");
expect(uiCopy().researchControls).toBe("研究控制");
```

- [x] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/localization.test.ts`

Expected: FAIL because the new copy keys do not exist.

- [x] **Step 3: Add minimal Chinese and English copy**

Add these keys to both languages:

- `workspaceMode`
- `sourceAndSafety`
- `scoreMatrix`
- `tagAxes`
- `researchControls`
- `referenceDeck`
- `inspirationWorkbench`
- `privateByDefault`

- [x] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/localization.test.ts`

Expected: PASS.

## Task 2: Markup Reorganization

**Files:**
- Modify: `app/page.tsx`

- [x] **Step 1: Update sidebar semantics**

Change the sidebar brand block to show:

- `REFFORGE`
- `灵感锻造台`
- `workspaceMode`
- language selector
- `researchControls`

- [x] **Step 2: Update center toolbar**

Add a compact deck header using `referenceDeck`, result count, and `safetySummary`.

- [x] **Step 3: Upgrade reference cards**

Each card should include:

- category thumbnail block
- title and source
- safety/status badges
- compact score row
- compact tag preview

- [x] **Step 4: Upgrade right detail panel**

Right panel should lead with `inspirationWorkbench`, then source/safety, score matrix, tag axes, structured inspiration, notes, and actions.

- [x] **Step 5: Run typecheck**

Run: `npm run typecheck`

Expected: PASS.

## Task 3: Round 7 CSS System

**Files:**
- Modify: `app/globals.css`

- [x] **Step 1: Replace flat panel styling with workbench hierarchy**

Use:

- stable three-column desktop layout
- denser center card grid
- sticky side panels
- restrained mint accent
- small category accents

- [x] **Step 2: Improve cards and detail blocks**

Add styling for:

- `.workspace-mode`
- `.panel-kicker`
- `.deck-heading`
- `.card-meta`
- `.compact-score-row`
- `.tag-preview`
- `.detail-hero`
- `.detail-section-title`

- [x] **Step 3: Preserve responsive behavior**

Maintain:

- two-column tablet fallback
- single-column mobile fallback
- no horizontal overflow
- readable Chinese labels

- [x] **Step 4: Run lint and build**

Run:

```bash
npm run lint
npm run build
```

Expected: both PASS.

## Task 4: Verification and Traceability

**Files:**
- Modify: `docs/progress/2026-06-21.md`
- Modify: `docs/progress/status.md`
- Modify: `docs/progress/timeline.md`

- [x] **Step 1: Run full verification**

Run:

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

Expected: all PASS.

- [x] **Step 2: Browser smoke**

Start local dev server and inspect:

- desktop layout loads
- `灵感提炼工作台` appears
- reference cards show compact status/score/tag data
- right panel shows `灵感提炼`
- mobile width has no obvious horizontal overflow

- [x] **Step 3: Update progress docs**

Record:

- what changed
- why
- validation results
- production caveat
- next step

- [x] **Step 4: Commit**

Commit message:

```bash
feat: 升级第七轮工作台界面 / upgrade round 7 workspace UI
```
