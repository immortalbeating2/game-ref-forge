# Frontend Design

## Purpose

This document defines the first-version frontend design for RefForge / `灵感锻造台`.

It should guide the Sites implementation before any UI code is scaffolded. It is intentionally lightweight: it defines layout, workflows, components, states, visual language, and responsive rules without becoming a full visual design system.

## Design Brief

Build a private-first research workstation for collecting game asset references, classifying them, and extracting reusable creative principles.

The first screen is the working app. Do not build a marketing landing page, decorative hero, or download-site style gallery.

## Product Feel

The interface should feel like a focused creative research desk:

- Quiet, dense, and scan-friendly.
- Dark neutral base with restrained contrast.
- Clear thumbnails, source metadata, and status badges.
- Compact controls for repeated filtering and review.
- Color accents by asset category, not a one-note full-page palette.
- Practical and editorial enough for design thinking, but still work-focused.

Avoid:

- Marketing hero sections.
- Decorative card-heavy landing-page composition.
- Oversized typography in tool surfaces.
- Purely atmospheric backgrounds.
- Copy that explains the app instead of letting controls do the work.
- Public asset showcase or download-site styling.

## Confirmed Visual Direction

As of 2026-06-19, the next main workspace upgrade should use the third generated UI concept as the primary direction:

- Main direction: an inspiration-extraction workstation.
- Borrow from concept 1: compact card density for fast scanning and comparison.
- Borrow from concept 2: orderly field grouping for source, classification, safety, scores, tags, and inspiration entries.

This direction is documented in `docs/superpowers/specs/2026-06-19-main-workspace-ui-upgrade-design.md`.

The key product implication is that the right detail panel should evolve from a generic record inspector into a structured `灵感提炼` workspace, while the center gallery keeps dense, stable reference cards.

## First Screen Layout

Use an A+C hybrid workspace:

```text
+------------------+------------------------------+----------------------+
| Left Sidebar     | Center Gallery               | Right Detail Panel   |
| Filters          | Search + Reference Cards     | Selected Reference   |
+------------------+------------------------------+----------------------+
```

### Left Sidebar

Purpose: narrow the reference set quickly.

Primary controls:

- Asset category filter.
- Media type filter.
- License status filter.
- Public status filter.
- Source/site group filter.
- Style tag and use tag filters.
- Rating filter when enough records exist.

Interaction rules:

- Filters should be compact and persistent.
- Use checkboxes or toggles for multi-select filters.
- Use segmented controls only for small mutually exclusive sets.
- Show active filter count.
- Provide a clear-filters action.
- Do not hide core public-safety filters behind advanced menus.

### Center Gallery

Purpose: scan, search, and select references.

Core elements:

- Top search input.
- Add reference action.
- Sort control.
- Reference card grid/list.
- Empty state.
- Loading state.

Reference cards should show:

- Preview thumbnail or placeholder.
- Title.
- Source/site name.
- Asset category.
- Media type.
- License status.
- Public status.
- Small tag preview.
- Selected state.

Card rules:

- Thumbnails should have stable aspect ratio.
- Broken preview images use a neutral placeholder.
- Cards should not resize unpredictably when tags or titles vary.
- Long titles clamp to a small number of lines.
- Public-safety status must be visible without opening the detail panel.

### Right Detail Panel

Purpose: turn a selected reference into usable creative thinking.

Sections:

1. Source
   - Title.
   - Source URL.
   - Canonical URL.
   - Site name.
   - Author.
   - Attribution text.

2. Classification
   - Media type.
   - Asset category.
   - Source category.
   - Style tags.
   - Use tags.

3. Safety
   - License status.
   - Public status.
   - Avoid-copying notes.

4. Inspiration extraction
   - Inspiration points.
   - Deconstruction notes.
   - Transformation ideas.
   - Related original asset.

5. Actions
   - Edit.
   - Open source.
   - Delete.

Panel rules:

- The detail panel should be readable as a structured review surface, not a generic note drawer.
- Source and safety fields should appear before creative notes.
- Delete requires confirmation.
- Open source should use an external-link affordance.
- Edit mode should preserve unsaved content if save fails.

## Primary User Flows

### Add Reference

1. User clicks add reference.
2. User pastes a source URL.
3. User clicks metadata preview.
4. App attempts to fetch title, site name, canonical URL, description, and Open Graph image.
5. User confirms or edits metadata.
6. User selects media type and asset category.
7. User selects license status and public status.
8. User adds inspiration fields.
9. User saves.

Rules:

- Metadata preview is helpful but optional.
- Save must remain possible when preview fails.
- New records default to `license_status = private_reference`.
- New records default to `public_status = private`.
- The form should make source and safety fields feel required, not secondary.

### Browse And Filter

1. User searches or applies filters.
2. Gallery updates.
3. User selects a reference.
4. Detail panel updates.
5. User can edit or clear filters without losing the selected record unless it no longer matches.

Rules:

- Search should cover title, site name, author, tags, and notes when practical.
- Filters should combine predictably.
- Empty filtered results should explain that filters are active and provide a clear action.

### Edit Reference

1. User opens selected reference.
2. User clicks edit.
3. User changes metadata, classification, safety status, or notes.
4. User saves.

Rules:

- Save failure preserves form state.
- Changed public-safety fields should be visually easy to review.
- Do not automatically change `public_status` from private to public because a license looks safe.

### Delete Reference

1. User clicks delete.
2. App asks for confirmation.
3. User confirms.
4. Record is removed and selection moves to a sensible neighbor or empty detail state.

