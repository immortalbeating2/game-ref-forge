# Reference Editing Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add inline editing for the selected reference in the right detail panel, with reliable draft conversion, save/cancel feedback, and persistence through the existing update API.

**Architecture:** Keep the existing three-pane React page. Extract draft conversion and dirty-state helpers from `app/page.tsx` into `lib/reference-draft.ts`, then use those helpers for both add and edit flows. The edit UI stays inside the current detail panel and calls `PUT /api/references/:id` for persisted records.

**Tech Stack:** vinext/React, TypeScript, Vitest, existing D1-backed reference APIs, existing CSS in `app/globals.css`.

---

## File Structure

- Create: `lib/reference-draft.ts`
  - Owns `ReferenceDraft`, empty draft creation, record/input-to-draft conversion, draft-to-input conversion, and dirty-state comparison.
- Create: `tests/reference-draft.test.ts`
  - Unit tests for conversion, array text parsing, null handling, and dirty-state behavior.
- Modify: `app/page.tsx`
  - Import draft helpers, remove local draft conversion duplication, add selected-reference edit state, save/cancel handlers, and inline detail-panel edit form.
- Modify: `app/globals.css`
  - Add compact detail edit form styles and action-row layout.
- Modify: `tests/reference.test.ts`
  - Add a focused regression for update-safe `ReferenceInput` validation if needed by helper behavior.
- Modify: `docs/progress/2026-06-17.md`
  - Record implementation and verification results.
- Modify: `docs/progress/status.md`
  - Update current third-round stage and implementation status.
- Modify: `docs/progress/timeline.md`
  - Record branch, commits, validation, and any deployment/production result.

---

### Task 1: Draft Helpers

**Files:**
- Create: `lib/reference-draft.ts`
- Create: `tests/reference-draft.test.ts`
- Modify: `app/page.tsx`

- [ ] **Step 1: Write failing draft conversion tests**

Create `tests/reference-draft.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  createEmptyReferenceDraft,
  draftToReferenceInput,
  inputToReferenceDraft,
  isReferenceDraftDirty,
  recordToReferenceDraft,
} from "../lib/reference-draft";
import { DEFAULT_REFERENCE_INPUT, ReferenceRecord } from "../lib/reference";

const record = {
  id: "edit-1",
  title: "Original Title",
  source_url: "https://example.com/original",
  canonical_url: "https://example.com/canonical",
  site_name: "Example",
  author: "Example Author",
  preview_url: null,
  media_type: "image",
  asset_category: "prop",
  source_category: "Reference site",
  style_tags: ["chunky", "bright"],
  use_tags: ["inventory"],
  license_status: "private_reference",
  attribution_text: "Example attribution",
  public_status: "private",
  rating: 4,
  inspiration_points: ["Readable silhouette", "Clear material break"],
  deconstruction_notes: "Strong shape language.",
  transformation_ideas: "Use the principle with original forms.",
  avoid_copying_notes: "Do not copy exact icon shape.",
  related_original_asset: "Inventory prop",
  created_at: "2026-06-17T00:00:00.000Z",
  updated_at: "2026-06-17T00:00:00.000Z",
} satisfies ReferenceRecord;

describe("reference draft helpers", () => {
  it("creates an empty draft from default input values", () => {
    expect(createEmptyReferenceDraft()).toEqual({
      ...DEFAULT_REFERENCE_INPUT,
      canonical_url: "",
      site_name: "",
      author: "",
      preview_url: "",
      source_category: "",
      attribution_text: "",
      rating: "",
      deconstruction_notes: "",
      transformation_ideas: "",
      avoid_copying_notes: "",
      related_original_asset: "",
      style_tags_text: "",
      use_tags_text: "",
      inspiration_points_text: "",
    });
  });

  it("converts records to editable text draft fields", () => {
    expect(recordToReferenceDraft(record)).toMatchObject({
      title: "Original Title",
      source_url: "https://example.com/original",
      canonical_url: "https://example.com/canonical",
      site_name: "Example",
      author: "Example Author",
      media_type: "image",
      asset_category: "prop",
      license_status: "private_reference",
      public_status: "private",
      rating: "4",
      style_tags_text: "chunky, bright",
      use_tags_text: "inventory",
      inspiration_points_text: "Readable silhouette, Clear material break",
    });
  });

  it("converts drafts back to normalized ReferenceInput", () => {
    const input = draftToReferenceInput({
      ...recordToReferenceDraft(record),
      style_tags_text: " chunky, bright, ",
      use_tags_text: " inventory, , crafting ",
      inspiration_points_text: "Readable silhouette, Clear material break",
      rating: "5",
    });

    expect(input).toMatchObject({
      title: "Original Title",
      source_url: "https://example.com/original",
      style_tags: ["chunky", "bright"],
      use_tags: ["inventory", "crafting"],
      inspiration_points: ["Readable silhouette", "Clear material break"],
      rating: 5,
    });
  });

  it("detects changed and unchanged drafts", () => {
    const original = recordToReferenceDraft(record);
    expect(isReferenceDraftDirty(original, record)).toBe(false);
    expect(isReferenceDraftDirty({ ...original, title: "Changed" }, record)).toBe(true);
  });

  it("creates drafts from partial input without leaking arrays into text controls", () => {
    const draft = inputToReferenceDraft({
      ...DEFAULT_REFERENCE_INPUT,
      title: "New",
      source_url: "https://example.com/new",
      style_tags: ["soft", "cozy"],
      inspiration_points: ["Palette"],
    });

    expect(draft.style_tags_text).toBe("soft, cozy");
    expect(draft.inspiration_points_text).toBe("Palette");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```powershell
