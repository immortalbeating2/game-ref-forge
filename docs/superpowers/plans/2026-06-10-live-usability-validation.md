# Live Usability Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Validate and harden RefForge version 1 on the deployed Sites production URL so real reference create, reload, metadata preview, delete, interaction, and basic layout flows are usable.

**Architecture:** Keep the current Sites vinext/React app shape. Use production manual QA to find real issues, then make the smallest responsible code fixes in `app/page.tsx`, `app/globals.css`, `lib/metadata.ts`, `lib/reference.ts`, route handlers, or `lib/reference-db.ts`. Capture the validation trail in `docs/qa/` and the required progress documents.

**Tech Stack:** Codex App Sites, vinext/React, TypeScript, D1, Drizzle, Vitest, ESLint, GitHub remote `origin`, deployed URL `https://game-ref-forge.yeep-6613.chatgpt-team.site`.

---

## File Structure

- Create: `docs/qa/2026-06-10-live-usability-validation.md`
  - Records the production validation checklist, test references, results, defects found, fixes, and final pass/fail state.
- Modify: `app/page.tsx`
  - Hardens UI state, no-results behavior, save/delete feedback, metadata preview messages, and interaction affordances discovered during validation.
- Modify: `app/globals.css`
  - Fixes desktop/mobile layout issues found during QA without changing the overall visual direction.
- Modify: `lib/metadata.ts`
  - Improves metadata extraction only if validation shows common source pages fail because of parser limitations.
- Modify: `lib/reference.ts`
  - Improves validation or shared reference helpers only when needed by observed save/QA failures.
- Modify: `app/api/metadata/preview/route.ts`
  - Improves preview error shape only if production feedback is unclear or too raw.
- Modify: `app/api/references/route.ts`
  - Improves create/list route feedback only if production validation finds unclear errors.
- Modify: `app/api/references/[id]/route.ts`
  - Improves delete/update route feedback only if production validation finds incorrect UI behavior.
- Modify: `tests/metadata.test.ts`
  - Adds regression coverage for metadata parser fixes.
- Modify: `tests/reference.test.ts`
  - Adds regression coverage for reference validation fixes.
- Create when Task 3 extracts UI-state helpers: `tests/ui-state.test.ts`
  - Covers extracted UI-state helpers if `app/page.tsx` is refactored to make bug fixes testable.
- Modify: `docs/progress/status.md`
  - Updates current stage and next step.
- Modify: `docs/progress/timeline.md`
  - Records second-round branch, validation, deployment, and merge events.
- Modify: `docs/progress/2026-06-10.md`
  - Records daily work, verification, production findings, and delegation log.

## Scope Guard

This implementation plan intentionally does not add public routes, R2 uploads, bulk import, source-specific adapters, team collaboration, original asset records, or a broad visual redesign.

Second-round implementation is complete only when the deployed production URL can pass the live validation checklist or when a concrete external blocker is recorded.

---

### Task 1: Branch Setup And QA Checklist

**Files:**
- Create: `docs/qa/2026-06-10-live-usability-validation.md`
- Modify: `docs/progress/timeline.md`
- Modify: `docs/progress/2026-06-10.md`

- [ ] **Step 1: Confirm clean baseline**

Run:

```bash
git status --short
git branch --show-current
git log --oneline --decorate -3
```

Expected:

```text
status output is empty
main
9cdf673 (HEAD -> main) docs: 设计第二轮线上可用性验证 / design round 2 live validation
```

If `main` has moved forward, keep going from the actual latest `main` commit and record that commit in the QA document.

- [ ] **Step 2: Create the implementation branch**

Run:

```bash
git switch -c codex/round-2-live-validation
```

Expected:

```text
Switched to a new branch 'codex/round-2-live-validation'
```

- [ ] **Step 3: Create the production QA checklist**

Create `docs/qa/2026-06-10-live-usability-validation.md` with this content:

