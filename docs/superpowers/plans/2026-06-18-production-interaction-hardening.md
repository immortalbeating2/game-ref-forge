# Round 4 Production Interaction Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden RefForge metadata preview feedback, delete confirmation, seed fallback messaging, and production CRUD validation.

**Architecture:** Keep the existing vinext/React single-page research desk and D1-backed API. Add small UI-state helpers and focused tests before touching `app/page.tsx`, then wire the helpers into the existing add/edit/delete flows.

**Tech Stack:** vinext, React 19, TypeScript, Vitest, Cloudflare-compatible API routes, D1 binding `DB`, Codex App Sites.

---

## File Structure

- Modify: `app/page.tsx`
  - Wire metadata preview status, app-owned delete confirmation, seed fallback copy, and stable UI feedback.
- Create: `lib/interaction-state.ts`
  - Pure helpers for preview status labels, delete confirmation state, and seed fallback display copy.
- Create: `tests/interaction-state.test.ts`
  - Unit tests for the helpers before UI wiring.
- Modify: `tests/ui-state.test.ts`
  - Add focused regression coverage if existing UI helper behavior changes.
- Create: `docs/qa/2026-06-18-production-interaction-hardening.md`
  - QA checklist and browser test evidence.
- Modify: `docs/progress/status.md`
  - Update current stage and risks after implementation.
- Modify: `docs/progress/timeline.md`
  - Record branch, commits, validation, deployment, and production QA.
- Create/Modify: `docs/progress/2026-06-18.md`
  - Record daily work, verification, risks, and next step.

## Task 1: Add Interaction State Helpers

**Files:**
- Create: `lib/interaction-state.ts`
- Create: `tests/interaction-state.test.ts`

- [ ] **Step 1: Write failing helper tests**

Create `tests/interaction-state.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  deleteConfirmationCopy,
  metadataPreviewMessage,
  seedFallbackMessage,
} from "../lib/interaction-state";

describe("metadataPreviewMessage", () => {
  it("returns stable labels for preview states", () => {
    expect(metadataPreviewMessage("idle")).toBe(null);
    expect(metadataPreviewMessage("loading")).toBe("Previewing metadata...");
    expect(metadataPreviewMessage("success")).toBe(
      "Metadata preview ready. Review the fields before saving.",
    );
    expect(metadataPreviewMessage("failure")).toBe(
      "Metadata preview failed. You can still save this reference manually.",
    );
  });
});

describe("deleteConfirmationCopy", () => {
  it("names the reference being deleted", () => {
    expect(deleteConfirmationCopy("Kenney UI Pack")).toEqual({
      title: "Delete reference?",
      body: 'Delete "Kenney UI Pack" from this private research desk?',
      cancel: "Cancel",
      confirm: "Delete reference",
    });
  });
});

describe("seedFallbackMessage", () => {
  it("explains starter examples without implying D1 data", () => {
    expect(seedFallbackMessage()).toBe(
      "Showing starter examples. Add a private reference to begin using your own dataset.",
    );
  });
});
```

- [ ] **Step 2: Run the failing test**

Run:

```powershell
npm test -- tests/interaction-state.test.ts
```

Expected: fails because `lib/interaction-state.ts` does not exist.

- [ ] **Step 3: Implement helpers**

Create `lib/interaction-state.ts`:

```ts
export type MetadataPreviewStatus = "idle" | "loading" | "success" | "failure";

export function metadataPreviewMessage(status: MetadataPreviewStatus) {
  switch (status) {
    case "idle":
      return null;
    case "loading":
      return "Previewing metadata...";
    case "success":
      return "Metadata preview ready. Review the fields before saving.";
    case "failure":
      return "Metadata preview failed. You can still save this reference manually.";
  }
}

export function deleteConfirmationCopy(referenceTitle: string) {
  return {
    title: "Delete reference?",
    body: `Delete "${referenceTitle}" from this private research desk?`,
    cancel: "Cancel",
    confirm: "Delete reference",
  };
}

export function seedFallbackMessage() {
  return "Showing starter examples. Add a private reference to begin using your own dataset.";
}
```

- [ ] **Step 4: Run helper tests**

Run:

```powershell
npm test -- tests/interaction-state.test.ts
```

Expected: passes.

- [ ] **Step 5: Commit**

```powershell
git add lib/interaction-state.ts tests/interaction-state.test.ts
git commit -m "test: 增加交互状态 helper / add interaction state helpers"
```

## Task 2: Stabilize Metadata Preview Feedback

**Files:**
- Modify: `app/page.tsx`
- Modify: `tests/interaction-state.test.ts` if helper behavior needs a small extension

- [ ] **Step 1: Add preview status state**

In `app/page.tsx`, import:

```ts
import {
  deleteConfirmationCopy,
  MetadataPreviewStatus,
  metadataPreviewMessage,
  seedFallbackMessage,
} from "../lib/interaction-state";
```

