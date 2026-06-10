# Live Usability Validation Design

Date: 2026-06-10

## Goal

Validate that the deployed RefForge v1 can support a real minimum workflow on production: create references, preview metadata, persist data through refresh, delete test records, and keep the primary interface interactions usable and visually acceptable.

This round is a validation-and-hardening pass, not a feature expansion pass.

## Current Baseline

Production URL:

```text
https://game-ref-forge.yeep-6613.chatgpt-team.site
```

Current implemented surface:

- Sites vinext/React app.
- D1 binding `DB`.
- `references` table migration.
- `GET /api/references`.
- `POST /api/references`.
- `PUT /api/references/:id`.
- `DELETE /api/references/:id`.
- `POST /api/metadata/preview`.
- Three-pane research desk UI.
- Add-reference form.
- Metadata preview button.
- Search and filters.
- Reference card selection.
- Detail panel.
- Delete action.
- Seed fallback when D1 is empty or unavailable.

## Success Definition

Second round passes when production can complete this loop:

1. Add 1-3 real references on the deployed site.
2. Refresh the page and confirm the saved references remain visible.
3. Run metadata preview for at least one source that succeeds.
4. Run metadata preview for at least one source that fails or is blocked, and confirm the app gives usable feedback.
5. Delete one test reference.
6. Refresh the page and confirm the deleted reference does not reappear.
7. Check major interface interactions and confirm none are broken.
8. Check desktop and mobile layouts and confirm no obvious overlap, clipping, or unusable controls.

## Scope

### Production Data Validation

Use production, not only local dev, for the main validation.

Validate:

- D1 migration is applied by Sites.
- `GET /api/references` returns production data.
- `POST /api/references` saves a valid record.
- Page refresh loads the saved record from production D1.
- `DELETE /api/references/:id` removes a record.
- Deleted records do not reappear after refresh.

### Metadata Preview Validation

Validate two metadata preview paths:

- Success path: a source URL with readable title/site/canonical/preview metadata.
- Failure path: an invalid URL, blocked site, unsupported scheme, or site without usable metadata.

Expected behavior:

- Successful preview fills useful source fields when metadata exists.
- Failed preview shows a clear warning.
- Failed preview does not clear manually entered form data.
- Failed preview does not block saving a reference manually.

### Interaction QA

Validate the primary interface:

- Open production page.
- Search by title/source/tag.
- Filter by asset category.
- Filter by license status.
- Filter by public status.
- Clear filters.
- Select a reference card.
- Review right detail panel.
- Open source link.
- Open and close add-reference form.
- Save with missing required data and confirm useful validation feedback.
- Save with manual fields when preview fails.
- Delete with confirmation.

### Layout QA

Check general usability and appearance:

- Desktop three-pane layout is readable.
- Cards do not resize unpredictably.
- Long titles do not break the card.
- Status badges remain visible.
- Detail panel content does not overlap.
- Add-reference form remains scannable.
- Mobile layout is usable without horizontal scrolling.
- Buttons and inputs remain tappable on mobile.
- Text does not overflow controls.

This pass should fix issues that block normal use or make the app visibly rough. It should not attempt a full visual redesign.

## Out Of Scope

Do not add in this round:

- Public browsing route.
- R2 upload or hosted asset files.
- Bulk import or crawling.
- Source-specific adapters for many sites.
- Team collaboration.
- User accounts beyond the existing Sites environment.
- Original asset management table.
- Complex taxonomy redesign.
- Large visual redesign.
- Full edit workflow expansion unless validation shows current behavior is broken.

## Candidate Test References

Use safe, source-clear examples:

- Kenney asset page for game-ready packs or UI/audio examples.
- Poly Haven texture or model page.
- OpenGameArt entry with visible license information.

Use at least one intentionally imperfect source for metadata failure or weak metadata:

- Invalid URL string.
- A valid site that blocks metadata fetch.
- A source page without Open Graph metadata.

All test records should be clearly named so they can be safely deleted after validation, for example:

```text
QA Test - Kenney UI Pack
QA Test - Metadata Failure
QA Test - Poly Haven Texture
```

## Data Flow

### Add Reference

```text
UI form
  -> POST /api/metadata/preview, optional
  -> user reviews source and safety fields
  -> POST /api/references
  -> D1 references table
  -> UI prepends saved reference
  -> refresh
  -> GET /api/references
  -> saved reference appears
```

### Delete Reference

```text
UI delete confirmation
  -> DELETE /api/references/:id
  -> D1 references table
  -> UI removes record
  -> refresh
  -> GET /api/references
  -> deleted record remains absent
```

### Metadata Preview Failure

```text
UI source URL
  -> POST /api/metadata/preview
  -> route returns error
  -> UI shows warning
  -> form content remains editable
  -> manual save remains possible
```

## Expected Fix Areas

During validation, likely issues should be fixed in the smallest responsible area:

- API or D1 errors: fix route handlers or `lib/reference-db.ts`.
- Metadata parsing issues: fix `lib/metadata.ts` and tests.
- Form state loss: fix `app/page.tsx`.
- Layout overlap or mobile issues: fix `app/globals.css`.
- Ambiguous user feedback: fix copy/state handling in `app/page.tsx`.

Avoid broad refactors unless they are necessary to make the validation loop reliable.

## Testing Plan

Automated checks:

- `npm test`
- `npm run typecheck`
- `npm run lint`
- `npm run build`

Manual production checks:

- Add 1-3 real references.
- Refresh and confirm persistence.
- Preview one successful metadata source.
- Preview one failing metadata source.
- Save one record after preview failure using manual fields.
- Delete one record.
- Refresh and confirm deletion.
- Check search, filters, card selection, detail panel, open source, form behavior, and delete confirmation.
- Check desktop and mobile viewport layout.

## Acceptance Checklist

- Production D1 save works.
- Production D1 reload works.
- Production delete works.
- Metadata preview success path is understandable.
- Metadata preview failure path is understandable and non-blocking.
- Form data is not lost after preview failure or save failure.
- Search works.
- Asset category filter works.
- License status filter works.
- Public status filter works.
- Clear filters works.
- Reference card selection updates detail panel.
- Source links open.
- Delete confirmation protects against accidental deletion.
- Desktop layout has no obvious overlap or unusable controls.
- Mobile layout has no horizontal scrolling or unusable controls.
- Any fixed issues are covered by automated tests where practical.
- Three progress trace documents are updated.

## Follow-Up After This Round

If this round passes, the next likely development focus is one of:

- Complete edit flow.
- Improve source-specific metadata extraction.
- Add better seed/reference sample management.
- Add public-safety review workflow.
- Add visual polish after real usage confirms the workflow shape.

