# Taxonomy

## Purpose

The taxonomy makes references useful for creative retrieval.

A saved reference should answer two questions:

- What kind of asset or design material is this?
- What creative problem can it help solve?

## Asset Type Axis

Use these normalized `asset_category` values:

| Value | Meaning | Useful For |
| --- | --- | --- |
| `character` | Characters, costumes, enemies, NPCs, creatures | Silhouette, proportion, faction language, pose, readable identity |
| `environment` | Levels, scenes, landmarks, biomes, set dressing | Composition, mood, lighting, exploration cues, scale |
| `prop` | Items, weapons, tools, pickups, interactive objects | Shape language, function clarity, rarity, material mix |
| `ui_hud` | Menus, HUD, icons, panels, buttons, overlays | Information hierarchy, state changes, readability, feedback timing |
| `vfx` | Skill effects, particles, impact, magic, explosions | Anticipation, impact, dissipation, color semantics, rhythm |
| `material_texture` | Materials, tileable textures, surface studies | Wear pattern, roughness, metalness, tileability, pattern density |
| `animation` | Motion clips, loops, combat timing, transitions | Timing, arcs, weight, anticipation, hit pause, readability |
| `audio` | SFX, ambience, UI sound, loops, musical cues | Emotional tone, material identity, impact weight, recognizability |

## Media Type Axis

Use these normalized `media_type` values:

- `image`
- `video`
- `audio`
- `model`
- `article`
- `asset_pack`
- `screenshot`
- `mixed`

## Creative Question Axis

Each reference should answer at least one creative question:

- What problem does this solve?
- What should the player notice first?
- What emotion or fantasy does it create?
- What visual or audio rule can be reused?
- What exact expression must not be copied?
- How can this be transformed into a different theme, genre, or asset?

## Inspiration Extraction Layers

Each reference detail should guide the user through four layers:

1. Source layer: where it came from, who made it, what license/status applies.
2. Observation layer: what is visible or audible, described concretely.
3. Principle layer: what design rule or pattern can be learned.
4. Transformation layer: how to apply the rule to an original asset without copying expression.

## Quality Structure

Round 5 adds a richer quality layer so references can be judged by why they are useful, not only whether they look interesting.

Use these optional 1-5 scores:

| Field | Meaning |
| --- | --- |
| `reference_value_score` | Learning or problem-solving value for game asset work. |
| `transformability_score` | How easily the useful principle can become original work. |
| `copyright_risk_score` | Copyright/source risk; higher means riskier. |
| `production_readiness_score` | How directly the reference can guide production decisions. |

Use `quality_status` to describe review maturity:

- `captured`: saved but not deeply analyzed.
- `needs_analysis`: useful source, incomplete extraction.
- `analyzed`: at least one usable structured idea exists.
- `ready_for_use`: suitable to inform original asset work.
- `blocked`: do not use further until source or rights uncertainty is resolved.

## Expanded Tag Axes

Keep `style_tags` and `use_tags`, and add:

- `mechanic_tags`: gameplay, interaction, combat, economy, crafting, navigation, feedback.
- `mood_tags`: fantasy, emotion, atmosphere, tension, comfort, danger, mystery.
- `visual_language_tags`: shape language, composition, material logic, contrast, scale, rhythm, icon metaphor.

Search should include all tag axes.

## Structured Inspiration Entries

Use `inspiration_entries` for reusable idea extraction:

- `observation`: concrete fact seen or heard in the source.
- `principle`: reusable rule learned from that observation.
- `transferable_idea`: abstract idea that can travel to another asset or genre.
- `original_application`: specific original use in the user's work.
- `avoid_copying`: exact expression, layout, sample, silhouette, or IP element to avoid.

The older fields remain useful as summaries, but structured entries should become the preferred extraction format for serious references.

## Field Guidance

`inspiration_points` should capture what is useful:

- Clear silhouette.
- Good material contrast.
- Strong player attention cue.
- Efficient icon metaphor.
- Readable combat feedback.
- Mood-setting audio loop.

`deconstruction_notes` should describe how it works:

- Shape hierarchy.
- Color contrast.
- Timing structure.
- Information grouping.
- Repetition and variation.
- Player readability.

`transformation_ideas` should describe how to make something original:

- Change theme.
- Change asset type.
- Change scale.
- Change color logic.
- Change composition.
- Apply the principle to a new mechanic.

`avoid_copying_notes` should state protected or risky expression:

- Exact silhouette.
- Exact layout.
- Exact character identity.
- Exact sound sample.
- Exact logo, symbol, or named IP.
- Exact composition or distinctive visual arrangement.

## Example

Reference: warm-lit fantasy forest gate.

- Observation: warm light sits behind the entrance and is framed by darker tree roots.
- Principle: contrast and framing direct the player's eye toward the path forward.
- Transformation: use cold blue light inside an ice cave entrance with different geometry and props.
- Avoid copying: do not reuse the exact gate silhouette, root arrangement, color palette, or composition.