Add state near the existing `isPreviewing` state:

```ts
const [previewStatus, setPreviewStatus] = useState<MetadataPreviewStatus>("idle");
```

- [ ] **Step 2: Set preview loading/success/failure**

In the metadata preview handler, set:

```ts
setPreviewStatus("loading");
```

before the fetch starts.

When the preview response succeeds and fields are applied, set:

```ts
setPreviewStatus("success");
setMessage("Metadata preview ready. Review the fields before saving.");
```

When the preview fails, preserve the existing draft and set:

```ts
setPreviewStatus("failure");
setMessage(error instanceof Error ? error.message : "Metadata preview failed. You can still save this reference manually.");
```

- [ ] **Step 3: Render stable preview status text**

Near the add form preview buttons, render:

```tsx
{metadataPreviewMessage(previewStatus) ? (
  <p className={`form-status form-status--${previewStatus}`}>
    {metadataPreviewMessage(previewStatus)}
  </p>
) : null}
```

Keep existing API error `message` rendering intact.

- [ ] **Step 4: Verify with browser**

Run local dev server if needed:

```powershell
npm run dev -- --port 3000
```

Browser check:

- Open `http://localhost:3000`.
- Open add form.
- Enter `https://example.com/`.
- Click `Preview metadata`.
- Expected: page contains `Metadata preview ready. Review the fields before saving.` or a clear failure message while keeping form fields editable.

- [ ] **Step 5: Commit**

```powershell
git add app/page.tsx
git commit -m "feat: 稳定 metadata preview 反馈 / stabilize metadata preview feedback"
```

## Task 3: Replace Native Delete Confirm With App Confirmation

**Files:**
- Modify: `app/page.tsx`
- Test: `tests/interaction-state.test.ts`

- [ ] **Step 1: Add delete confirmation state**

In `app/page.tsx`, add:

```ts
const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
const [isDeleting, setIsDeleting] = useState(false);
```

- [ ] **Step 2: Split delete request and delete confirmation**

Replace the direct `confirm()` delete path with:

```ts
function requestDelete(reference: ReferenceRecord) {
  setPendingDeleteId(reference.id);
  setMessage(null);
}

function cancelDelete() {
  setPendingDeleteId(null);
}
```

Then keep the API deletion in:

```ts
async function confirmDelete(reference: ReferenceRecord) {
  setIsDeleting(true);
  try {
    const response = await fetch(`/api/references/${reference.id}`, {
      method: "DELETE",
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error ?? "Failed to delete reference");
    }

    setReferences((current) => current.filter((item) => item.id !== reference.id));
    setSelectedId((current) => (current === reference.id ? null : current));
    setPendingDeleteId(null);
    setMessage("Reference deleted.");
  } catch (error) {
    setMessage(error instanceof Error ? error.message : "Failed to delete reference");
  } finally {
    setIsDeleting(false);
  }
}
```

- [ ] **Step 3: Render confirmation panel**

In the selected detail actions, replace the old delete button click with:

```tsx
<button type="button" className="danger-button" onClick={() => requestDelete(selectedReference)}>
  Delete reference
</button>
```

When `pendingDeleteId === selectedReference.id`, render:

```tsx
<div className="delete-confirmation" role="alertdialog" aria-labelledby="delete-confirmation-title">
  <h3 id="delete-confirmation-title">{deleteConfirmationCopy(selectedReference.title).title}</h3>
  <p>{deleteConfirmationCopy(selectedReference.title).body}</p>
  <div className="confirmation-actions">
    <button type="button" onClick={cancelDelete} disabled={isDeleting}>
      {deleteConfirmationCopy(selectedReference.title).cancel}
    </button>
    <button
      type="button"
      className="danger-button"
      onClick={() => confirmDelete(selectedReference)}
      disabled={isDeleting}
    >
      {isDeleting ? "Deleting..." : deleteConfirmationCopy(selectedReference.title).confirm}
    </button>
  </div>
</div>
```

- [ ] **Step 4: Style confirmation panel**

In `app/globals.css`, add a compact confirmation treatment:

```css
.delete-confirmation {
  border: 1px solid rgba(248, 113, 113, 0.45);
  background: rgba(127, 29, 29, 0.22);
  border-radius: 8px;
  padding: 12px;
  display: grid;
  gap: 10px;
}

.delete-confirmation h3 {
  margin: 0;
  font-size: 0.95rem;
}

.delete-confirmation p {
  margin: 0;
  color: var(--muted);
}

.confirmation-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  flex-wrap: wrap;
}
```

- [ ] **Step 5: Browser verify delete**

Use in-app browser on `http://localhost:3000`:

- Create a QA reference.
- Select it.
- Click `Delete reference`.
- Expected: app confirmation appears; no native confirm appears.
- Click `Cancel`.
- Expected: reference remains.
- Click `Delete reference` again, then confirm.
- Expected: `Reference deleted.` appears and reload no longer shows the QA reference.

