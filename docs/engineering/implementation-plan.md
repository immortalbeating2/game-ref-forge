# Implementation Plan

This is the first implementation path after the documentation baseline is accepted.

## Phase 0: Project Setup

- Confirm the repository is `game-ref-forge`.
- Keep `origin` pointed at `https://github.com/immortalbeating2/game-ref-forge.git`.
- Scaffold the Sites-compatible vinext/React starter.
- Add `.openai/hosting.json` with D1 binding `DB`.
- Add package scripts for build, dev, test, and type checking.

## Phase 1: Data Foundation

- Create the D1 migration for the `references` table.
- Implement enum constants and shared validation helpers.
- Implement a small data access layer for reference CRUD.
- Add seed data covering all eight asset categories.

Acceptance checks:

- Migration can be applied locally.
- Seed data can be read through the data access layer.
- JSON text fields round-trip as arrays.

## Phase 2: API Routes

- Implement `GET /api/references`.
- Implement `POST /api/references`.
- Implement `PUT /api/references/:id`.
- Implement `DELETE /api/references/:id`.
- Implement `POST /api/metadata/preview`.

Acceptance checks:

- CRUD works for a valid reference.
- Invalid URLs are rejected.
- Missing required fields are rejected.
- Metadata preview failure returns a usable warning response instead of blocking save.

## Phase 3: Main Workspace UI

- Build the three-column research desk layout.
- Add left-side filters for asset category, license status, and public status.
- Add center gallery with thumbnail handling and search.
- Add right detail panel for selected record.
- Add empty state and broken-preview placeholder.

Acceptance checks:

- First screen is the working app.
- Desktop layout does not overlap.
- Mobile layout remains usable.
- Filters and search update the visible gallery.

## Phase 4: Add And Edit Flow

- Build add-reference action.
- Add metadata preview button.
- Add manual metadata editing.
- Add classification, tag, and license/public-safety controls.
- Add inspiration extraction fields.
- Preserve form state on save failure.

Acceptance checks:

- A user can save a reference without successful metadata preview.
- New references default to private-safe statuses.
- Edit updates the selected card and detail panel.
- Delete requires confirmation.

## Phase 5: Validation And Product Trial

- Add 20-30 sample references across asset categories.
- Confirm taxonomy helps retrieve saved references.
- Confirm extraction fields produce original-asset ideas.
- Confirm public-safety filters separate private, review, and public-safe items.
- Run build and browser QA before saving a Sites version.

## Deferred

- Public route.
- File upload.
- R2 asset hosting.
- Bulk crawling.
- Source-specific parsers.
- Original asset records.
- Team collaboration.

