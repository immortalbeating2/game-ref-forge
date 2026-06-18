# Round 5 Reference Quality Structure Design

Date: 2026-06-18
Status: Draft for user review
Stage: Round 5, second subtask after localization

## Purpose

This design expands RefForge from a basic reference collector into a stronger creative research desk for game asset work.

The current product already supports source metadata, safety status, a single rating, simple tags, and freeform inspiration notes. The next step is to make quality judgment and inspiration extraction more structured without changing the private-first source policy.

## Problem

The current fields are useful but too flat:

- `rating` does not explain whether a reference is valuable because it is useful, transformable, safe, or easy to apply.
- `style_tags` and `use_tags` mix visual language, production use, mood, and mechanic context.
- `inspiration_points`, `deconstruction_notes`, `transformation_ideas`, and `avoid_copying_notes` are freeform, so records can be saved without a clear idea/expression boundary.
- The UI does not yet help the user review whether a reference is ready for future use.

## Goals

- Add multi-dimensional scoring for reference quality.
- Add richer tag axes for retrieval and creative reuse.
- Add a structured inspiration extraction model that separates observation, principle, transformation, and avoid-copying guidance.
- Add a lightweight review status that helps distinguish rough captures from usable research notes.
- Preserve existing records and keep current CRUD behavior working during migration.
- Keep Chinese-first UI copy, with English still available through the existing language switch.

## Non-Goals

- Do not add public publishing.
- Do not add media upload or asset hosting.
- Do not change source/license/public-safety rules.
- Do not add AI generation or automated copyright judgment.
- Do not remove the existing basic fields during this round.
- Do not split persistence into multiple tables unless migration testing proves the JSON approach is insufficient.

## Product Model

### Multi-Dimensional Scores

Add four optional 1-5 score fields:

| Field | Meaning |
| --- | --- |
| `reference_value_score` | How useful the reference is for learning or solving a game asset problem. |
| `transformability_score` | How easy it is to extract principles and transform them into original work. |
| `copyright_risk_score` | How risky the source/expression is for public reuse. Higher means more risk. |
| `production_readiness_score` | How directly the reference can inform production decisions. |

The existing `rating` remains for compatibility and may be shown as "overall rating". It should not be deleted or silently remapped in this round.

### Tag Axes

Keep existing `style_tags` and `use_tags`, then add three focused tag arrays:

| Field | Meaning |
| --- | --- |
| `mechanic_tags` | Gameplay, interaction, economy, combat, crafting, navigation, feedback, or system contexts. |
| `mood_tags` | Emotional tone, fantasy, tension, comfort, danger, delight, mystery, or atmosphere. |
| `visual_language_tags` | Shape language, color logic, composition, material logic, scale, rhythm, readability, icon metaphor. |

This avoids forcing all retrieval into style/use tags while keeping v1 records readable.

### Structured Inspiration Extraction

Add a JSON array field named `inspiration_entries`. Each entry represents one reusable idea:

```ts
type InspirationEntry = {
  id: string;
  observation: string;
  principle: string;
  transferable_idea: string;
  original_application: string;
  avoid_copying: string;
};
```

Field intent:

- `observation`: concrete source-facing fact, such as "warm light frames the door".
- `principle`: reusable rule, such as "contrast directs player attention".
- `transferable_idea`: abstract design move that can travel to another context.
- `original_application`: how the user would apply it to a new original asset.
- `avoid_copying`: exact expression or risky element to avoid.

The existing `inspiration_points`, `deconstruction_notes`, `transformation_ideas`, and `avoid_copying_notes` remain available. The implementation should create one starter structured entry from the old fields when editing an older record, but should not delete the old values.

### Review Status

Add `quality_status` with these values:

- `captured`: saved but not deeply analyzed.
- `needs_analysis`: source metadata is useful but inspiration extraction is incomplete.
- `analyzed`: has at least one usable inspiration entry and enough safety notes.
- `ready_for_use`: suitable for informing original asset work.
- `blocked`: should not be used further until source or copyright uncertainty is resolved.

