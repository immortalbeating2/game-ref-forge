# Game Asset Reference Research Desk Design

Date: 2026-06-06

## Product Direction

Build a personal-first game asset reference research desk. The site helps collect references from game asset and game design sources, normalize them into a consistent structure, classify them by creative use, and extract reusable inspiration for original asset creation.

This is not a download site and not a bulk mirror of third-party asset packs. The first version is a private research tool that can later expose a public-safe subset of records.

## Goals

- Collect reference links from game asset and game design sites.
- Normalize different source formats into one reference card model.
- Classify references across game asset types and design dimensions.
- Turn references into useful creative prompts, not just saved images.
- Track source, author, license, and public-safety status for every record.
- Keep the data model portable enough to migrate away from Sites/Cloudflare if needed.

## Non-Goals

- No bulk crawling of game history or all historical game assets.
- No direct redistribution of copyrighted game assets.
- No file upload or hosted asset downloads in the first version.
- No automated legal determination of whether a third-party work is safe to reuse.
- No public community contribution system in the first version.

## Reference Sites And Lessons

- Game UI Database and Interface In Game show that game references become useful when they are filterable by game, genre, screen type, layout, color, texture, patterns, and UI element type.
- Game UI Wiki shows a wiki-style archive model where screenshots can be organized and improved by contributors.
- The Spriters Resource and related VG Resource sites show the archival value of extracted sprites, textures, models, and sounds, but also the copyright risk: many extracted game resources remain copyrighted and are not suitable for commercial reuse without permission.
- OpenGameArt, Kenney, and Poly Haven are safer seed pools when license clarity matters, especially for CC0 or explicitly licensed game assets.

## Copyright And Public Boundary

The system treats copyright status as product data, not as a footnote. Each reference must carry a license/publication status:

- `private_reference`: private research only; default for new records.
- `unknown_license`: authorization unclear; do not show media in a public version.
- `source_link_only`: public page may show title, notes, and outbound link, but not rehosted media.
- `attribution_required`: public display requires author, source, license link, and modification notes.
- `cc0_or_public_domain`: safest for public examples and reusable samples.
- `permission_granted`: manually verified permission or owned content.

The product follows an idea/expression boundary: it helps extract ideas, methods, visual principles, and design observations from references, while discouraging copying specific protected expression such as exact sprites, models, screenshots, sounds, layouts, characters, or distinctive visual compositions.

Fair use is not treated as a guaranteed rule. Public display should be conservative unless authorization or license status is clear.

## Source Handling

First version source intake is manual URL-first:

1. User pastes a source URL.
2. Backend attempts to read metadata:
   - title
   - site name
   - Open Graph image
   - description
   - canonical URL
3. User confirms or edits all metadata.
4. User chooses a normalized asset category.
5. User chooses license/publication status.
6. User adds inspiration extraction fields.

If metadata extraction fails, the form remains usable with manual fields. The app should never block saving a useful reference just because metadata cannot be fetched.

Future source adapters can add richer parsing for specific sites such as OpenGameArt, Sketchfab, itch.io, Kenney, Poly Haven, ArtStation, or Steam pages.

## Unified Reference Model

Every source becomes a reference card with these fields:

- `id`
- `title`
- `source_url`
- `canonical_url`
- `site_name`
- `author`
- `preview_url`
- `media_type`: image, video, audio, model, article, asset_pack, screenshot, mixed
- `asset_category`: character, environment, prop, ui_hud, vfx, material_texture, animation, audio
- `source_category`: original platform category text
- `style_tags`: e.g. pixel, stylized, realistic, low-poly, dark fantasy, sci-fi, cozy
- `use_tags`: e.g. main menu, combat feedback, item rarity, exploration cue, skill impact
- `license_status`
- `attribution_text`
- `public_status`: private, review, public_safe, public_link_only
- `rating`
- `inspiration_points`
- `deconstruction_notes`
- `transformation_ideas`
- `avoid_copying_notes`
- `related_original_asset`
- `created_at`
- `updated_at`

## Classification System

The first taxonomy has two axes.

### Asset Type Axis

