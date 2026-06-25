# Round 8 Research Workflow Efficiency Design

## Goal

Improve RefForge's day-to-day research workflow after the Round 7 workspace redesign, so high-value references are easier to find, prioritize, edit, and export into downstream game art/design notes.

Round 8 focuses on personal productivity, not public publishing or production QA infrastructure.

## Context

Round 7 made the workspace clearer and more structured:

- Left panel: research controls.
- Center panel: dense reference card deck.
- Right panel: `灵感提炼` detail surface.
- Records already include scores, quality status, tags, and structured inspiration entries.

The next bottleneck is not visual identity. It is repeated use:

- Finding the strongest references quickly.
- Keeping important references visible.
- Sorting by scores and risk.
- Exporting reference thinking into a usable note.
- Editing structured inspiration entries without unnecessary friction.

## Scope

In scope:

- Sorting controls for the center reference deck.
- A local product concept of "priority" through pinned references.
- A selected-reference Markdown export.
- A full-library JSON export.
- Faster add/remove flow for structured inspiration entries.
- Tests for sorting, pinning, export formatting, and helper behavior.
- Chinese-first UI copy with English equivalents.

Out of scope:

- File upload.
- Media hosting.
- Public sharing.
- Team collaboration.
- New authentication.
- Production E2E token infrastructure.
- D1 migration unless implementation discovers persistence cannot be achieved cleanly without one.

## Product Decisions

### Sorting

The deck should support sorting by:

- Recently updated.
- Reference value score.
- Transformability score.
- Copyright risk score.
- Production readiness score.
- Title.

Default sort:

- Pinned references first.
- Then recently updated.

Score sort rules:

- Higher value is better for reference value, transformability, and production readiness.
- Lower value is better for copyright risk.
- Missing scores sort after scored references.

### Pinned References

Pinned references are a lightweight priority marker.

Round 8 should avoid schema changes if possible:

- Persist pinned ids in browser storage as a personal workspace preference.
- Store by reference id.
- Apply to both seeded references and saved D1 records.
- Treat pinning as device-local, not authoritative product data.

This matches the product need: personal prioritization for the current researcher.

If later the project needs cross-device persistence, a future round can promote pinned state into D1.

### Export

Round 8 should provide two exports:

1. Selected reference Markdown.
2. Full library JSON.

Markdown export should include:

- Title.
- Source URL.
- Site and author.
- License, public status, and avoid-copying notes.
- Scores.
- Tags.
- Inspiration points.
- Structured inspiration entries.
- Deconstruction notes.
- Transformation ideas.
- Related original asset.

JSON export should include:

- The current filtered/sorted visible references or the full loaded library.
- For Round 8, default to full loaded library to avoid surprising partial exports.
- Seed records may be included if the user has no saved records, with a clear filename prefix.

Export mechanics:

- Use browser-generated downloads.
- Do not add a server endpoint for export in this round.
- Export should not mutate production data.

### Structured Inspiration Editing

The current add/edit form already supports multiple structured inspiration entries. Round 8 should make it more ergonomic:

- Keep the existing field names.
- Add a compact entry count.
- Make "add entry" available near the entry list.
- Keep remove buttons per entry.
- Preserve at least one editable blank entry when the list is empty.

Do not add AI generation or automatic rewriting in this round.

## User Experience

### Reference Deck Toolbar

The toolbar should include:

- Search.
- Sort control.
- Add reference.
- Export all JSON.

Pinned-first behavior should be visible in the sort summary or deck copy.

### Reference Card

Cards should show pin state with a compact control:

- A pin/star-like text or icon button.
- It must be keyboard accessible.
- It must not resize the card.
- It should not hide safety badges.

Pin toggle should not open the detail panel unless the card itself is selected separately.

### Detail Panel

When a reference is selected, actions should include:

- Edit.
- Open source.
- Export Markdown.
- Delete reference.

Export Markdown should be secondary to edit/open-source. It should not look destructive or primary.

### Empty States

When there are no records:

- JSON export should be disabled or export seed examples only with clear messaging.
- Markdown export should require a selected reference.

When filters hide all records:

- JSON export still exports the loaded library, not the empty filtered result.
- The UI copy should avoid ambiguity.

## Data And State

### Local State

New local UI state:

- `sortMode`
- `pinnedReferenceIds`

Recommended sort mode values:

- `updated_desc`
- `reference_value_desc`
- `transformability_desc`
- `copyright_risk_asc`
- `production_readiness_desc`
- `title_asc`

Recommended local storage key:

- `ref-forge:pinned-reference-ids`

### Helper Boundaries

Round 8 should avoid further bloating `app/page.tsx`.

Create focused helpers:

- `lib/reference-sort.ts`
  - Sort mode constants.
  - Sort labels if not handled in localization.
  - Sorting function.
  - Pinned-first composition.

- `lib/reference-export.ts`
  - Markdown formatting.
  - JSON export payload creation.
  - Safe filename helpers.

- `lib/pinned-references.ts`
  - Parse and serialize pinned id lists.
  - Toggle pinned ids.

These helpers should be covered by unit tests.

## Localization

Chinese-first UI copy should cover:

- Sort label.
- Sort mode labels.
- Pinned / unpinned.
- Export Markdown.
- Export JSON.
- Export unavailable copy.
- Inspiration entry count.

English equivalents must exist for the language switch.

## Error Handling

- Local storage parse failure should fall back to no pinned references.
- Export should fail gracefully if there is no selected reference.
- Browser download creation should clean up object URLs.
- Missing optional fields should render as `-` or be omitted cleanly in Markdown.

## Testing

Unit tests should cover:

- Pinned id parsing and toggling.
- Sort order with pinned records.
- Score sort behavior with missing values.
- Copyright risk ascending sort.
- Markdown export contains source, safety, scores, tags, and structured inspiration.
- JSON export contains the loaded references and generated metadata.
- Localization keys exist in Chinese and English.

Manual/browser smoke should cover:

- Sort selection changes card order.
- Pin toggle keeps a reference above unpinned references.
- Export Markdown downloads or writes a valid blob URL flow.
- Export JSON downloads from the full library.
- Add form still opens.
- Mobile layout has no horizontal overflow.

## Acceptance Criteria

- User can sort the reference deck by useful research criteria.
- User can pin important references and see them first.
- Pinning persists across reloads on the same browser/device.
- User can export the selected reference as Markdown.
- User can export the loaded library as JSON.
- Structured inspiration entry editing is at least as capable as before and clearer to use.
- No API behavior changes are required.
- No D1 migration is required unless explicitly approved later.
- Chinese default UI and English switch both remain usable.
- Existing tests, typecheck, lint, build, local browser smoke, and production deploy flow remain available.

## Spec Self-Review

- Placeholder scan: no placeholders remain.
- Scope check: this is a single frontend/productivity round.
- Ambiguity check: pinned state is explicitly device-local for Round 8.
- Consistency check: the design follows Round 7's three-panel workstation and does not revive the deferred Round 6 production automation path.
