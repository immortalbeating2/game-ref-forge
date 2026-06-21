# Round 7 Workspace UI Upgrade Design

## Goal

Upgrade RefForge's main workspace into a clearer `灵感提炼` workstation while preserving the current product scope, API surface, and private-first research model.

This design uses:

- Concept 3 as the primary direction: inspiration extraction workstation.
- Concept 1 as density guidance: compact, scannable reference cards.
- Concept 2 as field-order guidance: source, classification, safety, scores, tags, and inspiration fields grouped consistently.

## Scope

Round 7 is a frontend design and implementation round.

In scope:

- Main workspace layout.
- Left filter/navigation panel.
- Center reference gallery/card density.
- Right detail and `灵感提炼` panel.
- Add/edit form organization.
- Empty/loading/error/delete states.
- Chinese-first UI readability.
- Desktop and mobile responsive behavior.

Out of scope:

- D1 schema changes.
- New reference fields.
- Public gallery or public sharing route.
- File upload, media hosting, crawling, or asset downloads.
- New authentication model.
- Production command-line CRUD access infrastructure.

## Product Context

RefForge is a private creative research desk. The user is not browsing a public gallery; they are building a trusted personal reference library and extracting original creative direction from it.

The page should answer three questions quickly:

- What references do I have?
- Which ones are safe, useful, and worth transforming?
- What original idea can I extract from the selected reference?

## Information Architecture

### Left Panel: Research Controls

Purpose: narrow the working set without hiding safety controls.

Primary regions:

- Brand and language selector.
- Search scope summary.
- Asset category filter.
- Quality status filter.
- Public status filter.
- License status filter.
- Clear filters action.

Rules:

- Keep controls compact.
- Use native select/menu controls for enum values in this round.
- Do not hide public status or license status behind advanced menus.
- The panel should feel like a research instrument, not a decorative sidebar.

### Center Panel: Reference Cards

Purpose: fast scanning and comparison.

Card content priority:

1. Category/media visual block.
2. Title.
3. Source/site.
4. Asset category.
5. License status.
6. Public status.
7. Quality status.
8. Score summary.
9. A small tag preview.

Rules:

- Cards use stable dimensions and a predictable thumbnail ratio.
- Long titles clamp without changing card height dramatically.
- Selected state is clear but restrained.
- Safety and quality status remain visible before opening details.
- The grid should be denser than a showcase gallery and quieter than a marketing card layout.

### Right Panel: Inspiration Extraction

Purpose: convert selected references into original creative decisions.

Read-only detail order:

1. Source identity.
2. Safety review.
3. Quality scores.
4. Tag axes.
5. Structured inspiration entries.
6. Notes and transformation ideas.
7. Actions.

Rules:

- The panel title should make the workspace intent obvious: `灵感提炼`.
- Safety information appears before creative notes.
- Structured inspiration entries should read as a thinking workflow, not a raw JSON-like list.
- Edit, open source, and delete actions remain visible but visually secondary to review content.

### Add/Edit Form

Purpose: enter complete records without overwhelming the user.

Field order:

1. Source and metadata.
2. Classification and safety.
3. Quality and scoring.
4. Tags.
5. Structured inspiration.
6. Notes and transformation.

Rules:

- Add and edit use the same field order.
- Metadata preview remains optional.
- Save remains possible after preview failure.
- Form state is preserved on save failure.
- The form should not add new fields in this round.

## Visual Direction

### Layout Feel

The workspace should feel like a compact creative research console:

- Dense.
- Calm.
- Structured.
- Slightly tactile.
- Not neon, not gamified, not a public showcase.

### Color

Keep the existing dark neutral base but refine hierarchy:

- Background: deep neutral.
- Panels: two close neutral layers.
- Borders: visible but not bright.
- Accent: restrained mint/teal for primary actions and selection.
- Category accents: small areas only, used for recognition.
- Danger: reserved for delete confirmation.

Avoid turning the whole app into a single hue family. Avoid purple-blue gradient dominance.

### Typography

Use the existing sans-serif direction.

Rules:

- Product UI scale, not hero typography.
- Panel headings should be compact and clear.
- Labels should be readable at small sizes.
- Chinese labels must fit controls without overlap.
- No negative letter spacing.

### Components

Primary component vocabulary:

- Workspace shell.
- Sidebar filter group.
- Toolbar.
- Reference card.
- Status badge.
- Score tile.
- Detail section.
- Structured inspiration block.
- Add/edit form section.
- Delete confirmation.

Cards are allowed for repeated references and structured inspiration entries. Avoid nested cards.

## Interaction Design

### Selection

Selecting a card updates the right panel. The selected card should remain visually anchored.

### Filtering

Changing filters may hide the selected reference. If that happens, the app should keep the existing behavior of closing edit mode and communicating that selection is no longer visible.

### Add Reference

The add form can remain inline in the center panel for this round. If the redesigned layout makes it too tall, a later round may promote it to a side sheet or dedicated view.

### Edit Reference

Edit mode remains in the right panel. It should inherit the improved field order and sticky save/cancel actions.

### Delete

Keep app-owned delete confirmation. The destructive confirm button should be visually distinct, but the surrounding panel should not become alarm-heavy.

## Responsive Design

### Desktop

Use three panels:

- Left: fixed-width controls.
- Center: flexible reference grid.
- Right: fixed or bounded `灵感提炼` panel.

### Tablet

Use two panels:

- Left controls can compress or stack above the gallery.
- Detail panel can move below the gallery.

### Mobile

Use a single-column flow:

- Brand and filters first.
- Search/add controls.
- Reference cards.
- Detail panel below selection.

No horizontal scrolling. Buttons and select labels must fit Chinese copy.

## High-Fidelity Image Target

Before `product-design:image-to-code`, generate one final high-fidelity target image for the desktop main workspace.

Prompt requirements:

- Chinese-first RefForge workspace.
- Three-panel dark product UI.
- Dense central reference cards.
- Right panel titled `灵感提炼`.
- Source and safety before inspiration.
- Score and tag structures visible.
- Restrained mint/teal accent.
- No marketing hero, no neon HUD, no public asset marketplace styling.

The generated image becomes the visual source for the implementation attempt. If the image conflicts with this design doc, this design doc wins.

## Implementation Boundaries

Expected implementation files:

- `app/page.tsx`
- `app/globals.css`
- `lib/localization.ts` only if copy labels need small adjustments.
- Existing UI-state or draft tests only if behavior changes.

Do not change:

- D1 schema.
- Reference API contracts.
- Metadata preview route behavior.
- Production e2e QA infrastructure.

## Acceptance Criteria

- `PRODUCT.md` exists and identifies RefForge as product UI.
- Main workspace visibly reads as an inspiration extraction workstation.
- Center cards are denser and more structured than the current version.
- Right panel clearly prioritizes source, safety, scores, tags, and structured inspiration.
- Add/edit forms use the same field order as read-only detail.
- Chinese default UI remains intact.
- English switch remains usable.
- Desktop, tablet, and mobile have no obvious overlap or horizontal overflow.
- Existing CRUD behavior remains unchanged.
- Local tests, typecheck, lint, and build pass before deployment.

## Spec Self-Review

- Placeholder scan: no placeholders remain.
- Scope check: this is a single frontend UI round; backend and deployment work are out of scope.
- Ambiguity check: high-fidelity image generation is explicitly a design target step, not a source of new product requirements.
- Consistency check: the design matches `PRODUCT.md`, `docs/product/frontend-design.md`, and the 2026-06-19 visual direction.
