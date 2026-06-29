# Round 9 Data Quality Workflow Design

## Goal

Round 9 should make RefForge better at telling the user which references are ready for later creative use and which records still need cleanup.

The recommended first version is a no-migration data-quality workflow: derive quality signals from existing fields, add focused review queues and visual hints, and keep production data writes limited to the existing edit form.

## Context

Round 7 established the three-panel workstation. Round 8 added sorting, local pinning, and exports. The current bottleneck is not adding more fields; it is knowing which existing records are incomplete, risky, or strong enough to reuse.

The current model already has enough signals for a useful first pass:

- Source fields: URL, canonical URL, site, author, preview URL.
- Safety fields: license status, public status, attribution, avoid-copying notes.
- Review fields: quality status and score matrix.
- Discovery fields: tag axes, inspiration points, structured inspiration entries.
- Workflow state: local pinned reference ids.

## Recommended Direction

Implement Round 9 as a derived quality layer over existing records.

The UI should answer three everyday questions:

1. Which references are incomplete?
2. Which references are high-value and low-risk?
3. Which references should I review next?

This should be done with:

- A small quality helper module.
- A "review queue" filter.
- Compact quality chips on cards and detail panels.
- A quality checklist in the detail panel.
- Chinese-first copy with English equivalents.

## Scope

In scope:

- Derive per-reference quality issues from existing fields.
- Derive per-reference quality badges such as `待补全`, `高价值`, `低风险`, `可制作`.
- Add review queue filters:
  - 全部
  - 待补全
  - 已置顶
  - 高价值
  - 低版权风险
  - 可制作
- Show a compact issue count on each card.
- Show a detailed quality checklist in the detail panel.
- Keep existing search, status filters, sort, pin, and export behavior.
- Unit tests for quality evaluation and queue filtering.
- Local browser smoke and authenticated production UI smoke without saving production data.

Out of scope:

- D1 migration.
- New persistent quality score fields.
- Server-side quality evaluation.
- AI-generated analysis.
- Batch delete.
- Bulk editing in the first implementation pass.
- Public gallery or sharing.
- Asset upload or media hosting.

## Quality Rules

Round 9 quality should be deterministic and explainable.

### Missing Source

Flag when:

- `site_name` is missing.
- `author` is missing.

Do not require `preview_url`. Many safe references should remain source-link-only.

### Missing Safety

Flag when:

- `license_status` is `unknown` or missing.
- `avoid_copying_notes` is empty.
- `public_status` is `review` and attribution text is empty.

Do not treat `review` as an error. It is a review state.

### Missing Inspiration

Flag when:

- `inspiration_points` is empty.
- `inspiration_entries` is empty.
- `deconstruction_notes` is empty.
- `transformation_ideas` is empty.

### Missing Scores

Flag when any score is missing:

- `rating`
- `reference_value_score`
- `transformability_score`
- `copyright_risk_score`
- `production_readiness_score`

### Positive Signals

Show positive badges when:

- High value: `reference_value_score >= 4`
- Low risk: `copyright_risk_score <= 2`
- Production ready: `production_readiness_score >= 4`
- Transformable: `transformability_score >= 4`
- Analyzed: `quality_status === "analyzed"`

## Review Queues

Review queues are filters, not new database states.

Recommended queue modes:

- `all`: show all filtered records.
- `incomplete`: show references with at least one quality issue.
- `pinned`: show references whose id is in local pinned ids.
- `high_value`: show references with high-value signal.
- `low_risk`: show references with low copyright risk signal.
- `production_ready`: show references with production-ready signal.

Queue filtering should compose with existing search/status filters and Round 8 sorting:

1. Apply existing search and status filters.
2. Apply review queue.
3. Apply pinned-first sort and selected sort mode.

## User Experience

### Sidebar

Add a review queue control near existing research controls.

Recommended label:

- `整理队列`

Options:

- `全部参考`
- `待补全`
- `已置顶`
- `高价值`
- `低版权风险`
- `可制作`

### Reference Card

Cards should show a compact quality hint without becoming noisy:

- If incomplete: `待补全 N`
- If no issues: `资料完整`
- Positive badges may show at most two compact chips, such as `高价值` and `低风险`.

The card should not become taller in a way that breaks the Round 7 density.

### Detail Panel

The detail panel should include a "质量清单" section.

It should show:

- Source completeness.
- Safety completeness.
- Inspiration completeness.
- Score completeness.
- Positive signals.

Each issue should name the missing field in user-facing language, not raw database keys.

The checklist should be informational. It should not block editing, saving, exporting, or deleting.

### Empty State

When a review queue has no matches:

- Show a clear message such as `当前队列没有匹配参考`。
- Offer `清除筛选` or switch queue back to all.

## Data And Architecture

No schema change is recommended for the initial Round 9.

New helper boundaries:

- `lib/reference-quality.ts`
  - Evaluate missing field groups.
  - Build issue lists.
  - Build positive signal badges.
  - Filter references by review queue.

