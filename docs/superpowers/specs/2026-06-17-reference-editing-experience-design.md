# Reference Editing Experience Design

Date: 2026-06-17

## Goal

Add a focused edit workflow for an existing reference from the right detail panel, so RefForge users can correct source, safety, classification, and inspiration fields without deleting and recreating a record.

This round is a workflow-completion pass for the current private research desk. It should preserve the existing three-pane layout and avoid product expansion.

## Current Baseline

Current implemented surface:

- Three-pane research desk UI in `app/page.tsx`.
- Add-reference form in the center gallery pane.
- Right detail panel with read-only source, safety, inspiration, source link, and delete action.
- `GET /api/references`.
- `POST /api/references`.
- `PUT /api/references/:id`.
- `DELETE /api/references/:id`.
- Shared reference validation and record shaping in `lib/reference.ts`.
- UI state regression tests in `tests/ui-state.test.ts`.

Current gap:

- Existing references can be selected, reviewed, opened, and deleted.
- Existing references cannot be edited from the UI.
- Correcting a typo, license status, public status, tag, or inspiration note currently requires deleting and recreating the record.

## Approved Direction

Use inline detail-panel editing.

The detail panel stays read-only by default. When the user selects `Edit`, the same panel switches into a compact edit form for the selected reference. `Save` updates the record and returns to read-only mode. `Cancel` discards unsaved edits and returns to read-only mode.

The add-reference form remains in the center pane and keeps its existing role. The edit workflow should not reuse the center add form because that would move the user's visual focus away from the selected reference.

## Success Definition

Third round passes when a user can complete this loop locally and, after deployment, in production:

1. Select a saved reference.
2. Click `Edit` in the detail panel.
3. Change title, source fields, safety fields, tags, and notes.
4. Save the edit.
5. See success feedback.
6. See the updated card and updated detail panel without a page refresh.
7. Refresh the page and confirm the edited fields persist.
8. Trigger a validation or network/API failure and confirm the edit form preserves unsaved changes.
9. Cancel an edit and confirm the original record remains unchanged.

## Scope

### Detail Panel Edit Mode

Add edit mode to the selected reference detail panel:

- `Edit` button appears in read-only mode.
- `Save` and `Cancel` appear in edit mode.
- Delete remains available only in read-only mode to reduce accidental destructive action while editing.
- Source link remains available in read-only mode.
- Edit mode should be compact enough for the existing right panel.

Editable fields:

- `title`
- `source_url`
- `canonical_url`
- `site_name`
- `author`
- `media_type`
- `asset_category`
- `license_status`
- `public_status`
- `style_tags`
- `use_tags`
- `inspiration_points`
- `deconstruction_notes`
- `transformation_ideas`
- `avoid_copying_notes`
- `related_original_asset`

Fields that may remain internal or unchanged:

- `id`
- `created_at`
- `updated_at`

### Draft Conversion

Extract shared draft helpers so add and edit flows use the same conversions:

- Reference input to draft.
- Reference record to draft.
- Draft to `ReferenceInput`.
- Comma-separated text to arrays.
- Arrays to comma-separated text.
- Dirty-state comparison for edit mode.

The helpers should live outside `app/page.tsx` so they can be tested without rendering the whole page.

### Save Feedback

The UI should show clear feedback for:

- Edit mode entered.
- No changes to save.
- Saving in progress.
- Save succeeded.
- Save failed and draft was preserved.
- Cancel discarded unsaved changes.

Existing global message styling can be reused. The message text should be specific enough for manual QA.

### API Use

Use the existing `PUT /api/references/:id` route if it already supports full updates.

Expected request:

```text
PUT /api/references/:id
Content-Type: application/json

ReferenceInput
```

Expected response:

```text
200 OK
{ "reference": ReferenceRecord }
```

If the route lacks coverage for update behavior, add tests before modifying implementation.

## Out Of Scope

Do not add in this round:

- Batch edit.
- Inline editing directly on reference cards.
- Modal editor.
- Rich tag chips or autocomplete.
- New database columns.
- Public publishing workflow.
- Media upload, image hosting, or R2.
- User permissions.
- Full visual redesign.
- Source-specific metadata adapters.

