# Architecture

## Target Stack

The first implementation should use the Codex App Sites workflow with a Sites-compatible vinext/React app.

Target components:

- React frontend for the research desk UI.
- Cloudflare Worker-compatible backend routes in the same app.
- D1 binding named `DB` for structured persistence.
- A small data access layer between API handlers and D1.
- No R2 binding in v1 because uploads and hosted asset files are out of scope.

## Product Surface

The first screen is the app itself:

- Left sidebar: asset type filters, public-safety filters, source groups.
- Center: searchable visual reference gallery.
- Right detail panel: selected reference with source, license, classification, and extraction fields.

Do not build a marketing landing page for v1.

## Runtime Boundaries

Frontend responsibilities:

- Render the reference gallery.
- Manage filter/search UI state.
- Render add/edit forms.
- Render metadata preview results.
- Preserve form data when save fails.

API responsibilities:

- Validate request payloads.
- Read and write references.
- Run metadata preview.
- Normalize timestamps.
- Return consistent error responses.

Data layer responsibilities:

- Own D1 SQL queries.
- Convert JSON text fields to arrays/objects.
- Keep storage details out of UI components.
- Make future migration to SQLite/Postgres easier.

## API Routes

Required v1 routes:

- `GET /api/references`
- `POST /api/references`
- `PUT /api/references/:id`
- `DELETE /api/references/:id`
- `POST /api/metadata/preview`

## Storage Approach

Use one `references` table in v1.

Reasoning:

- The taxonomy is still evolving.
- JSON text fields keep tags and note lists flexible.
- A separate `original_assets` table would add structure before the workflow is proven.

Future versions can add:

- Source adapters.
- Original asset records.
- Collections or boards.
- Public-safe route and review workflow.
- Optional file storage if ownership/license makes hosting safe.

## Failure Behavior

- Metadata preview failure must not block manual save.
- Unknown license defaults to private handling.
- Broken preview images should fall back to a neutral placeholder.
- Save failure should preserve unsaved form input.
- Delete requires confirmation.
- Empty database should show starter examples or a clear add-reference state.