```markdown
# 2026-06-10 Live Usability Validation

## Scope

Validate deployed RefForge v1 on production and fix only issues required for the deployed app to be normally usable.

Production URL:

```text
https://game-ref-forge.yeep-6613.chatgpt-team.site
```

## Branch

- Branch: `codex/round-2-live-validation`
- Base: record actual `git rev-parse main` at start
- Mode: branch only
- Worktree: not used

## Test References

Use clearly named QA records:

- `QA Test - Kenney UI Pack`
- `QA Test - Poly Haven Texture`
- `QA Test - Metadata Failure`

Delete at least one QA record before final completion.

## Automated Baseline

- [ ] `npm test`
- [ ] `npm run typecheck`
- [ ] `npm run lint`
- [ ] `npm run build`

## Production Data Validation

- [ ] Open production URL.
- [ ] Add `QA Test - Kenney UI Pack`.
- [ ] Add `QA Test - Poly Haven Texture`.
- [ ] Refresh page and confirm added references remain visible.
- [ ] Delete one QA reference.
- [ ] Refresh page and confirm deleted reference remains absent.

## Metadata Preview Validation

- [ ] Preview a source expected to succeed.
- [ ] Confirm title/site/canonical/preview fields are filled when metadata exists.
- [ ] Preview a source expected to fail or be blocked.
- [ ] Confirm failure message is understandable.
- [ ] Confirm manually entered fields remain after preview failure.
- [ ] Save manually after preview failure.

## Interaction QA

- [ ] Search by title.
- [ ] Search by source/site.
- [ ] Filter by asset category.
- [ ] Filter by license status.
- [ ] Filter by public status.
- [ ] Clear filters.
- [ ] Select reference card.
- [ ] Review right detail panel.
- [ ] Open source link.
- [ ] Open and close add-reference form.
- [ ] Save with missing required data.
- [ ] Confirm delete prompt includes reference title.

## Layout QA

- [ ] Desktop: three-pane layout readable.
- [ ] Desktop: no visible overlap or clipped controls.
- [ ] Desktop: long title does not break cards.
- [ ] Mobile: no horizontal scrolling.
- [ ] Mobile: form controls fit.
- [ ] Mobile: detail panel remains readable.

## Findings

| ID | Area | Finding | Severity | Fix Commit | Status |
| --- | --- | --- | --- | --- | --- |

## Final Result

- Status: `not-run`
- Production version:
- Deployment URL:
- Notes:
```

- [ ] **Step 4: Update branch trace documents**

Append this entry to `docs/progress/timeline.md`:

```markdown
### 2026-06-10

- Branch: `codex/round-2-live-validation`
- Mode: branch only
- Scope: production live usability validation, metadata preview validation, interaction QA, layout QA, and minimal fixes
- Reason: second-round implementation affects validation workflow and may require small code, style, and route fixes
- Worktree: not used because the task can proceed in the single active workspace
```

Append this entry under `## Work Completed` in `docs/progress/2026-06-10.md`:

```markdown
- Started second-round implementation branch:
  - `codex/round-2-live-validation`
- Created live validation checklist:
  - `docs/qa/2026-06-10-live-usability-validation.md`
```

- [ ] **Step 5: Commit setup**

Run:

```bash
git add docs/qa/2026-06-10-live-usability-validation.md docs/progress/timeline.md docs/progress/2026-06-10.md
git commit -m "docs: 准备第二轮线上验证 / prepare round 2 live validation"
```

Expected:

```text
commit output contains `docs: 准备第二轮线上验证 / prepare round 2 live validation`
```

---

### Task 2: Baseline Automated Validation

**Files:**
- Modify: `docs/qa/2026-06-10-live-usability-validation.md`
- Modify: `docs/progress/2026-06-10.md`

- [ ] **Step 1: Run automated baseline checks**

Run:

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

Expected:

```text
npm test: 2 test files, 4 tests passed
npm run typecheck: exit 0
npm run lint: exit 0
npm run build: exit 0 and routes include /, /api/metadata/preview, /api/references, /api/references/:id
```

- [ ] **Step 2: Record baseline result in QA checklist**

In `docs/qa/2026-06-10-live-usability-validation.md`, check the four `## Automated Baseline` items.

Under `## Findings`, add no row if all automated checks pass. If a command fails, add a row:

```markdown
| AUTO-1 | Automated baseline | `npm run build` failed with `route compilation error` | high |  | open |
```