- [ ] **Step 6: Commit**

```powershell
git add app/page.tsx app/globals.css
git commit -m "feat: 使用应用内删除确认 / use app delete confirmation"
```

## Task 4: Clarify Seed Fallback State

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Track seed fallback usage**

In `app/page.tsx`, add:

```ts
const [isUsingSeedReferences, setIsUsingSeedReferences] = useState(false);
```

In `loadReferences`, set:

```ts
setIsUsingSeedReferences(rows.length === 0);
setReferences(rows.length > 0 ? rows : seedReferences);
```

In the `catch` branch, set:

```ts
setIsUsingSeedReferences(true);
```

When a real reference is saved successfully, set:

```ts
setIsUsingSeedReferences(false);
```

- [ ] **Step 2: Render seed fallback message**

Near the result summary, render:

```tsx
{isUsingSeedReferences ? (
  <p className="seed-fallback-message">{seedFallbackMessage()}</p>
) : null}
```

- [ ] **Step 3: Style seed fallback message**

In `app/globals.css`, add:

```css
.seed-fallback-message {
  margin: 0;
  color: var(--muted);
  font-size: 0.9rem;
}
```

- [ ] **Step 4: Verify seed copy**

Run with an empty local D1 state or after deleting all local references.

Expected:

- The seed cards may display.
- The message `Showing starter examples. Add a private reference to begin using your own dataset.` is visible.
- After saving a real reference, seed cards disappear and the message is gone.

- [ ] **Step 5: Commit**

```powershell
git add app/page.tsx app/globals.css
git commit -m "feat: 标明 starter examples 状态 / label starter examples state"
```

## Task 5: Run Full Validation And Production QA

**Files:**
- Create: `docs/qa/2026-06-18-production-interaction-hardening.md`
- Modify: `docs/progress/status.md`
- Modify: `docs/progress/timeline.md`
- Create/Modify: `docs/progress/2026-06-18.md`

- [ ] **Step 1: Run automated checks**

Run:

```powershell
npm test
npm run typecheck
npm run lint
npm run build
```

Expected:

- Tests pass.
- Typecheck passes.
- Lint passes.
- Build passes.

- [ ] **Step 2: Run local browser QA**

Use the in-app browser at `http://localhost:3000`.

Record:

- Metadata preview success or failure text.
- Create and reload persistence.
- Edit and reload persistence.
- Delete confirmation cancel.
- Delete confirmation confirm.
- Post-delete reload absence.

- [ ] **Step 3: Save and deploy Sites version**

After all changes are committed and `main` or the implementation branch has been merged as appropriate:

```powershell
git push origin main
```

Use Sites tools:

- Push exact source state to the Sites source repository.
- Save a new Sites version with the current commit SHA.
- Deploy the saved version.
- Check deployment status until terminal.

- [ ] **Step 4: Run production logged-in QA**

Open:

```text
https://game-ref-forge.yeep-6613.chatgpt-team.site
```

Record:

- Create QA reference.
- Metadata preview visible feedback.
- Save.
- Refresh persistence.
- Edit.
- Refresh persistence.
- Delete via app confirmation.
- Refresh absence.

- [ ] **Step 5: Write QA note**

Create `docs/qa/2026-06-18-production-interaction-hardening.md` with:

```md
# Production Interaction Hardening QA

Date: 2026-06-18
Branch: `codex/round-4-production-hardening`

## Automated Validation

- `npm test`: pending
- `npm run typecheck`: pending
- `npm run lint`: pending
- `npm run build`: pending

## Local Browser QA

- Metadata preview feedback: pending
- Create and reload persistence: pending
- Edit and reload persistence: pending
- Delete cancel: pending
- Delete confirm and reload absence: pending

## Production Browser QA

- Production URL: `https://game-ref-forge.yeep-6613.chatgpt-team.site`
- Access mode: `custom`
- Logged-in CRUD: pending

## Issues Found

- None recorded yet.
```

Replace `pending` with actual results before committing.

- [ ] **Step 6: Update progress docs**

Update:

- `docs/progress/status.md`
- `docs/progress/timeline.md`
- `docs/progress/2026-06-18.md`

Include:

- What changed.
- Why it changed.
- Validation results.
- Sites version and deployment URL if deployed.
- Production QA result or blocker.

- [ ] **Step 7: Commit QA and progress**

```powershell
git add docs/qa/2026-06-18-production-interaction-hardening.md docs/progress/status.md docs/progress/timeline.md docs/progress/2026-06-18.md
git commit -m "docs: 记录第四轮交互加固验证 / record round 4 hardening validation"
```

## Execution Notes

- Work should start from latest `main` on branch `codex/round-4-production-hardening`.
- Use small commits per task.
- Do not merge until automated validation and local browser QA pass.
- Do not claim production CRUD passed unless the logged-in production URL is actually tested.

