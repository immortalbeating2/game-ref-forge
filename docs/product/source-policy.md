# Source Policy

## Purpose

This document defines how RefForge handles external sources, copyright boundaries, and public-safety decisions.

The product treats copyright status as data. Every saved reference needs enough source and license context to support private research today and conservative public review later.

## Source Handling Rules

First-version intake is manual URL-first:

1. The user pastes a source URL.
2. The app attempts metadata preview.
3. The user confirms or edits metadata.
4. The user chooses a normalized asset category.
5. The user chooses a license and public-safety status.
6. The user writes inspiration extraction notes.

Metadata preview may extract:

- Title.
- Site name.
- Canonical URL.
- Description.
- Open Graph image URL.

If preview fails, saving must still work with manual fields.

## Allowed Source Patterns

Good v1 sources:

- License-clear asset sites such as Kenney, Poly Haven, and selected OpenGameArt entries.
- Source-link-only references from game UI or design databases.
- Articles, tutorials, or breakdowns that are used as learning references.
- Personal private references that stay private.

Sources that need caution:

- Extracted sprites, textures, models, audio, or UI from commercial games.
- Screenshots or trailers from copyrighted games.
- ArtStation, Sketchfab, itch.io, or marketplace pages where license terms vary per item.
- Any page that does not clearly identify the author, source, or license.

## Hard Boundaries

Do not:

- Bulk mirror third-party assets.
- Rehost downloadable asset packs unless owned or clearly permitted.
- Treat `fair use` as a guaranteed public-display permission.
- Remove author or source context.
- Convert private references into public records automatically.
- Use unknown-license media as public showcase material.

## License Status

Use these values for `license_status`:

- `private_reference`: private research only; default for new records.
- `unknown_license`: authorization unclear; do not show media publicly.
- `source_link_only`: public page may show title, notes, and outbound link, but not rehosted media.
- `attribution_required`: public display requires author, source, license link, and modification notes.
- `cc0_or_public_domain`: safest for public examples and reusable samples.
- `permission_granted`: manually verified permission or owned content.

## Public Status

Use these values for `public_status`:

- `private`: only private research use.
- `review`: candidate for future public display but not approved.
- `public_safe`: safe enough for public display based on clear license or ownership.
- `public_link_only`: safe to expose text notes and source link, but not hosted media.

## Idea / Expression Boundary

RefForge should help extract:

- Design principles.
- Visual or audio rules.
- Composition methods.
- Interaction and feedback patterns.
- Transformation ideas.

RefForge should discourage copying:

- Exact sprites, models, screenshots, sounds, or UI layouts.
- Distinctive character designs.
- Exact color palettes or compositions when they identify the original work.
- Protected names, logos, brands, and unique visual expression.

## Public Review Rule

Before any public feature exists, every reference intended for public display must pass this checklist:

- Source URL is present.
- Author or publisher is present when available.
- License status is not `unknown_license`.
- Public status is not `private`.
- Attribution text is complete when required.
- The record explains what not to copy.
- Hosted media is only used when ownership or license allows it.

