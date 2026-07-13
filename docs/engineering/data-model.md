# Data Model

## Overview

RefForge stores source research in `references` and Round 11 synthesis work in two separate D1 tables. A synthesis is a durable, manually authored research artifact. It does not replace or write back to a reference, and it does not use the reference table's record type to represent a different entity.

The current schema is:

- `references`: source metadata, classification, public-safety fields, scores, tags, and inspiration extraction notes.
- `syntheses`: synthesis title, target asset, structured comparison and creation fields, status, and timestamps.
- `synthesis_references`: the ordered links from one synthesis to its source references, together with creation-time snapshots.

Tags and note-like fields remain JSON text while the taxonomy is still evolving. The data access layer parses reference JSON fields before returning `ReferenceRecord` values.

## D1 Tables

The existing `references` table continues to use the fields below:

```sql
CREATE TABLE references (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  source_url TEXT NOT NULL,
  canonical_url TEXT,
  site_name TEXT,
  author TEXT,
  preview_url TEXT,
  media_type TEXT NOT NULL,
  asset_category TEXT NOT NULL,
  source_category TEXT,
  style_tags TEXT NOT NULL DEFAULT '[]',
  use_tags TEXT NOT NULL DEFAULT '[]',
  mechanic_tags TEXT NOT NULL DEFAULT '[]',
  mood_tags TEXT NOT NULL DEFAULT '[]',
  visual_language_tags TEXT NOT NULL DEFAULT '[]',
  license_status TEXT NOT NULL,
  attribution_text TEXT,
  public_status TEXT NOT NULL,
  quality_status TEXT NOT NULL DEFAULT 'captured',
  rating INTEGER,
  reference_value_score INTEGER,
  transformability_score INTEGER,
  copyright_risk_score INTEGER,
  production_readiness_score INTEGER,
  inspiration_points TEXT NOT NULL DEFAULT '[]',
  inspiration_entries TEXT NOT NULL DEFAULT '[]',
  deconstruction_notes TEXT,
  transformation_ideas TEXT,
  avoid_copying_notes TEXT,
  related_original_asset TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

Round 11 adds `drizzle/0002_multi_reference_synthesis.sql`:

```sql
CREATE TABLE syntheses (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  target_asset TEXT,
  shared_principles TEXT,
  key_differences TEXT,
  original_direction TEXT,
  avoid_copying_notes TEXT,
  design_constraints TEXT,
  experiment_plan TEXT,
  next_actions TEXT,
  additional_notes TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_syntheses_status ON syntheses(status);
CREATE INDEX idx_syntheses_updated_at ON syntheses(updated_at);

CREATE TABLE synthesis_references (
  id TEXT PRIMARY KEY,
  synthesis_id TEXT NOT NULL,
  reference_id TEXT,
  position INTEGER NOT NULL,
  snapshot_json TEXT NOT NULL,
  snapshot_updated_at TEXT NOT NULL,
  FOREIGN KEY (synthesis_id) REFERENCES syntheses(id) ON DELETE CASCADE,
  FOREIGN KEY (reference_id) REFERENCES references(id) ON DELETE SET NULL,
  UNIQUE (synthesis_id, position),
  UNIQUE (synthesis_id, reference_id)
);

CREATE INDEX idx_synthesis_references_synthesis_id
  ON synthesis_references(synthesis_id);
```

`synthesis_id` is required and cascades when its parent synthesis is deleted. `reference_id` is nullable and is set to `NULL` when the source reference is deleted; the relation row and its snapshot remain readable as historical evidence. SQLite's `UNIQUE` semantics allow more than one `NULL` `reference_id`, which is required for multiple unavailable source snapshots in one synthesis. The position and non-null reference uniqueness indexes prevent duplicate order positions or duplicate live references within a synthesis.

The database does not encode the 2-4 cardinality or contiguous `position` range as a SQLite `CHECK`. The server validates a create request as 2-4 unique, real reference IDs and writes positions `0` through `n - 1` in the submitted order. Existing relation membership and order are immutable after creation; `PATCH` updates synthesis fields and status only.

The migration is additive. It applies to a local D1 database that already contains `references` without rewriting that table or its rows.

## Enum Values

`media_type`:

- `image`
- `video`
- `audio`
- `model`
- `article`
- `asset_pack`
- `screenshot`
- `mixed`

`asset_category`:

- `character`
- `environment`
- `prop`
- `ui_hud`
- `vfx`
- `material_texture`
- `animation`
- `audio`

`license_status`:

- `private_reference`
- `unknown_license`
- `source_link_only`
- `attribution_required`
- `cc0_or_public_domain`
- `permission_granted`

`public_status`:

- `private`
- `review`
- `public_safe`
- `public_link_only`

`quality_status`:

- `captured`
- `needs_analysis`
- `analyzed`
- `ready_for_use`
- `blocked`

`syntheses.status`:

- `draft`
- `actionable`
- `archived`

## JSON Text Fields

Reference JSON fields are parsed by `referenceRowToRecord` and returned as arrays or structured objects:

- `style_tags`, `use_tags`, `mechanic_tags`, `mood_tags`, `visual_language_tags`: string arrays.
- `inspiration_points`: string array.
- `inspiration_entries`: structured inspiration entry array.

The persisted `snapshot_json` is a closed, versioned `SynthesisReferenceSnapshot` with `schema_version: 1`. It includes:

- `reference_id` and the source `reference_updated_at` used for stale detection.
- Title, source URL, canonical URL, site, author, media type, and asset category.
- License, public-safety, and quality status.
- Rating, reference value, transformability, copyright risk, and production readiness scores.
- Style, use, mechanic, mood, and visual-language tags.
- Inspiration points, structured inspiration entries, deconstruction notes, transformation ideas, and avoid-copying notes.

The snapshot intentionally excludes preview media binary data and does not broaden the source's public or copyright boundary. The server creates it from the current `ReferenceRecord` during synthesis creation and explicit refresh; clients cannot submit or replace snapshot content.

## Snapshot Lifecycle

- A newly created relation stores a server-generated v1 snapshot and its `snapshot_updated_at`.
- A detail response derives `available` and `stale`; neither state is persisted.
- A live source is stale only when its current `updated_at` is later than the snapshot's source `reference_updated_at`.
- A deleted source leaves the relation and snapshot in place, with `reference_id = NULL` and `available = false`.
- `POST /api/syntheses/:id/references/:relationId/refresh` reads the current source, atomically replaces the snapshot and snapshot time, and updates the synthesis `updated_at`.
- A refresh of an unavailable source fails without changing the old snapshot.
- Malformed stored JSON is converted to a stable unavailable v1 placeholder rather than crashing detail rendering.

## Reference Response Shape

```ts
type ReferenceRecord = {
  id: string;
  title: string;
  source_url: string;
  canonical_url: string | null;
  site_name: string | null;
  author: string | null;
  preview_url: string | null;
  media_type: MediaType;
  asset_category: AssetCategory;
  source_category: string | null;
  style_tags: string[];
  use_tags: string[];
  mechanic_tags: string[];
  mood_tags: string[];
  visual_language_tags: string[];
  license_status: LicenseStatus;
  attribution_text: string | null;
  public_status: PublicStatus;
  quality_status: QualityStatus;
  rating: number | null;
  reference_value_score: number | null;
  transformability_score: number | null;
  copyright_risk_score: number | null;
  production_readiness_score: number | null;
  inspiration_points: string[];
  inspiration_entries: InspirationEntry[];
  deconstruction_notes: string | null;
  transformation_ideas: string | null;
  avoid_copying_notes: string | null;
  related_original_asset: string | null;
  created_at: string;
  updated_at: string;
};
```

Round 11 adds these application-level shapes:

```ts
type SynthesisReferenceLink = {
  id: string;
  synthesis_id: string;
  reference_id: string | null;
  position: number;
  snapshot: SynthesisReferenceSnapshot;
  snapshot_updated_at: string;
  available: boolean;
  stale: boolean;
};

type SynthesisDetail = SynthesisRecord & {
  references: SynthesisReferenceLink[];
};

type SynthesisSummary = Pick<
  SynthesisRecord,
  "id" | "title" | "target_asset" | "status" | "updated_at"
> & { reference_count: number };
```

## Validation Rules

- Reference validation remains as defined by the existing model; new references default to private handling.
- A synthesis title is 1-160 characters.
- `target_asset` is optional and at most 240 characters.
- The eight optional long-text synthesis fields are each at most 8000 characters.
- Status must be `draft`, `actionable`, or `archived`; new records default to `draft`.
- `reference_ids` must contain 2-4 non-blank, unique IDs that still exist at write time.
- The client does not control snapshot content, relation IDs, saved relation membership, or relation order.
- `actionable` has no hard completeness gate; the UI continues to surface missing target asset, original direction, experiment plan, and next actions.