- [ ] **Step 3: Fix automated baseline failures if present**

If an automated failure exists, make the smallest code or config fix and add a regression test when the failure maps to product behavior.

For example, if metadata tests need a new parser case, update `tests/metadata.test.ts` first with the failing case:

```ts
it("reads canonical links when href appears before rel", () => {
  const metadata = extractMetadataFromHtml(
    `<link href="/assets/ui-pack" rel="canonical" />
     <meta content="Kenney UI Pack" property="og:title" />`,
    "https://kenney.nl/assets/ui-pack?ref=demo",
  );

  expect(metadata.canonical_url).toBe("https://kenney.nl/assets/ui-pack");
  expect(metadata.title).toBe("Kenney UI Pack");
});
```

Run:

```bash
npm test
```

Expected before implementation:

```text
FAIL tests/metadata.test.ts
```

Then implement the smallest `lib/metadata.ts` change and rerun:

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

Expected:

```text
all commands exit 0
```

- [ ] **Step 4: Commit baseline validation**

Run:

```bash
git add docs/qa/2026-06-10-live-usability-validation.md docs/progress/2026-06-10.md tests lib app db package.json package-lock.json
git commit -m "test: 验证第二轮自动化基线 / verify round 2 automated baseline"
```

If no files changed after the baseline run, do not create an empty commit. Instead, record in `docs/progress/2026-06-10.md`:

```markdown
- Automated baseline passed without code changes:
  - `npm test`
  - `npm run typecheck`
  - `npm run lint`
  - `npm run build`
```

Then commit only the QA/progress documentation.

---

### Task 3: Local UI Hardening Before Production QA

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/globals.css`
- Create when extracting UI-state helper: `tests/ui-state.test.ts`
- Modify: `docs/qa/2026-06-10-live-usability-validation.md`

This task fixes UI issues already visible from reading the code before production testing. It should stay small.

- [ ] **Step 1: Write failing tests for filter empty-state helper if extracting logic**

If you extract UI state helpers, create `tests/ui-state.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { getVisibleDetailReference } from "../lib/ui-state";
import type { ReferenceRecord } from "../lib/reference";

const reference = {
  id: "qa-1",
  title: "QA Test",
  source_url: "https://example.com",
  canonical_url: null,
  site_name: "Example",
  author: null,
  preview_url: null,
  media_type: "image",
  asset_category: "prop",
  source_category: null,
  style_tags: [],
  use_tags: [],
  license_status: "private_reference",
  attribution_text: null,
  public_status: "private",
  rating: null,
  inspiration_points: [],
  deconstruction_notes: null,
  transformation_ideas: null,
  avoid_copying_notes: null,
  related_original_asset: null,
  created_at: "2026-06-10T00:00:00.000Z",
  updated_at: "2026-06-10T00:00:00.000Z",
} satisfies ReferenceRecord;

describe("visible detail reference", () => {
  it("returns null when filters hide every reference", () => {
    expect(getVisibleDetailReference([], [reference], reference.id)).toBeNull();
  });

  it("keeps the selected filtered reference when it is visible", () => {
    expect(getVisibleDetailReference([reference], [reference], reference.id)?.id).toBe("qa-1");
  });
});
```

Run:

```bash
npm test tests/ui-state.test.ts
```

Expected:

```text
FAIL tests/ui-state.test.ts
Cannot find module '../lib/ui-state'
```

- [ ] **Step 2: Implement helper when Step 1 is used**

If Step 1 was used, create `lib/ui-state.ts`:

```ts
import type { ReferenceRecord } from "./reference";