npm test -- tests/reference-draft.test.ts
```

Expected: FAIL because `../lib/reference-draft` does not exist.

- [ ] **Step 3: Implement `lib/reference-draft.ts`**

Create `lib/reference-draft.ts`:

```ts
import {
  DEFAULT_REFERENCE_INPUT,
  ReferenceInput,
  ReferenceRecord,
} from "./reference";

export type ReferenceDraft = Omit<
  ReferenceInput,
  "style_tags" | "use_tags" | "inspiration_points" | "rating"
> & {
  canonical_url: string;
  site_name: string;
  author: string;
  preview_url: string;
  source_category: string;
  attribution_text: string;
  rating: string;
  deconstruction_notes: string;
  transformation_ideas: string;
  avoid_copying_notes: string;
  related_original_asset: string;
  style_tags_text: string;
  use_tags_text: string;
  inspiration_points_text: string;
};

function textOrEmpty(value: string | null | undefined) {
  return value ?? "";
}

function joinTags(value: string[] | undefined) {
  return (value ?? []).join(", ");
}

export function splitDraftList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function inputToReferenceDraft(input: ReferenceInput): ReferenceDraft {
  return {
    ...DEFAULT_REFERENCE_INPUT,
    ...input,
    canonical_url: textOrEmpty(input.canonical_url),
    site_name: textOrEmpty(input.site_name),
    author: textOrEmpty(input.author),
    preview_url: textOrEmpty(input.preview_url),
    source_category: textOrEmpty(input.source_category),
    attribution_text: textOrEmpty(input.attribution_text),
    rating: input.rating ? String(input.rating) : "",
    deconstruction_notes: textOrEmpty(input.deconstruction_notes),
    transformation_ideas: textOrEmpty(input.transformation_ideas),
    avoid_copying_notes: textOrEmpty(input.avoid_copying_notes),
    related_original_asset: textOrEmpty(input.related_original_asset),
    style_tags_text: joinTags(input.style_tags),
    use_tags_text: joinTags(input.use_tags),
    inspiration_points_text: joinTags(input.inspiration_points),
  };
}

export function createEmptyReferenceDraft() {
  return inputToReferenceDraft(DEFAULT_REFERENCE_INPUT);
}

export function recordToReferenceDraft(record: ReferenceRecord) {
  return inputToReferenceDraft(record);
}

export function draftToReferenceInput(draft: ReferenceDraft): ReferenceInput {
  return {
    title: draft.title,
    source_url: draft.source_url,
    canonical_url: draft.canonical_url,
    site_name: draft.site_name,
    author: draft.author,
    preview_url: draft.preview_url,
    media_type: draft.media_type,
    asset_category: draft.asset_category,
    source_category: draft.source_category,
    style_tags: splitDraftList(draft.style_tags_text),
    use_tags: splitDraftList(draft.use_tags_text),
    license_status: draft.license_status,
    attribution_text: draft.attribution_text,
    public_status: draft.public_status,
    rating: draft.rating ? Number(draft.rating) : null,
    inspiration_points: splitDraftList(draft.inspiration_points_text),
    deconstruction_notes: draft.deconstruction_notes,
    transformation_ideas: draft.transformation_ideas,
    avoid_copying_notes: draft.avoid_copying_notes,
    related_original_asset: draft.related_original_asset,
  };
}

