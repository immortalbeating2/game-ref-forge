# Data Model

## Overview

The first version uses one `references` table.

The table stores source metadata, classification, public-safety fields, and inspiration extraction notes. Tags and note-like fields are stored as JSON text while the taxonomy is still evolving.

## D1 Table Sketch

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

CREATE INDEX idx_references_asset_category ON references(asset_category);
CREATE INDEX idx_references_license_status ON references(license_status);
CREATE INDEX idx_references_public_status ON references(public_status);
CREATE INDEX idx_references_created_at ON references(created_at);
```

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

## JSON Text Fields

Store these as JSON strings in D1 and parse them in the data access layer:

- `style_tags`: string array.
- `use_tags`: string array.
- `mechanic_tags`: string array.
- `mood_tags`: string array.
- `visual_language_tags`: string array.
- `inspiration_points`: string array.
- `inspiration_entries`: structured inspiration entry array.

Structured inspiration entry shape:

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

## Validation Rules

- `title`, `source_url`, `media_type`, `asset_category`, `license_status`, and `public_status` are required.
- `source_url` must be an absolute URL.
- New records default to `license_status = private_reference` unless explicitly changed.
- New records default to `public_status = private` unless explicitly changed.
- `rating` is optional and should be between 1 and 5 when present.
- `reference_value_score`, `transformability_score`, `copyright_risk_score`, and `production_readiness_score` are optional and should be integers between 1 and 5 when present.
- Higher `copyright_risk_score` means higher risk.
- `style_tags`, `use_tags`, `mechanic_tags`, `mood_tags`, `visual_language_tags`, `inspiration_points`, and `inspiration_entries` should always return arrays to the frontend.
- Blank structured inspiration entries should be removed before saving.
- Missing `quality_status` should default to `captured`.

## Migration

Round 5 uses the existing Drizzle migration flow and adds:

- `drizzle/0001_massive_zodiak.sql`

The migration only appends nullable/defaulted columns to the existing `references` table.