export function getVisibleDetailReference(
  filteredReferences: ReferenceRecord[],
  allReferences: ReferenceRecord[],
  selectedId: string | null,
) {
  if (filteredReferences.length === 0) {
    return null;
  }

  return (
    filteredReferences.find((reference) => reference.id === selectedId) ??
    filteredReferences[0] ??
    allReferences[0] ??
    null
  );
}
```

Then update `app/page.tsx` to use:

```ts
import { getVisibleDetailReference } from "../lib/ui-state";
```

Replace the `selectedReference` calculation with:

```ts
const selectedReference = getVisibleDetailReference(
  filteredReferences,
  references,
  selectedId,
);
```

Run:

```bash
npm test tests/ui-state.test.ts
```

Expected:

```text
PASS tests/ui-state.test.ts
```

- [ ] **Step 3: Add no-results UI**

In `app/page.tsx`, after `.result-summary` and before `.reference-grid`, add:

```tsx
{filteredReferences.length === 0 ? (
  <div className="empty-results">
    <h2>No references match these filters</h2>
    <p>Clear filters or add a new private reference to continue validation.</p>
    <button
      type="button"
      className="ghost-button"
      onClick={() => {
        setAssetCategory("all");
        setPublicStatus("all");
        setLicenseStatus("all");
        setQuery("");
      }}
    >
      Clear filters
    </button>
  </div>
) : null}
```

Update the reference grid opening tag:

```tsx
<div className="reference-grid" aria-live="polite">
```

- [ ] **Step 4: Add CSS for no-results and mobile resilience**

In `app/globals.css`, add:

```css
.empty-results {
  display: grid;
  gap: 10px;
  border: 1px dashed var(--border);
  border-radius: 8px;
  background: #15191c;
  padding: 18px;
}

.empty-results h2,
.empty-results p {
  margin: 0;
}
```

In the mobile media query, add:

```css
.reference-card {
  min-height: 0;
}