export function isReferenceDraftDirty(draft: ReferenceDraft, record: ReferenceRecord) {
  return JSON.stringify(draftToReferenceInput(draft)) !==
    JSON.stringify(draftToReferenceInput(recordToReferenceDraft(record)));
}
```

- [ ] **Step 4: Run focused tests**

Run:

```powershell
npm test -- tests/reference-draft.test.ts
```

Expected: PASS.

- [ ] **Step 5: Refactor add form to use draft helpers**

Modify `app/page.tsx`:

```ts
import {
  createEmptyReferenceDraft,
  draftToReferenceInput,
  ReferenceDraft,
} from "../lib/reference-draft";
```

Remove the local `Draft`, `emptyDraft`, and `splitTags` declarations. Replace them with:

```ts
const [draft, setDraft] = useState<ReferenceDraft>(createEmptyReferenceDraft);
```

In `saveReference`, replace manual input construction with:

```ts
const input = draftToReferenceInput(draft);
```

After successful save, reset with:

```ts
setDraft(createEmptyReferenceDraft());
```

- [ ] **Step 6: Run existing validation**

Run:

```powershell
npm test
npm run typecheck
```

Expected: both PASS.

- [ ] **Step 7: Commit Task 1**

Run:

```powershell
git add app/page.tsx lib/reference-draft.ts tests/reference-draft.test.ts
git commit -m "feat: 抽取引用草稿工具 / extract reference draft helpers"
```

---

### Task 2: Update API Regression Coverage

**Files:**
- Modify: `tests/reference.test.ts`
- Read: `lib/reference-db.ts`
- Read: `app/api/references/[id]/route.ts`

- [ ] **Step 1: Add update input regression coverage**

Append to `tests/reference.test.ts`:

```ts
it("accepts valid update payloads for editable fields", () => {
  const result = validateReferenceInput({
    ...DEFAULT_REFERENCE_INPUT,
    title: "Updated Ref",
    source_url: "https://example.com/updated",
    canonical_url: "https://example.com/canonical",
    site_name: "Example",
    author: "Example Author",
    media_type: "article",
    asset_category: "environment",
    source_category: "Article",
    style_tags: ["moody"],
    use_tags: ["lighting"],
    license_status: "source_link_only",
    attribution_text: "Attribution required on source.",
    public_status: "review",
    rating: 3,
    inspiration_points: ["Composition"],
    deconstruction_notes: "Layered focal points.",
    transformation_ideas: "Original layout with similar hierarchy.",
    avoid_copying_notes: "Do not copy the composition exactly.",
    related_original_asset: "Forest arena",
  });

  expect(result).toEqual({ ok: true, errors: [] });
});
```

- [ ] **Step 2: Run focused regression**

Run:

```powershell
npm test -- tests/reference.test.ts
```

Expected: PASS.

- [ ] **Step 3: Inspect update route and data layer**

Confirm these existing behaviors remain true:

- `app/api/references/[id]/route.ts` exports `PUT`.
- `PUT` returns `400` for validation errors.
- `PUT` returns `404` for missing references.
- `lib/reference-db.ts` preserves `id` and `created_at` while updating `updated_at`.

No code change is needed if all four are true.

- [ ] **Step 4: Commit Task 2**

Run:

```powershell
git add tests/reference.test.ts
git commit -m "test: 覆盖引用更新输入 / cover reference update input"
```

---

### Task 3: Inline Detail-Panel Edit UI

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/globals.css`
- Modify: `tests/ui-state.test.ts` if a pure helper is extracted for selection-change behavior

- [ ] **Step 1: Add edit state to `app/page.tsx`**

Add state near existing UI state:

```ts
const [editDraft, setEditDraft] = useState<ReferenceDraft | null>(null);
const [editingId, setEditingId] = useState<string | null>(null);
const [isSavingEdit, setIsSavingEdit] = useState(false);
```