## Interaction Details

### Read-Only Detail Panel

Read-only mode should keep the current information architecture:

- Heading and source link.
- Source section.
- Safety section.
- Inspiration section.
- Delete action.

Add an `Edit` action near the heading so it is discoverable but not confused with delete.

### Edit Detail Panel

Edit mode should show:

- A clear heading such as `Edit reference`.
- Required fields marked through native `required` behavior where practical.
- Select controls for enumerated fields.
- Text inputs for source/title/author fields.
- Textareas for inspiration and safety notes.
- `Save changes` primary action.
- `Cancel` secondary action.

For long field groups, visual grouping should favor scanability:

- Source fields.
- Classification and safety fields.
- Tags and inspiration fields.

### Selection Changes

If the user selects a different card while edit mode is open, the app should close edit mode and show the newly selected reference in read-only mode.

This avoids preserving an edit draft for a record the user is no longer viewing.

### Seed References

Seed references can enter edit mode for UI validation, but saving a seed reference should not pretend to persist to production D1.

Preferred behavior:

- If editing a seed reference, save should create or update local UI state only if the existing API path cannot persist seed IDs.
- The user-facing copy should not claim production persistence for seed-only examples.

For persisted production records, save must use the API.

## Data Flow

### Enter Edit Mode

```text
Selected ReferenceRecord
  -> recordToDraft(reference)
  -> edit draft state
  -> detail panel edit form
```

### Save Edit

```text
Edit draft
  -> draftToReferenceInput(draft)
  -> PUT /api/references/:id
  -> D1 references table
  -> response ReferenceRecord
  -> replace matching item in references state
  -> selectedId remains the updated record id
  -> detail panel returns to read-only mode
```

### Save Failure

```text
Edit draft
  -> PUT /api/references/:id
  -> route returns validation or server error
  -> UI shows failure message
  -> edit mode remains open
  -> draft values are preserved
```

### Cancel Edit

```text
Edit draft
  -> Cancel
  -> discard draft
  -> read-only detail panel shows unchanged selected ReferenceRecord
```

## Error Handling

Use existing API error payloads where possible:

- Validation errors should surface as readable message text.
- Unknown save failures should show a fallback message.
- Save button should be disabled while saving.
- Cancel should remain available unless it creates inconsistent state.

The app should not clear the draft on failed save.

## Testing Plan

Automated checks:

- Unit tests for draft conversion helpers.
- Unit tests for dirty-state behavior.
- API/update tests if current PUT coverage is incomplete.
- UI-state tests for selection-change behavior if helper logic is extracted.
- Existing full validation:
  - `npm test`
  - `npm run typecheck`
  - `npm run lint`
  - `npm run build`

Manual local checks:

- Select a persisted reference.
- Enter edit mode.
- Save a changed title.
- Save changed tags and inspiration points.
- Cancel a changed draft.
- Attempt invalid source URL and confirm the draft remains.
- Select another card during edit and confirm edit mode closes.
- Check desktop layout.
- Check mobile layout for no horizontal overflow or overlapping controls.

Production checks after deployment:

- Edit a real production record.
- Refresh and confirm persistence.
- Cancel an edit and confirm no change.
- Trigger a validation failure and confirm draft preservation.

## Acceptance Checklist

- Detail panel has an `Edit` action for selected references.
- Edit mode appears in the right detail panel.
- Save updates D1-backed references through the existing API.
- Save updates the visible card and detail panel without refresh.
- Refresh loads edited production data.
- Cancel discards unsaved changes.
- Failed save preserves draft values.
- No-change save gives clear feedback.
- Selection changes close edit mode cleanly.
- Delete remains available in read-only mode.
- Add-reference flow still works.
- Metadata preview flow still works.
- Search and filters still work.
- Desktop layout remains usable.
- Mobile layout remains usable without horizontal scrolling.
- Three progress trace documents are updated.

## Follow-Up After This Round

Likely next work after third round:

- Better tag editing with chips or quick-add controls.
- Stronger source/license review workflow.
- Source-specific metadata extraction improvements.
- Production regression automation using authenticated browser control when available.