.detail-panel dl div {
  grid-template-columns: 1fr;
  gap: 4px;
}
```

- [ ] **Step 5: Verify local hardening**

Run:

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

Expected:

```text
all commands exit 0
```

- [ ] **Step 6: Commit local UI hardening**

Run:

```bash
git add app/page.tsx app/globals.css lib/ui-state.ts tests/ui-state.test.ts docs/qa/2026-06-10-live-usability-validation.md
git commit -m "fix: 加固验证前 UI 状态 / harden UI states before validation"
```

If `lib/ui-state.ts` and `tests/ui-state.test.ts` were not needed, omit them from `git add`.

---

### Task 4: Production QA Run

**Files:**
- Modify: `docs/qa/2026-06-10-live-usability-validation.md`
- Modify: `docs/progress/2026-06-10.md`

- [ ] **Step 1: Open production URL**

Open:

```text
https://game-ref-forge.yeep-6613.chatgpt-team.site
```

Expected:

```text
RefForge workspace loads without a fatal error.
```

Record whether seed examples or real D1 records appear.

- [ ] **Step 2: Test metadata preview success**

Use this source:

```text
https://kenney.nl/assets/ui-pack
```

Create a draft named:

```text
QA Test - Kenney UI Pack
```

Click metadata preview.

Expected:

```text
The app shows a success message or fills at least title/site/canonical/preview fields when source metadata is available.
The form remains editable.
```

If preview fails because the source blocks fetches, record the failure in Findings and use a different source such as:

```text
https://polyhaven.com/textures
```

- [ ] **Step 3: Test metadata preview failure**

Use this source:

```text
not-a-url
```

Expected:

```text
The app shows an understandable failure message.
The form remains open.
Manually entered fields remain.
```

If the browser blocks submission before preview because the source field is empty or invalid, record the exact UI behavior.

- [ ] **Step 4: Save 1-3 QA references**

Create these records:

```text
QA Test - Kenney UI Pack
QA Test - Poly Haven Texture
QA Test - Metadata Failure
```

Use safe categories:

```text
QA Test - Kenney UI Pack: media_type asset_pack, asset_category ui_hud
QA Test - Poly Haven Texture: media_type image, asset_category material_texture
QA Test - Metadata Failure: media_type article, asset_category prop
```

Expected:

```text
Each save either succeeds and adds a card or fails with a clear message while preserving the form.
```

- [ ] **Step 5: Refresh and verify persistence**

Refresh the production page.

Expected:

```text
Saved QA references remain visible after refresh.
```

If only seed records appear after refresh, record a high-severity D1 persistence finding.

- [ ] **Step 6: Test interactions**

Run through:

```text
Search "QA Test"
Filter asset category "UI/HUD"
Filter license status "private reference"
Filter public status "private"
Clear filters
Select each QA card
Open source link
Open and close add-reference form
Save with missing title or invalid source URL
```

Expected:

```text
Each interaction responds visibly and does not leave the interface stuck.
```

- [ ] **Step 7: Test delete**

Delete:

```text
QA Test - Metadata Failure
```

Expected:

```text
Confirmation prompt includes the reference title.
The record disappears after confirmation.
After refresh, the deleted record remains absent.
```

- [ ] **Step 8: Check desktop and mobile layout**

Use browser responsive sizing or available browser tools to inspect:

```text
Desktop: around 1200x750
Mobile: around 390x844
```

Expected:

```text
No horizontal scrolling on mobile.
No obvious text overlap.
Controls are tappable.
Detail panel is readable.
```

- [ ] **Step 9: Record findings**

For every issue found, add a row in `docs/qa/2026-06-10-live-usability-validation.md`:

```markdown
| QA-1 | Metadata preview | Failed preview clears manually entered title | high |  | open |
```

Use severity:

```text
critical: cannot load, cannot save, cannot delete, data lost
high: primary flow blocked or misleading
medium: interaction works but confusing or rough
low: cosmetic roughness that does not block use
```

- [ ] **Step 10: Commit QA results**

Run:

```bash
git add docs/qa/2026-06-10-live-usability-validation.md docs/progress/2026-06-10.md
git commit -m "test: 记录生产可用性验证 / record production usability validation"
```

Expected:

```text
commit output contains `test: 记录生产可用性验证 / record production usability validation`
```

---

### Task 5: Fix Production Findings

**Files:**
- Modify based on findings:
  - `app/page.tsx`
  - `app/globals.css`
  - `lib/metadata.ts`
  - `lib/reference.ts`
  - `lib/reference-db.ts`
  - `app/api/metadata/preview/route.ts`
  - `app/api/references/route.ts`
  - `app/api/references/[id]/route.ts`
  - `tests/metadata.test.ts`
  - `tests/reference.test.ts`
  - `tests/ui-state.test.ts`
- Modify: `docs/qa/2026-06-10-live-usability-validation.md`

Do this task once per finding or tightly related group of findings. Keep commits focused.

- [ ] **Step 1: Pick the highest severity open finding**

In `docs/qa/2026-06-10-live-usability-validation.md`, select the first `critical` or `high` row with `Status` = `open`.

If no `critical` or `high` findings exist, fix only `medium` issues required by the acceptance checklist.

- [ ] **Step 2: Write a failing regression test when practical**

If the finding is metadata parsing, add a failing case to `tests/metadata.test.ts`.

Example for `href` before `rel` canonical links:

```ts
it("reads canonical links when href appears before rel", () => {
  const metadata = extractMetadataFromHtml(
    `<link href="/assets/ui-pack" rel="canonical" />
     <meta content="Kenney UI Pack" property="og:title" />`,
    "https://kenney.nl/assets/ui-pack?ref=demo",
  );

  expect(metadata.canonical_url).toBe("https://kenney.nl/assets/ui-pack");
  expect(metadata.title).toBe("Kenney UI Pack");
});
```

Run:

```bash
npm test tests/metadata.test.ts
```

Expected:

```text
FAIL tests/metadata.test.ts
```

If the finding is reference validation, add a failing case to `tests/reference.test.ts`.

Example:

```ts
it("rejects ratings outside 1 to 5", () => {
  const result = validateReferenceInput({
    ...DEFAULT_REFERENCE_INPUT,
    title: "QA Test",
    source_url: "https://example.com",
    rating: 6,
  });

  expect(result.ok).toBe(false);
  expect(result.errors).toContain("rating must be between 1 and 5");
});
```

Run:

```bash
npm test tests/reference.test.ts
```

Expected:

```text
FAIL tests/reference.test.ts
```

If the finding is purely visual and not practical to automate in this stack, record this in the finding row:

```markdown
Manual visual finding; verified by desktop/mobile production QA after CSS fix.
```

- [ ] **Step 3: Implement the smallest fix**

Choose the smallest responsible file:

```text
Metadata parsing -> lib/metadata.ts
Reference validation -> lib/reference.ts
Data persistence -> lib/reference-db.ts or API route
Form state/copy -> app/page.tsx
Layout -> app/globals.css
```

For delete response problems in `app/page.tsx`, replace the current delete request body with:

```ts
if (!reference.id.startsWith("seed-")) {
  const response = await fetch(`/api/references/${reference.id}`, {
    method: "DELETE",
  });
  const payload = await response.json();

  if (!response.ok || !payload.deleted) {
    throw new Error(payload.error ?? "Delete failed.");
  }
}
```

For preview failure copy in `app/page.tsx`, use:

```ts
setMessage(
  error instanceof Error
    ? `Metadata preview failed: ${error.message}. Manual entry is still available.`
    : "Metadata preview failed. Manual entry is still available.",
);
```

For mobile overflow in `app/globals.css`, prefer targeted layout fixes such as:

```css
.workspace {
  overflow-x: hidden;
}