- Character: silhouette, proportion, costume layers, faction language, pose, animation readability.
- Environment: composition, mood, lighting direction, landmarking, exploration cues, scale, pathing.
- Prop: shape language, function clarity, material mix, rarity, affordance, pickup readability.
- UI/HUD: information hierarchy, state changes, icon system, controls, readability, feedback timing.
- VFX: anticipation, impact, dissipation, color semantics, particle rhythm, gameplay feedback strength.
- Material/Texture: surface quality, wear pattern, tileability, roughness/metalness cue, pattern density.
- Animation: anticipation, timing, arcs, weight, loop behavior, transitions, hit pause, readability.
- Audio: emotional tone, material identity, impact weight, loop texture, feedback recognizability.

### Creative Question Axis

Each reference should answer one or more creative questions:

- What problem does this solve?
- What should the player notice first?
- What emotion or fantasy does it create?
- What visual/audio rule can be reused?
- What exact expression must not be copied?
- How can this be transformed into a different theme, genre, or asset?

## Inspiration Extraction System

The right-side detail panel should guide the user through four layers:

1. Source layer: where it came from, who made it, what license/status applies.
2. Observation layer: what is visible or audible, described concretely.
3. Principle layer: what design rule or pattern can be learned.
4. Transformation layer: how to apply the rule to an original asset without copying expression.

Example transformation:

- Reference: a warm-lit fantasy forest gate.
- Observation: warm light is placed behind the entrance and framed by darker tree roots.
- Principle: contrast and framing direct the player's eye toward the path forward.
- Transformation: use cold blue light inside an ice cave entrance with different geometry and props.
- Avoid copying: do not reuse the exact gate silhouette, root arrangement, color palette, or composition.

## User Experience

The first screen is the working app, not a landing page.

Layout:

- Left sidebar: asset type filters, public-safety filters, source groups.
- Center: searchable visual reference gallery.
- Right detail panel: selected reference card with source, license, classification, notes, and extraction fields.

Primary actions:

- Add reference URL.
- Edit metadata.
- Add classification and tags.
- Write inspiration extraction notes.
- Mark public-safety status.
- Search and filter references.
- Delete a reference with confirmation.

The visual style should feel like a creative research workstation: dark neutral base, high-quality thumbnail handling, clear color accents per asset type, compact controls, and no marketing hero page.

## Data And Backend

Use a Sites-compatible vinext/React project. Backend APIs live in the same Cloudflare Worker-compatible app.

Use D1 for first-version persistence with a small data access layer so storage can be migrated later. The UI must talk to backend API functions rather than direct database code.

First-version storage will use one `references` table with JSON text fields for tags and notes. This keeps the prototype flexible while the taxonomy is still evolving.

Required API routes:

- `GET /api/references`
- `POST /api/references`
- `PUT /api/references/:id`
- `DELETE /api/references/:id`
- `POST /api/metadata/preview`

## Seed Data

Initial seed records should come from license-clear or source-clear examples where possible:

- Kenney assets for game-ready packs and UI/audio examples.
- Poly Haven for CC0 textures, HDRIs, and models.
- OpenGameArt entries with explicit license fields.
- A small number of game UI reference links, stored as source-link-only/private examples rather than rehosted downloads.

Seed data should demonstrate all eight asset categories and the inspiration extraction fields.

## Error Handling

- Metadata fetch fails: show a warning and allow manual entry.
- Preview image fails: show a neutral placeholder and keep the source URL.
- Unknown license: default to private reference.
- Save fails: preserve form contents and show retry.
- Delete: require confirmation.
- Empty database: show starter examples and an add-reference prompt.

## Testing And Validation

Local validation:

- Build the site with the normal build command.
- Verify D1 schema and generated migration output.
- Exercise CRUD APIs.
- Verify metadata preview route handles success, failure, and blocked sites.
- Check filters for asset type, license status, public status, search, and tags.
- Verify desktop and mobile layout so cards, controls, and detail text do not overlap.

Product validation:

- Add 20-30 references across multiple asset types.
- Confirm the taxonomy helps find references later.
- Confirm extraction fields create usable original-asset ideas.
- Confirm public-safety filters correctly separate private references from publishable ones.

## Implementation Decisions

- The first version will not include an `original_assets` table. It will use `related_original_asset` as a text field for early idea linking.
- Metadata extraction will use a separate preview action before save. Saving remains manual and must work even if preview extraction fails.
- The first version will not expose a public route. It will include `public_status` fields and filters so a public-safe subset can be reviewed later.