Rules:

- Delete is destructive and must not be a single-click action.
- Confirmation copy should name the reference title.

## Component Inventory

### App Shell

Owns the main workspace structure and responsive layout.

### Filter Sidebar

Owns all persistent filters and clear-filter behavior.

### Reference Toolbar

Owns search, sort, add reference, and result summary.

### Reference Gallery

Owns the card grid/list and selection behavior.

### Reference Card

Owns compact display of thumbnail, identity, source, classification, and safety badges.

### Detail Panel

Owns read-only selected reference details and action entrypoints.

### Reference Form

Owns add/edit fields, validation, metadata preview result, and save behavior.

### Metadata Preview Module

Owns preview request state, preview success, preview failure, and manual fallback messaging.

### Status Badge

Owns visual treatment for license status, public status, asset category, and media type.

### Empty / Error States

Owns empty database, no filtered results, broken preview, API failure, and save failure presentation.

## Visual Language

### Base

- Use a dark neutral background.
- Keep page sections unframed where possible.
- Use cards only for individual repeated reference records, dialogs, and framed tool surfaces.
- Avoid nesting cards inside cards.

### Category Accent Direction

Use color as a secondary recognition aid for asset categories:

| Asset Category | Accent Intent |
| --- | --- |
| `character` | identity / silhouette |
| `environment` | mood / space |
| `prop` | object / function |
| `ui_hud` | interface / signal |
| `vfx` | energy / impact |
| `material_texture` | surface / texture |
| `animation` | motion / timing |
| `audio` | sound / rhythm |

Implementation can choose exact colors later, but the palette should avoid being dominated by one hue family.

### Typography

- Use compact, readable interface type.
- Avoid hero-scale type inside the app.
- Keep headings small and scannable in panels.
- Long titles must wrap or clamp without breaking card layout.

### Icons And Controls

- Use icons in buttons where the action is familiar: add, edit, delete, open source, clear filters, search.
- Use text labels where safety or source meaning needs clarity.
- Use tooltips for unfamiliar icon-only controls.
- Use checkboxes/toggles for binary and multi-select filters.
- Use select/menu controls for enum values.
- Use textarea fields for extraction notes.

## State Design

### Empty Database

Show a compact starter state with:

- Add reference action.
- Short reminder that references are private by default.
- Optional starter examples after seed data exists.

Do not show a marketing introduction.

### No Filtered Results

Show:

- Current active-filter count.
- Clear filters action.
- Add reference action.

### Metadata Preview Failure

Show:

- A warning that preview failed.
- The source URL kept in the form.
- Manual title/site/preview fields still editable.

### Broken Preview Image

Show:

- Stable placeholder with media type and source/site label when available.
- No layout shift.

### Save Failure

Show:

- Error message.
- Retry action.
- Form content preserved.

### Delete Confirmation

Show:

- Reference title.
- Clear cancel and confirm actions.
- Destructive styling only on confirm.

## Responsive Rules

### Desktop

Preferred layout:

- Left sidebar fixed-width.
- Center gallery flexible.
- Right detail panel fixed or max-width constrained.

The gallery should remain useful at common laptop widths. Avoid forcing horizontal scrolling for normal app usage.

### Tablet

Preferred layout:

- Filters can collapse into a drawer or top filter bar.
- Gallery remains primary.
- Detail panel can become a side sheet.

### Mobile

Preferred layout:

- Single-column list/gallery.
- Filters open as a sheet.
- Detail opens as a full-screen or stacked view.
- Add/edit form opens as a full-screen dialog or dedicated view.

Mobile rules:

- No text overlap.
- Buttons must fit their labels.
- Safety status remains visible on reference cards.
- The add-reference flow should remain possible without horizontal scrolling.

## Accessibility And Usability

- All interactive controls need visible focus states.
- Status should not rely on color alone.
- Images need useful alt text derived from title/source when available.
- Forms need labels, not placeholder-only fields.
- Destructive actions need confirmation.
- External links need clear affordance.
- Keyboard navigation should support search, selection, edit, and save flows.

## Content Guidelines

Interface copy should be concise and task-oriented.

Use:

- `Add reference`
- `Preview metadata`
- `Open source`
- `License status`
- `Public status`
- `Avoid copying`
- `Transformation ideas`

Avoid:

- Long educational paragraphs inside the app.
- Claims that a source is legally safe without user review.
- Language that implies the app downloads or redistributes assets.

## Implementation Boundaries

Frontend should call API routes, not D1 directly.

Required first-version API dependencies:

- `GET /api/references`
- `POST /api/references`
- `PUT /api/references/:id`
- `DELETE /api/references/:id`
- `POST /api/metadata/preview`

Do not implement these frontend features in v1:

- Public browsing route.
- Bulk import crawler.
- File upload.
- Asset pack downloads.
- Team collaboration.
- Advanced visual mood board generation.
- Original asset management table.

## Acceptance Checklist

The first implemented UI should satisfy:

- First screen is the working research desk.
- Left sidebar, center gallery, and right detail panel exist on desktop.
- Mobile has a usable single-column or sheet-based layout.
- Reference cards show source, category, license, and public status.
- Add-reference flow works without successful metadata preview.
- Safety fields are visible before save.
- Detail panel supports source, classification, safety, and extraction review.
- Empty, loading, broken image, preview failure, save failure, and delete confirmation states exist.
- Text does not overlap or overflow controls at desktop or mobile widths.