.reference-card,
.detail-panel,
.reference-form {
  min-width: 0;
}

.badge-row span {
  overflow-wrap: anywhere;
}
```

- [ ] **Step 4: Verify the fix**

Run:

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

Expected:

```text
all commands exit 0
```

- [ ] **Step 5: Re-test the specific production behavior locally or on deployed version**

If the fix can be checked locally, run:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

Verify the specific finding no longer reproduces.

If the fix requires production D1, defer final verification to Task 6 after deployment.

- [ ] **Step 6: Mark finding fixed**

In `docs/qa/2026-06-10-live-usability-validation.md`, update the finding row:

```markdown
| QA-1 | Metadata preview | Failed preview clears manually entered title | high | `record the actual fix commit SHA` | fixed |
```

Use the actual commit SHA after Step 7.

- [ ] **Step 7: Commit the fix**

Run:

```bash
git add app lib tests docs/qa/2026-06-10-live-usability-validation.md
git commit -m "fix: 修复线上验证问题 / fix live validation issue"
```

Expected:

```text
commit output contains `fix: 修复线上验证问题 / fix live validation issue`
```

Repeat Task 5 until no `critical` or `high` findings remain open and all acceptance checklist items are passable.

---

### Task 6: Save And Deploy Sites Version 2

**Files:**
- Modify: `.openai/hosting.json` only if Sites connector returns required metadata changes
- Modify: `docs/qa/2026-06-10-live-usability-validation.md`
- Modify: `docs/progress/status.md`
- Modify: `docs/progress/timeline.md`
- Modify: `docs/progress/2026-06-10.md`

- [ ] **Step 1: Run final local validation**

Run:

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

Expected:

```text
all commands exit 0
```

- [ ] **Step 2: Verify artifact contents**

Run:

```bash
Test-Path dist\\server\\index.js
Test-Path dist\\client
Test-Path dist\\.openai\\hosting.json
Test-Path dist\\.openai\\drizzle\\0000_melodic_colleen_wing.sql
```

Expected:

```text
True
True
True
True
```

- [ ] **Step 3: Commit final validation docs before deploy**

Run:

```bash
git status --short
git add docs/qa/2026-06-10-live-usability-validation.md docs/progress/status.md docs/progress/timeline.md docs/progress/2026-06-10.md
git commit -m "docs: 更新第二轮验证记录 / update round 2 validation records"
```

If no documentation changed, do not create an empty commit.

- [ ] **Step 4: Push source to Sites source repository**

Use the Sites connector to mint a fresh source repository write credential if the previous token is expired. Do not store the token in Git remote URLs, config files, logs, or docs.

Push the current branch commit SHA to the Sites source repository `main` branch using an HTTP extra header:

```bash
$env:SITES_TOKEN = "paste connector-returned token for this shell only"
$env:SITES_REMOTE_URL = "paste connector-returned source repository remote_url"
git -c http.extraHeader="Authorization: Bearer $env:SITES_TOKEN" push $env:SITES_REMOTE_URL HEAD:main
Remove-Item Env:SITES_TOKEN
Remove-Item Env:SITES_REMOTE_URL
```

Expected:

```text
HEAD -> main
```

- [ ] **Step 5: Prepare deployment archive**

Run:

```bash
$archive = Join-Path $env:TEMP "game-ref-forge-sites-v2.tar.gz"
if (Test-Path $archive) { Remove-Item -LiteralPath $archive -Force }
tar -C "D:\\Desktop\\Project\\Game\\game-ref-forge" -czf $archive dist
Test-Path $archive
```

Expected:

```text
True
```

- [ ] **Step 6: Save Sites version 2**

Use the Sites connector to save a new version with:

```text
project_id: appgprj_6a246b271d848191b88b60d1633030c7
commit_sha: actual current HEAD SHA
archive: value printed by `$archive` from Step 5
```

Expected:

```text
version_number: 2
```

- [ ] **Step 7: Deploy Sites version 2**

Use the Sites connector to deploy the saved version.

Expected:

```text
status: succeeded
url: https://game-ref-forge.yeep-6613.chatgpt-team.site
```

- [ ] **Step 8: Record deployment**

Update `docs/qa/2026-06-10-live-usability-validation.md`:

```markdown
## Final Result