- `tests/reference-quality.test.ts`
  - Cover issue detection.
  - Cover positive signals.
  - Cover queue filtering.
  - Cover pinned queue with local pinned ids.

Existing files to modify:

- `lib/localization.ts`
  - Add review queue and quality checklist copy.

- `tests/localization.test.ts`
  - Assert Chinese and English copy exists.

- `app/page.tsx`
  - Add review queue state.
  - Apply review queue filtering after existing filters and before sort.
  - Render card-level quality chips.
  - Render detail-panel quality checklist.

- `app/globals.css`
  - Style compact quality chips and checklist rows.

## Error Handling

- Missing optional fields must not throw.
- Empty arrays must evaluate as incomplete where relevant.
- Seed references should be evaluated the same way as saved D1 references.
- If pinned ids contain ids not in the current record set, ignore them.

## Testing

Unit tests should cover:

- Complete reference has no quality issues.
- Missing author/site creates source issues.
- Unknown license and missing avoid-copying notes create safety issues.
- Empty inspiration arrays and notes create inspiration issues.
- Missing scores create score issues.
- Positive badges appear for high value, low risk, production readiness, and transformability.
- Queue filtering works for incomplete, pinned, high value, low risk, and production ready.
- Localization copy exists in Chinese and English.

Browser smoke should cover:

- Review queue control appears.
- `待补全` queue filters records when possible.
- `已置顶` queue shows locally pinned references.
- Quality chips appear on cards.
- Detail panel quality checklist appears.
- Add form still opens.
- Current desktop and mobile widths do not horizontally overflow.

Production smoke should be read-only:

- Do not save new references.
- Do not edit or delete existing production data.
- Pin/unpin may be used because it only affects browser-local state, and test should restore the previous state.

## Acceptance Criteria

- User can switch review queues without losing existing search/status filter behavior.
- User can identify incomplete references from the card deck.
- User can inspect exact missing quality items in the detail panel.
- User can focus pinned, high-value, low-risk, and production-ready records.
- No D1 migration is needed.
- No API route changes are needed.
- Existing Round 8 sort, pin, export, and add-form entry still work.
- `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build` pass.
- Local browser smoke passes.
- Authenticated production UI smoke passes for visible controls, with known browser automation limitations documented.

## Controversial Points

### 1. Derived Quality vs Persistent Quality Fields

Recommended: derived quality only.

Why: The product already stores enough raw fields, and derived quality avoids schema churn. Persistent quality fields can become stale unless every edit path updates them.

Alternative: persist a `quality_score` or `completion_score`.

Trade-off: easier sorting/reporting later, but requires D1 migration and update logic.

### 2. Batch Editing In Round 9

Recommended: do not implement batch editing in the first Round 9 pass.

Why: Batch editing creates higher risk for accidental production data changes and requires more UI safety states. The current product still benefits more from seeing quality gaps clearly.

Alternative: add batch tag/status updates now.

Trade-off: more powerful, but wider surface area and harder production QA.

### 3. Whether "待补全" Should Treat `author` As Required

Recommended: treat missing author as an issue, not a blocker.

Why: Author is important for source hygiene, but many source pages may not expose a clean author field.

Alternative: only require source URL, site, license, and avoid-copying notes.

Trade-off: fewer warnings, but weaker source discipline.

### 4. Whether Seed Records Should Count As Real Quality Data

Recommended: evaluate seed records normally, but label them through existing seed fallback copy.

Why: Users should see the same UI behavior before and after saving real data.

Alternative: exclude seed records from quality queues.

Trade-off: less confusing for production data, but harder to validate empty-state behavior.

### 5. Mobile Scope

Recommended: keep Round 9 mobile work to preventing overflow and preserving access to controls.

Why: This round is workflow-focused, not a mobile redesign.

Alternative: redesign the mobile layout around a bottom detail drawer.

Trade-off: better mobile UX, but it should be a dedicated visual/UI round.

## Optional Points For User Review

1. Should Round 9 include batch edit now, or defer it to Round 10?
2. Should completion use strict categories only, or also show a numeric completion percentage?
3. Should `已置顶` be a review queue only, or also appear as a sidebar checkbox?
4. Should export JSON include quality issue metadata, or keep exports as raw references only?
5. Should production smoke for Round 9 require full mobile testing before merge, or allow mobile as post-deploy manual smoke?

## Initial Recommendation

Proceed with the no-migration derived quality workflow:

- Add review queues.
- Add quality chips and detail checklist.
- Defer batch edit.
- Avoid API and D1 changes.
- Keep production smoke read-only.

This gives the next round a concrete quality improvement while preserving the project's current private, low-risk research-desk shape.

## Spec Self-Review

- Placeholder scan: no placeholders remain.
- Scope check: this is a single frontend/productivity round and does not include batch editing implementation.
- Ambiguity check: quality is explicitly derived, not persisted, for the initial version.
- Consistency check: the design keeps Round 8 pin/sort/export behavior and avoids the deferred Round 6 production automation path.