Add derived state:

```ts
const isEditingSelected = Boolean(
  selectedReference && editingId === selectedReference.id && editDraft,
);
```

- [ ] **Step 2: Add edit lifecycle handlers**

Add handlers inside `Home`:

```ts
function startEditing(reference: ReferenceRecord) {
  setEditingId(reference.id);
  setEditDraft(recordToReferenceDraft(reference));
  setMessage("Editing selected reference.");
}

function cancelEditing() {
  setEditingId(null);
  setEditDraft(null);
  setMessage("Edit canceled; no changes saved.");
}

function selectReference(id: string) {
  setSelectedId(id);
  if (editingId && editingId !== id) {
    setEditingId(null);
    setEditDraft(null);
    setMessage("Selection changed; edit draft was closed.");
  }
}
```

Update card click handlers from:

```tsx
onClick={() => setSelectedId(reference.id)}
```

to:

```tsx
onClick={() => selectReference(reference.id)}
```

- [ ] **Step 3: Add save edit handler**

Add inside `Home`:

```ts
async function saveReferenceEdit(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();

  if (!selectedReference || !editDraft) {
    return;
  }

  if (!isReferenceDraftDirty(editDraft, selectedReference)) {
    setMessage("No changes to save.");
    return;
  }

  setIsSavingEdit(true);
  setMessage("Saving reference changes...");

  const input = draftToReferenceInput(editDraft);

  try {
    if (selectedReference.id.startsWith("seed-")) {
      const updatedReference: ReferenceRecord = {
        ...selectedReference,
        ...input,
        canonical_url: input.canonical_url?.trim() || null,
        site_name: input.site_name?.trim() || null,
        author: input.author?.trim() || null,
        preview_url: input.preview_url?.trim() || null,
        source_category: input.source_category?.trim() || null,
        attribution_text: input.attribution_text?.trim() || null,
        rating: input.rating ?? null,
        deconstruction_notes: input.deconstruction_notes?.trim() || null,
        transformation_ideas: input.transformation_ideas?.trim() || null,
        avoid_copying_notes: input.avoid_copying_notes?.trim() || null,
        related_original_asset: input.related_original_asset?.trim() || null,
        style_tags: input.style_tags ?? [],
        use_tags: input.use_tags ?? [],
        inspiration_points: input.inspiration_points ?? [],
        updated_at: new Date().toISOString(),
      };
      setReferences((current) =>
        current.map((item) => item.id === selectedReference.id ? updatedReference : item),
      );
      setEditingId(null);
      setEditDraft(null);
      setMessage("Starter example updated locally; saved production records use D1.");
      return;
    }

    const response = await fetch(`/api/references/${selectedReference.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.errors?.join(", ") ?? payload.error ?? "Update failed.");
    }

    const reference = payload.reference as ReferenceRecord;
    setReferences((current) =>
      current.map((item) => item.id === reference.id ? reference : item),
    );
    setSelectedId(reference.id);
    setEditingId(null);
    setEditDraft(null);
    setMessage("Reference changes saved.");
  } catch (error) {
    setMessage(error instanceof Error ? error.message : "Update failed. Edit contents were preserved.");
  } finally {
    setIsSavingEdit(false);
  }
}
```

- [ ] **Step 4: Import needed draft helpers**

Update import from `../lib/reference-draft`:

```ts
import {
  createEmptyReferenceDraft,
  draftToReferenceInput,
  isReferenceDraftDirty,
  recordToReferenceDraft,
  ReferenceDraft,
} from "../lib/reference-draft";
```

- [ ] **Step 5: Render read-only action row**

In the read-only `detail-heading`, add:

```tsx
<div className="detail-actions">
  <a href={selectedReference.source_url} target="_blank" rel="noreferrer">
    Open source
  </a>
  <button type="button" className="ghost-button" onClick={() => startEditing(selectedReference)}>
    Edit
  </button>
