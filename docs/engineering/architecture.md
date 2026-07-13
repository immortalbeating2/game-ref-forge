# Architecture

## Target Stack

RefForge uses the Codex App Sites workflow with a Sites-compatible vinext/React application:

- React frontend for the private research desk.
- Cloudflare Worker-compatible API routes in the same app.
- D1 binding named `DB` for structured persistence.
- Drizzle schema and a small data access layer between API handlers and D1.
- No R2 binding in v1; RefForge does not upload, host, or download third-party media.

## Product Surface

The app itself is the first screen. The reference view retains the existing research desk with filters, search, reference cards, and detail editing. Round 11 adds a top-level `参考 / 综合稿` view switch:

- Reference view owns the existing collection, classification, quality, and single-reference editing workflow.
- Temporary comparison selection is entered from the reference view and supports 2-4 real persisted references across filter changes.
- Synthesis view owns the synthesis list, status filter, recent-update ordering, detail editor, snapshot cards, save, archive, delete, and single-item Markdown export.
- The synthesis workspace is a full-width editing area within the existing single-page application; Round 11 adds no public route or shareable deep link.

Seed examples remain presentation-only. They may be viewed in the reference UI but cannot enter persisted comparison mode or be submitted to the synthesis API.

## Runtime Boundaries

### Frontend and UI modules

- `app/page.tsx`: coordinates the top-level reference/synthesis view, existing reference state, comparison selection handoff, and back navigation.
- `app/synthesis/synthesis-workspace.tsx`: coordinates synthesis list loading, detail loading, create/edit mode, dirty state, save, archive, delete, refresh, export, navigation confirmation, and request ownership.
- `app/synthesis/synthesis-list.tsx`: renders status-filtered synthesis summaries and list actions.
- `app/synthesis/synthesis-editor.tsx`: renders the structured synthesis fields, status, completeness prompts, and save/export actions.
- `app/synthesis/synthesis-reference-card.tsx`: renders ordered snapshot content, stale/unavailable state, and explicit refresh.
- `app/synthesis/synthesis-workspace-state.ts`: contains focused state transition and mutation-ownership helpers used to prevent stale responses, duplicate submissions, and draft loss.

### Domain and pure helpers

- `lib/synthesis.ts`: synthesis types, status values, input validation, v1 snapshot creation/parsing, stale derivation, and malformed-snapshot fallback.
- `lib/synthesis-draft.ts`: conversion between persisted details and editable drafts, including dirty-state comparison.
- `lib/synthesis-selection.ts`: temporary reference selection and 2-4 bound logic.
- `lib/synthesis-export.ts`: pure single-Markdown generation and safe filename generation; it never embeds preview media.
- `lib/reference-db.ts`: existing reference row conversion, including `referenceRowToRecord`, reused by snapshot creation.

### Data access

`lib/synthesis-db.ts` owns all D1 queries for syntheses and relations:

- list summaries with status filtering and recent ordering;
- load a synthesis with ordered relations, live source joins, and derived `available`/`stale` state;
- atomically create a synthesis, its 2-4 ordered relations, and server-generated snapshots;
- update synthesis fields/status without accepting relation changes;
- atomically refresh one relation snapshot and the synthesis timestamp;
- delete the synthesis and rely on foreign-key cascade for relation cleanup.

The data layer keeps SQL and Drizzle storage details out of React components and API handlers.

## API Routes

Existing reference routes remain:

- `GET /api/references`
- `POST /api/references`
- `PUT /api/references/:id`
- `DELETE /api/references/:id`
- `POST /api/metadata/preview`

Round 11 adds:

- `GET /api/syntheses?status=<draft|actionable|archived>&sort=recent`: returns summaries with reference count. Both parameters are validated; only `sort=recent` is supported.
- `POST /api/syntheses`: accepts synthesis fields and ordered `reference_ids`; validates fields, 2-4 unique live references, then reads each reference on the server to create v1 snapshots. Client snapshot data is ignored because it is not accepted by the data-layer contract.
- `GET /api/syntheses/:id`: returns the full synthesis and ordered relations, including derived availability and staleness.
- `PATCH /api/syntheses/:id`: updates synthesis fields and status only. It cannot add, replace, remove, or reorder saved relations.
- `DELETE /api/syntheses/:id`: deletes the synthesis; D1 cascades relation rows.
- `POST /api/syntheses/:id/references/:relationId/refresh`: verifies relation ownership and source availability, then atomically refreshes one server-generated snapshot.

Routes parse JSON, map validation/not-found/unavailable/migration failures to the existing JSON error style, and preserve owner-only authentication inherited from the Sites runtime. The synthesis routes do not expose public media or a public download endpoint.

## Snapshot Trust and Lifecycle

Snapshots are historical source metadata, not client state. On create and refresh, the server obtains the current D1 reference row and serializes the closed v1 shape. On read, the server joins the current reference when available and derives:

- `available = false` when the foreign key was set to `NULL` after source deletion;
- `stale = true` only when the current reference `updated_at` is later than the snapshot's source timestamp.

No automatic synchronization occurs. A user must explicitly refresh a stale live source. If a source is deleted, its old snapshot remains visible and refresh is rejected. The UI shows an application-owned confirmation for destructive actions and an unsaved-changes confirmation before internal navigation; `beforeunload` protects browser close/reload.

## Persistence and Migration

`drizzle/0002_multi_reference_synthesis.sql` is an additive D1 migration. It creates `syntheses`, `synthesis_references`, the status/update indexes, the relation lookup index, and the order/reference uniqueness indexes. It preserves the existing `references` table and data. The Sites deployment flow must apply this migration before serving an application that expects the new tables; Task 8 records only local migration evidence, not a remote deployment.

## Export and Source Safety

The synthesis exporter produces one `.md` file containing the current form state, status, target asset, ordered source links, all structured synthesis fields, availability/stale labels, and export time. Dirty drafts include an explicit unsaved marker. It never copies preview media, changes the all-reference JSON export, or turns `fair use` into a public-safety decision. The only remaining Round 11 export evidence gap is that the in-app browser did not capture the programmatic Blob download event; content, filename, source-link, and media-exclusion behavior are covered by automated tests and should be rechecked in Task 9 production QA.

## Failure Behavior

- Missing synthesis tables return a migration-required error rather than an opaque database failure.
- Validation failures preserve the editable draft and return field errors.
- Create and refresh use D1 batch writes so a partial synthesis/relation or partial snapshot refresh is not intentionally committed.
- A refresh failure leaves the previous snapshot unchanged.
- Malformed stored snapshot JSON falls back to a stable unavailable placeholder.
- Duplicate mutation attempts and stale asynchronous responses are ignored by workspace state guards.
- Empty synthesis lists and empty reference stores show bilingual, actionable UI states without persisting seed records.
- Layout checks cover desktop/1024px and 390px; sticky save and selection action bars retain stable controls without page-level horizontal overflow.
