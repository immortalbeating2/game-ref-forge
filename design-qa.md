# Round 14 Design QA

## Scope

- Reference: `docs/product/assets/round-14-visual-target.png`
- Implementation screenshot: `docs/qa/2026-07-30-round-14-final-desktop.png`
- Same-state comparison: `docs/qa/2026-07-30-round-14-comparison.png`
- Viewport: `1487x1058`

## Visual Comparison

The implementation preserves the approved target's essential hierarchy:

- a restrained graphite three-region workstation;
- a dense central reference deck;
- a structured inspection panel ordered by source safety, scores, quality, tags, and inspiration;
- a bottom comparison dock for ordered multi-reference work;
- mint emphasis reserved for active state, selection, and primary action.

The implementation intentionally uses real RefForge fields and category fallbacks instead of copying concept-only demo content. It does not add the target's decorative radar chart or invent preview media when a reference has no safe image.

## Findings And Repairs

### P1 - Toolbar Actions Overflowed At The Approved Viewport

- Evidence: the first implementation compressed the action group into one row and caused labels to compete with search and sorting.
- Repair: the action group now uses a stable three-column command row with export/data actions on the second row, and the toolbar allocates more space to work controls.
- Result: the final `1487x1058` comparison has no overlapping labels or clipped controls.

### P1 - Density Preference Reset After Reload

- Evidence: choosing comfortable density wrote local storage, but a reload returned the deck to compact.
- Repair: density hydration and persistence moved into `useWorkspaceViewPreferences`, with a regression test covering initial hydration and subsequent writes.
- Result: compact and comfortable modes both survive reload without a clean-tab hydration warning.

### P2 - Browser Full-Page Capture Repeated The Mobile Fixed Region

- Evidence: the in-app browser's temporary `390x844` viewport plus full-page screenshot repeated the sidebar region.
- Diagnosis: DOM order, layout metrics, dialog bounds, control overflow checks, and a clean browser reload all remained correct. Document/body horizontal overflow was `0`.
- Result: treated as a browser capture artifact, not an application defect. Mobile acceptance uses measured layout and interactive readback rather than the malformed full-page capture.

## Impeccable Pass

- Project register: product workstation.
- Existing product tokens and component vocabulary retained.
- Detector result for changed UI surfaces: no findings.
- No decorative gradient text, oversized rounding, nested promotional cards, or motion-only state communication was introduced.
- Reduced-motion behavior remains present.

## Accepted Differences

- References without safe preview media use category fallbacks.
- The approved concept's chart is not rendered because it is not backed by the current data model.
- Mobile keeps the established single-column document flow and hides the desktop density control.

## Final Result

final result: passed