Default: `captured`.

## UX Design

### Add and Edit Forms

The form should keep the current single-page workflow, but group the expanded fields into clear sections:

- Source and safety.
- Classification and tags.
- Scores.
- Inspiration extraction.

The first implementation should avoid a heavy wizard. A dense, structured detail-panel form is better for the current research-desk UI.

### Detail Panel

The read view should show:

- A compact score summary.
- Review status.
- Tag groups.
- Structured inspiration entries with the idea/expression boundary visible.

If a record has no structured entries yet, the detail panel should show a clear empty state in Chinese and English.

### Filtering and Search

This round should add search coverage for the new tag arrays and structured inspiration text.

Filters for the new fields should be conservative:

- Add `quality_status` filter.
- Do not add separate filters for every score or tag axis in the first implementation.

### Localization

All new labels, helper text, validation messages, score names, tag axis names, and review statuses must go through the existing localization layer.

Chinese remains the default language.

## Data and Migration Design

Current persistence uses Drizzle schema in `db/schema.ts` and generated SQL under `drizzle/`.

Add nullable/defaulted fields to the existing `references` table:

```sql
ALTER TABLE references ADD COLUMN reference_value_score integer;
ALTER TABLE references ADD COLUMN transformability_score integer;
ALTER TABLE references ADD COLUMN copyright_risk_score integer;
ALTER TABLE references ADD COLUMN production_readiness_score integer;
ALTER TABLE references ADD COLUMN mechanic_tags text NOT NULL DEFAULT '[]';
ALTER TABLE references ADD COLUMN mood_tags text NOT NULL DEFAULT '[]';
ALTER TABLE references ADD COLUMN visual_language_tags text NOT NULL DEFAULT '[]';
ALTER TABLE references ADD COLUMN inspiration_entries text NOT NULL DEFAULT '[]';
ALTER TABLE references ADD COLUMN quality_status text NOT NULL DEFAULT 'captured';
```

The implementation should generate the actual migration through the existing Drizzle workflow instead of hand-editing the migration name.

Validation rules:

- Scores are optional.
- Scores must be integers between 1 and 5 when present.
- `copyright_risk_score` also uses 1-5, but higher means riskier.
- Tag arrays must return arrays to the frontend.
- `inspiration_entries` must return an array of objects with string fields.
- Blank structured inspiration rows should be removed before saving.
- `quality_status` must match the enum.

## API Compatibility

Existing `GET /api/references`, `POST /api/references`, `PUT /api/references/:id`, and `DELETE /api/references/:id` should remain the public API surface.

Compatibility expectations:

- Existing records without new fields should read with safe defaults.
- Existing clients that omit new fields should still save.
- Existing tests for basic create/update/delete should remain valid.
- API response shape may include the new fields after this round.

## Testing Strategy

Add or update tests for:

- New enum and validation rules in `lib/reference.ts`.
- JSON parsing/serialization for structured inspiration entries.
- Draft conversion for add/edit flows.
- Search visibility across new tag arrays and structured inspiration text.
- Localization labels for new statuses and field groups.
- Existing CRUD behavior with old-style payloads.

Manual/local QA should cover:

- Add a reference with scores, tags, one inspiration entry, and `quality_status`.
- Reload and confirm persistence.
- Edit the record and confirm new fields persist.
- Search by a new tag and by structured inspiration text.
- Delete the record.
- Switch Chinese/English and check new labels.

Production QA after deployment should cover the same CRUD path on the authenticated Sites deployment.

## Risks

- `app/page.tsx` is already large; implementation should extract helper components or pure helpers only where it reduces risk.
- Drizzle/D1 migration must be tested locally before deployment.
- More fields can make the mobile form crowded; the design should use compact grouping and avoid nested cards.
- Structured entries increase validation complexity; empty rows must not become noisy saved data.

## Open Decision

Recommended implementation approach: add these fields in the existing `references` table as JSON/text columns and nullable score columns. This fits the current one-table v1 architecture and keeps the round small enough to implement, test, deploy, and production-validate.