</div>
```

Remove the old standalone source link from the heading.

- [ ] **Step 6: Render edit form when `isEditingSelected` is true**

Replace the read-only detail body with a conditional:

```tsx
{isEditingSelected && editDraft ? (
  <form className="detail-edit-form" onSubmit={saveReferenceEdit}>
    <section>
      <h3>Source</h3>
      <label>
        Title
        <input required value={editDraft.title} onChange={(event) => setEditDraft({ ...editDraft, title: event.target.value })} />
      </label>
      <label>
        Source URL
        <input required value={editDraft.source_url} onChange={(event) => setEditDraft({ ...editDraft, source_url: event.target.value })} />
      </label>
      <label>
        Canonical URL
        <input value={editDraft.canonical_url} onChange={(event) => setEditDraft({ ...editDraft, canonical_url: event.target.value })} />
      </label>
      <label>
        Site
        <input value={editDraft.site_name} onChange={(event) => setEditDraft({ ...editDraft, site_name: event.target.value })} />
      </label>
      <label>
        Author
        <input value={editDraft.author} onChange={(event) => setEditDraft({ ...editDraft, author: event.target.value })} />
      </label>
    </section>

    <section>
      <h3>Classification and safety</h3>
      <label>
        Media type
        <select value={editDraft.media_type} onChange={(event) => setEditDraft({ ...editDraft, media_type: event.target.value as MediaType })}>
          {MEDIA_TYPES.map((type) => <option key={type} value={type}>{statusLabel(type)}</option>)}
        </select>
      </label>
      <label>
        Asset category
        <select value={editDraft.asset_category} onChange={(event) => setEditDraft({ ...editDraft, asset_category: event.target.value as AssetCategory })}>
          {ASSET_CATEGORIES.map((category) => <option key={category} value={category}>{categoryLabels[category]}</option>)}
        </select>
      </label>
      <label>
        License status
        <select value={editDraft.license_status} onChange={(event) => setEditDraft({ ...editDraft, license_status: event.target.value as LicenseStatus })}>
          {LICENSE_STATUSES.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
        </select>
      </label>
      <label>
        Public status
        <select value={editDraft.public_status} onChange={(event) => setEditDraft({ ...editDraft, public_status: event.target.value as PublicStatus })}>
          {PUBLIC_STATUSES.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
        </select>
      </label>
      <label>
        Avoid copying
        <textarea value={editDraft.avoid_copying_notes} onChange={(event) => setEditDraft({ ...editDraft, avoid_copying_notes: event.target.value })} />
      </label>
    </section>

    <section>
      <h3>Inspiration</h3>
      <label>
        Style tags
        <input value={editDraft.style_tags_text} onChange={(event) => setEditDraft({ ...editDraft, style_tags_text: event.target.value })} />
      </label>
      <label>
        Use tags
        <input value={editDraft.use_tags_text} onChange={(event) => setEditDraft({ ...editDraft, use_tags_text: event.target.value })} />
      </label>
      <label>
        Inspiration points
        <textarea value={editDraft.inspiration_points_text} onChange={(event) => setEditDraft({ ...editDraft, inspiration_points_text: event.target.value })} />
      </label>
      <label>
        Deconstruction notes
        <textarea value={editDraft.deconstruction_notes} onChange={(event) => setEditDraft({ ...editDraft, deconstruction_notes: event.target.value })} />
      </label>
      <label>
        Transformation ideas
        <textarea value={editDraft.transformation_ideas} onChange={(event) => setEditDraft({ ...editDraft, transformation_ideas: event.target.value })} />
      </label>
      <label>
        Related original asset
        <input value={editDraft.related_original_asset} onChange={(event) => setEditDraft({ ...editDraft, related_original_asset: event.target.value })} />
      </label>
    </section>

    <div className="detail-actions sticky-actions">
      <button type="submit" disabled={isSavingEdit}>
        {isSavingEdit ? "Saving..." : "Save changes"}
      </button>
      <button type="button" className="ghost-button" onClick={cancelEditing}>
        Cancel
      </button>
    </div>
  </form>
) : (
  <>
    {/* existing read-only Source, Safety, Inspiration sections and Delete button */}
  </>
)}
```

Keep the existing read-only sections inside the `else` branch.

- [ ] **Step 7: Add edit form CSS**

Append to `app/globals.css` near detail styles:

```css
.detail-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.detail-actions a,
.detail-actions button {
  flex: 1 1 auto;
}

.detail-edit-form {
  display: grid;
  gap: 18px;
}

.detail-edit-form section {
  border-top: 1px solid var(--border);
  padding-top: 16px;
}

.detail-edit-form label {
  margin-top: 10px;
}

.sticky-actions {
  position: sticky;
  bottom: 0;
  border-top: 1px solid var(--border);
  background: #14171a;
  padding-top: 12px;
}
```

- [ ] **Step 8: Run focused and full validation**

Run:

```powershell
npm test
npm run typecheck
npm run lint
npm run build
```

Expected: all PASS.

- [ ] **Step 9: Commit Task 3**

Run:

```powershell
git add app/page.tsx app/globals.css tests/ui-state.test.ts
git commit -m "feat: 增加详情面板编辑 / add detail panel editing"
```

---

### Task 4: Manual QA, Progress Trace, and Branch Closeout

**Files:**
- Modify: `docs/progress/2026-06-17.md`
- Modify: `docs/progress/status.md`
- Modify: `docs/progress/timeline.md`
- Optional modify: `docs/qa/2026-06-17-reference-editing-experience.md`

- [ ] **Step 1: Run local app**

Run:

```powershell
npm run dev
```

Expected: local vinext dev server starts and prints a localhost URL.

- [ ] **Step 2: Manual browser QA**

In the browser, verify:

- Add-reference flow still opens.
- Metadata preview still fills source fields.
- A saved reference can be selected.
- `Edit` appears in the detail panel.
- Editing title and tags then saving updates the card and detail panel.
- Refresh preserves edits for D1-backed records.
- Invalid source URL on edit shows validation failure and keeps draft values.
- Cancel discards unsaved changes.
- Selecting another card while editing closes edit mode.
- Delete remains available in read-only mode.
- Desktop layout has no obvious overlap.
- Mobile layout has no horizontal scroll.

- [ ] **Step 3: Add QA note if useful**

If browser QA reveals notable manual results, create `docs/qa/2026-06-17-reference-editing-experience.md`:

```md
# Reference Editing Experience QA

Date: 2026-06-17
Branch: `codex/round-3-editing-experience`

## Automated Validation

- `npm test`: passed
- `npm run typecheck`: passed
- `npm run lint`: passed
- `npm run build`: passed

## Manual Local Validation

- Add-reference flow:
- Metadata preview:
- Detail-panel edit:
- Save persistence:
- Cancel behavior:
- Validation failure draft preservation:
- Selection-change behavior:
- Desktop layout:
- Mobile layout:

## Issues Found

- None recorded.
```

- [ ] **Step 4: Update progress docs**

Update `docs/progress/2026-06-17.md`, `docs/progress/status.md`, and `docs/progress/timeline.md` with:

- What was implemented.
- Why it was implemented.
- Files changed.
- Automated validation result.
- Manual QA result.
- Risk/open items.
- Next step: deploy Sites version and production edit validation, or merge if production deployment is not part of this branch.

- [ ] **Step 5: Final verification before claiming completion**

Run:

```powershell
git status --short --branch
npm test
npm run typecheck
npm run lint
npm run build
```

Expected:

- Git status only shows intended progress/QA docs before final commit.
- All validation commands pass.

- [ ] **Step 6: Commit Task 4**

Run:

```powershell
git add docs/progress/2026-06-17.md docs/progress/status.md docs/progress/timeline.md docs/qa/2026-06-17-reference-editing-experience.md
git commit -m "docs: 记录第三轮编辑体验验证 / record round 3 editing validation"
```

- [ ] **Step 7: Branch closeout**

If all validation passes:

```powershell
git switch main
git merge --no-ff codex/round-3-editing-experience -m "merge: 合并第三轮编辑体验 / merge round 3 editing experience"
git push origin main
```

If GitHub connectivity or default-branch settings block push/cleanup, record the blocker in `docs/progress/2026-06-17.md` and report the exact retry command.

---

## Self-Review

- Spec coverage: the plan covers inline detail-panel editing, shared draft helpers, save/cancel feedback, failed-save draft preservation, selection-change behavior, and required progress trace updates.
- Placeholder scan: no unresolved markers or unspecified implementation steps remain.
- Type consistency: the plan uses existing `ReferenceInput`, `ReferenceRecord`, `MediaType`, `AssetCategory`, `LicenseStatus`, and `PublicStatus` names from `lib/reference.ts`.