- Status: `passed`
- Production version: `2`
- Deployment URL: `https://game-ref-forge.yeep-6613.chatgpt-team.site`
- Notes: Production create, refresh persistence, preview success/failure, delete, interaction, and layout checks passed.
```

Update `docs/progress/status.md` current stage:

```markdown
`Round 2 / Live usability validation passed`
```

Append to `docs/progress/timeline.md`:

```markdown
### 2026-06-10

- Branch: `codex/round-2-live-validation`
- Sites version saved and deployed:
  - version: `2`
  - deployment status: `succeeded`
  - production URL: `https://game-ref-forge.yeep-6613.chatgpt-team.site`
```

Append to `docs/progress/2026-06-10.md`:

```markdown
- Saved and deployed Sites version 2 after production usability fixes.
- Production live validation passed.
```

- [ ] **Step 9: Commit deployment records**

Run:

```bash
git add docs/qa/2026-06-10-live-usability-validation.md docs/progress/status.md docs/progress/timeline.md docs/progress/2026-06-10.md
git commit -m "docs: 记录第二轮部署验证 / record round 2 deployment validation"
```

Expected:

```text
commit output contains `docs: 记录第二轮部署验证 / record round 2 deployment validation`
```

---

### Task 7: Completion And Merge

**Files:**
- Modify when merge trace requires updates:
  - `docs/progress/status.md`
  - `docs/progress/timeline.md`
  - `docs/progress/2026-06-10.md`

- [ ] **Step 1: Final verification before branch completion**

Run:

```bash
npm test
npm run typecheck
npm run lint
npm run build
git status --short
```

Expected:

```text
npm test: 2 or more test files pass
npm run typecheck: exit 0
npm run lint: exit 0
npm run build: exit 0
git status --short: no output
```

- [ ] **Step 2: Use finishing-a-development-branch**

Invoke `superpowers:finishing-a-development-branch`.

Present the required options:

```text
Implementation complete. What would you like to do?

1. Merge back to main locally
2. Push and create a Pull Request
3. Keep the branch as-is (I'll handle it later)
4. Discard this work

Which option?
```

- [ ] **Step 3: If user chooses local merge, update merge trace**

After merge to `main`, append to `docs/progress/timeline.md`:

```markdown
### 2026-06-10

- Branch: `codex/round-2-live-validation`
- Action: merged back to `main`
- Reason: production live usability validation passed and Sites version 2 deployed
- Worktree cleanup: no extra worktree was used
```

Append to `docs/progress/2026-06-10.md`:

```markdown
- Merged `codex/round-2-live-validation` back to `main` after validation.
```

Commit:

```bash
git add docs/progress/timeline.md docs/progress/2026-06-10.md
git commit -m "docs: 记录第二轮分支合并 / record round 2 branch merge"
```

- [ ] **Step 4: Push GitHub remote**

Run:

```bash
git push -u origin main
```

Expected:

```text
branch 'main' set up to track 'origin/main'
```

If push fails due to network or auth, report the exact failure and leave the local `main` clean and ready to push.
