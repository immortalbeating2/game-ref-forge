# Round 13 Full-Library Backup And Controlled Restore Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the legacy reference-only JSON export with a versioned RefForge Backup v1 that can preview and atomically restore references, syntheses, ordered relations, historical snapshots, and optional device preferences.

**Architecture:** A strict domain contract in `lib/backup.ts` owns validation, canonicalization and digests. `lib/backup-db.ts` reads complete domain state through existing Drizzle mappings and writes bounded JSON1 chunks through the native D1 binding in one transactional `batch()`. Three API routes expose export, zero-write preview and controlled restore, while a focused data-management dialog owns file selection and confirmation without moving reference or synthesis business state into the backup module.

**Tech Stack:** TypeScript 5.9, React 19, vinext/Next route handlers, Drizzle ORM 0.45, Cloudflare D1 native binding, SQLite JSON extension, Vitest 4, Node `sqlite`, lucide-react icons, Sites.

## Global Constraints

- Only accept `format: "ref-forge-backup"` and `schema_version: 1`; reject the old reference-only JSON.
- Research data always includes complete references, syntheses and ordered relations with structured historical snapshots.
- Controlled restore inserts missing IDs, fully overwrites matching IDs, and preserves current records absent from the backup.
- Replace relations only for syntheses present in the backup; preserve all relations for syntheses absent from the backup.
- Preserve record IDs, relation IDs, timestamps, positions and snapshots exactly.
- Device preferences are optional, default off for both export and restore, and contain only pinned reference IDs plus `WorkspaceLayoutPreferences` with `version: 1`.
- Maximum backup size is `5 MB`; limits are 2,000 references, 1,000 syntheses and 4,000 relations.
- Restore JSON chunks must be smaller than `1 MB`; a restore batch must contain at most 40 prepared statements.
- Use one bound JSON parameter per write statement with SQLite `json_each(?)`; never issue one query per record.
- Preview never writes D1. Restore rechecks both backup and database state digests.
- Any D1 batch statement failure must roll back the entire restore.
- No D1 migration, public route, media copy, credential export, encryption, scheduler or generic field-mapping tool.
- Chinese remains the default UI and English remains complete.
- Production verification uses a unique QA prefix, restores only temporary QA data, proves existing non-QA data unchanged, and leaves zero QA residue.
- Update `docs/progress/status.md`, `docs/progress/timeline.md`, the current daily log, the Round 13 QA document, this plan and `AGENTS.md` before completion.
- D1 implementation must remain within the documented Worker invocation limits: 50 queries on Free, 100 bound parameters per statement, 100 KB SQL length and 2 MB string/BLOB size.

## File Structure

**Create**

- `lib/backup.ts`: Backup v1 types, strict parser, canonical serializer, digests, size/count constants, preference normalization and filename.
- `lib/backup-db.ts`: complete state reads, export construction, diff preview, JSON1 restore operation generation and D1 batch execution.
- `app/api/backup/request.ts`: bounded request-body reader and common backup route error mapping.
- `app/api/backup/route.ts`: full research-data Backup v1 export.
- `app/api/backup/preview/route.ts`: strict zero-write preview endpoint.
- `app/api/backup/restore/route.ts`: digest-guarded controlled restore endpoint.
- `app/data-management/data-management-state.ts`: pure dialog state transitions and restore enablement.
- `app/data-management/data-management-dialog.tsx`: accessible backup/restore dialog.
- `tests/fixtures/backup.ts`: reusable complete Backup v1 fixture builders.
- `tests/backup.test.ts`: format, validation, digest, preferences and filename tests.
- `tests/backup-db.test.ts`: database reads, preview, operation generation and restore orchestration tests.
- `tests/backup-restore-sqlite.test.ts`: real SQLite JSON1 and rollback contract.
- `tests/backup-routes.test.ts`: export, preview, restore, request limit and error mapping tests.
- `tests/data-management-state.test.ts`: pure dialog flow and confirmation tests.
- `tests/data-management-components.test.ts`: source contract for dialog, page, synthesis and responsive integration.
- `docs/qa/2026-07-27-full-library-backup-restore.md`: local, merged-main, Sites and production evidence.

**Modify**

- `db/index.ts`: expose the native D1 binding through a server-only getter.
- `lib/reference-db.ts`: export record/row conversion needed by backup storage.
- `lib/synthesis-db.ts`: export synthesis record/row conversion needed by backup storage.
- `lib/reference-export.ts`: remove the obsolete full-library reference-only JSON creator while retaining single-reference Markdown and safe filename behavior.
- `tests/reference-export.test.ts`: remove the obsolete reference-only JSON assertion.
- `lib/localization.ts`: add complete Chinese/English data-management copy and backup error mapping.
- `tests/localization.test.ts`: assert all new localization keys and codes.
- `app/workspace/use-workspace-layout.ts`: expose validated external preference application.
- `app/synthesis/synthesis-workspace.tsx`: report dirty/busy state, expose data management and reload after restore.
- `app/page.tsx`: coordinate one dialog, reference reload, dirty guards and device preference application.
- `app/globals.css`: modal, tabs, summaries, status, 390px and reduced-motion styling.
- `package.json`, `package-lock.json`: add `lucide-react` for the approved database, download, upload and close icons.
- `AGENTS.md`, `docs/progress/status.md`, `docs/progress/timeline.md`, `docs/progress/2026-07-27.md`: stage and delivery trace.

---

### Task 1: Backup V1 Domain Contract

**Files:**
- Create: `lib/backup.ts`
- Create: `tests/fixtures/backup.ts`
- Create: `tests/backup.test.ts`
- Modify: `lib/reference-export.ts`
- Modify: `tests/reference-export.test.ts`

**Interfaces:**
- Consumes: `ReferenceRecord`, `SynthesisRecord`, `SynthesisReferenceSnapshot`, `WorkspaceLayoutPreferences`.
- Produces:
  - `RefForgeBackupV1`
  - `BackupDevicePreferences`
  - `BackupSynthesisRelation`
  - `BackupValidationIssue`
  - `BackupParseResult`
  - `parseRefForgeBackup(value: unknown): BackupParseResult`
  - `createBackupDigest(backup: RefForgeBackupV1): Promise<string>`
  - `createBackupFilename(exportedAt?: string): string`
  - `withBackupPreferences(backup, preferences): RefForgeBackupV1`

- [ ] **Step 1: Add a complete reusable Backup v1 fixture**

Create `tests/fixtures/backup.ts` with two complete references, one synthesis and two ordered relations. One relation must be available and one must use `reference_id: null` with a valid historical snapshot:

```ts
export function makeBackupFixture(): RefForgeBackupV1 {
  const first = makeReference({ id: "ref-1", title: "Material study" });
  const second = makeReference({ id: "ref-2", title: "UI study" });
  const synthesis = makeSynthesis({ id: "syn-1", title: "Shared direction" });

  return {
    format: "ref-forge-backup",
    schema_version: 1,
    exported_at: "2026-07-27T00:00:00.000Z",
    app: { name: "RefForge" },
    data: {
      references: [first, second],
      syntheses: [synthesis],
      synthesis_references: [
        {
          id: "link-1",
          synthesis_id: synthesis.id,
          reference_id: first.id,
          position: 0,
          snapshot: createReferenceSnapshot(first),
          snapshot_updated_at: "2026-07-27T00:00:00.000Z",
        },
        {
          id: "link-2",
          synthesis_id: synthesis.id,
          reference_id: null,
          position: 1,
          snapshot: createReferenceSnapshot(second),
          snapshot_updated_at: "2026-07-27T00:00:00.000Z",
        },
      ],
    },
    preferences: null,
  };
}
```

The fixture's `makeReference` must fill every `ReferenceRecord` field and `makeSynthesis` must fill every `SynthesisRecord` field so later tasks never use unsafe partial records.

- [ ] **Step 2: Write failing strict-format tests**

Add focused cases in `tests/backup.test.ts`:

```ts
it("round-trips a complete Backup v1", () => {
  const backup = makeBackupFixture();
  expect(parseRefForgeBackup(JSON.parse(JSON.stringify(backup)))).toEqual({
    ok: true,
    backup,
  });
});

it.each([
  [{ exported_at: "", count: 0, references: [] }, "unsupported_format"],
  [{ ...makeBackupFixture(), schema_version: 2 }, "unsupported_version"],
  [{ ...makeBackupFixture(), extra: true }, "validation_failed"],
])("rejects unsupported or open formats", (value, code) => {
  const result = parseRefForgeBackup(value);
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.issues[0].code).toBe(code);
});
```

Add explicit tests for duplicate reference/synthesis/relation IDs, non-contiguous positions, fewer than 2 or more than 4 relations, duplicate non-null reference relations, multiple null relations, dangling synthesis IDs, dangling non-null reference IDs, snapshot/reference mismatch, invalid timestamps, invalid enums, invalid scores, damaged snapshots and all count limits.

- [ ] **Step 3: Run the new tests and capture RED**

Run:

```powershell
npx vitest run --config vitest.config.ts tests/backup.test.ts
```

Expected: FAIL because `lib/backup.ts` and its exported contract do not exist.

- [ ] **Step 4: Implement the closed Backup v1 types and parser**

Create these exact public shapes in `lib/backup.ts`:

```ts
export const BACKUP_FORMAT = "ref-forge-backup" as const;
export const BACKUP_SCHEMA_VERSION = 1 as const;
export const MAX_BACKUP_BYTES = 5_000_000;
export const MAX_BACKUP_REFERENCES = 2_000;
export const MAX_BACKUP_SYNTHESES = 1_000;
export const MAX_BACKUP_RELATIONS = 4_000;

export type BackupDevicePreferences = {
  pinned_reference_ids: string[];
  workspace_layout: WorkspaceLayoutPreferences;
};

export type BackupSynthesisRelation = {
  id: string;
  synthesis_id: string;
  reference_id: string | null;
  position: number;
  snapshot: SynthesisReferenceSnapshot;
  snapshot_updated_at: string;
};

export type RefForgeBackupV1 = {
  format: typeof BACKUP_FORMAT;
  schema_version: typeof BACKUP_SCHEMA_VERSION;
  exported_at: string;
  app: { name: "RefForge" };
  data: {
    references: ReferenceRecord[];
    syntheses: SynthesisRecord[];
    synthesis_references: BackupSynthesisRelation[];
  };
  preferences: BackupDevicePreferences | null;
};

export type BackupValidationIssue = {
  code:
    | "unsupported_format"
    | "unsupported_version"
    | "backup_too_large"
    | "validation_failed";
  path: string;
  message: string;
};

export type BackupParseResult =
  | { ok: true; backup: RefForgeBackupV1 }
  | { ok: false; issues: BackupValidationIssue[] };
```

Use plain-object checks with exact allowed-key arrays at every level. Reuse `validateReferenceInput`, `validateSynthesisInput`, and `parseReferenceSnapshot(JSON.stringify(value))`, then add record ID/timestamp and relationship validation. Do not coerce unknown values into valid records.

- [ ] **Step 5: Add canonical serialization, digest, preferences and filename**

Implement key-sorted object serialization with array order preserved:

```ts
export function canonicalBackupJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalBackupJson).join(",")}]`;
  }
  if (isPlainObject(value)) {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${canonicalBackupJson(value[key])}`,
    ).join(",")}}`;
  }
  return JSON.stringify(value);
}

export async function createBackupDigest(backup: RefForgeBackupV1) {
  const bytes = new TextEncoder().encode(canonicalBackupJson(backup));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
```

`withBackupPreferences` must normalize pinned IDs with the existing pinned parser/serializer and normalize layout through the existing workspace parser/serializer. `createBackupFilename` must return `ref-forge-backup-v1-YYYY-MM-DD.json`.

- [ ] **Step 6: Prove digest and optional preference behavior**

Add tests showing:

- Reordered object keys produce the same digest.
- Reordered reference or relation arrays produce a different digest.
- Preferences default to `null`.
- Duplicated/blank pinned IDs normalize.
- Invalid layout values normalize through the Round 12 contract.
- Unknown preference keys reject during parse.
- Backup filename is stable and safe.

Run:

```powershell
npx vitest run --config vitest.config.ts tests/backup.test.ts tests/workspace-layout.test.ts tests/pinned-references.test.ts
```

Expected: PASS.

- [ ] **Step 7: Remove the obsolete reference-only JSON creator**

Delete `createReferenceJsonExport` from `lib/reference-export.ts` and remove only its old test from `tests/reference-export.test.ts`. Keep `formatReferenceMarkdown` and `safeExportFilename` unchanged.

Run:

```powershell
npx vitest run --config vitest.config.ts tests/reference-export.test.ts tests/backup.test.ts
```

Expected: PASS and no source reference to `createReferenceJsonExport`.

- [ ] **Step 8: Commit Task 1**

```powershell
git add lib/backup.ts lib/reference-export.ts tests/fixtures/backup.ts tests/backup.test.ts tests/reference-export.test.ts
git commit -m "feat: 定义全库备份合同 / define full-library backup contract"
```

---

### Task 2: Complete Export And Zero-Write Preview

**Files:**
- Create: `lib/backup-db.ts`
- Create: `tests/backup-db.test.ts`
- Modify: `lib/reference-db.ts`
- Modify: `lib/synthesis-db.ts`

**Interfaces:**
- Consumes: Task 1 Backup v1 parser/digest and existing Drizzle schema.
- Produces:
  - `BackupInventory`
  - `BackupPreview`
  - `createFullBackup(exportedAt?: string): Promise<RefForgeBackupV1>`
  - `previewBackup(backup: RefForgeBackupV1): Promise<BackupPreview>`
  - exported `referenceRecordToRow`, `synthesisRowToRecord`, `synthesisRecordToRow`

- [ ] **Step 1: Export existing row converters without changing CRUD behavior**

Rename/export only these functions:

```ts
// lib/reference-db.ts
export function referenceRecordToRow(
  record: ReferenceRecord,
): typeof references.$inferInsert

// lib/synthesis-db.ts
export function synthesisRowToRecord(
  row: typeof syntheses.$inferSelect,
): SynthesisRecord

export function synthesisRecordToRow(
  record: SynthesisRecord,
): typeof syntheses.$inferInsert
```

Update internal call sites to the public names. Run existing reference and synthesis tests before adding backup behavior:

```powershell
npx vitest run --config vitest.config.ts tests/reference.test.ts tests/synthesis-db.test.ts tests/synthesis-routes.test.ts
```

Expected: PASS.

- [ ] **Step 2: Write failing complete-export tests**

In `tests/backup-db.test.ts`, mock `getDb()` with three deterministic selects and assert:

```ts
it("exports all tables in stable id order with structured snapshots", async () => {
  useBackupReadDb({ references: referenceRows, syntheses: synthesisRows, relations: relationRows });
  const backup = await createFullBackup("2026-07-27T00:00:00.000Z");

  expect(backup.data.references.map(({ id }) => id)).toEqual(["ref-1", "ref-2"]);
  expect(backup.data.syntheses.map(({ id }) => id)).toEqual(["syn-1"]);
  expect(backup.data.synthesis_references[0]).toMatchObject({
    id: "link-1",
    position: 0,
    snapshot: { schema_version: 1, reference_id: "ref-1" },
  });
  expect(backup.preferences).toBeNull();
});
```

Add a stored invalid-snapshot case that rejects export rather than substituting `Unavailable snapshot`.

- [ ] **Step 3: Run export tests and capture RED**

```powershell
npx vitest run --config vitest.config.ts tests/backup-db.test.ts
```

Expected: FAIL because `lib/backup-db.ts` does not exist.

- [ ] **Step 4: Implement stable inventory reads and full export**

Use three ordered selects:

```ts
type BackupInventory = {
  references: ReferenceRecord[];
  syntheses: SynthesisRecord[];
  relations: BackupSynthesisRelation[];
};

async function readBackupInventory(): Promise<BackupInventory> {
  const db = getDb();
  const [referenceRows, synthesisRows, relationRows] = await Promise.all([
    db.select().from(references).orderBy(references.id),
    db.select().from(syntheses).orderBy(syntheses.id),
    db.select().from(synthesisReferences)
      .orderBy(synthesisReferences.synthesisId, synthesisReferences.position),
  ]);
  // Convert every row through the exported domain mappers and strict snapshot parser.
}
```

Build Backup v1 with `preferences: null`, parse it through `parseRefForgeBackup`, and throw a typed stored-data error if the generated domain object is invalid.

- [ ] **Step 5: Write failing diff and state-digest tests**

Add tests for:

```ts
it("reports creates, overwrites, preserves and relations without writing", async () => {
  const backup = makeBackupFixture();
  useBackupReadDb({
    references: [toRow(makeReference({ id: "ref-1" })), toRow(makeReference({ id: "current-only" }))],
    syntheses: [toSynthesisRow(makeSynthesis({ id: "syn-1" })), toSynthesisRow(makeSynthesis({ id: "current-syn" }))],
    relations: [],
  });

  await expect(previewBackup(backup)).resolves.toMatchObject({
    references: { create: 1, overwrite: 1, preserve: 1 },
    syntheses: { create: 0, overwrite: 1, preserve: 1 },
    relations: { restore: 2, historical: 1 },
    contains_preferences: false,
    backup_digest: expect.stringMatching(/^[a-f0-9]{64}$/),
    state_digest: expect.stringMatching(/^[a-f0-9]{64}$/),
  });
  expect(fakeDb.insert).not.toHaveBeenCalled();
  expect(fakeDb.update).not.toHaveBeenCalled();
  expect(fakeDb.delete).not.toHaveBeenCalled();
  expect(fakeDb.batch).not.toHaveBeenCalled();
});
```

Also prove deterministic state digest regardless of database row return order and digest change when any record, timestamp, relation or snapshot changes.

- [ ] **Step 6: Implement preview and state digest**

Define:

```ts
export type BackupPreview = {
  references: { create: number; overwrite: number; preserve: number };
  syntheses: { create: number; overwrite: number; preserve: number };
  relations: { restore: number; historical: number };
  contains_preferences: boolean;
  backup_digest: string;
  state_digest: string;
};
```

Normalize current inventory into ID-sorted domain arrays, canonicalize it with the Task 1 serializer, and SHA-256 hash it. Compare ID sets only for create/overwrite/preserve counts; content differences do not change the meaning of "overwrite".

Run:

```powershell
npx vitest run --config vitest.config.ts tests/backup-db.test.ts tests/synthesis-db.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit Task 2**

```powershell
git add lib/backup-db.ts lib/reference-db.ts lib/synthesis-db.ts tests/backup-db.test.ts
git commit -m "feat: 增加备份导出预览 / add backup export preview"
```

---

### Task 3: Bounded JSON1 Atomic Restore

**Files:**
- Modify: `db/index.ts`
- Modify: `lib/backup-db.ts`
- Modify: `tests/backup-db.test.ts`
- Create: `tests/backup-restore-sqlite.test.ts`

**Interfaces:**
- Consumes: Task 2 inventory/preview and Task 1 canonical backup.
- Produces:
  - `MAX_D1_JSON_CHUNK_BYTES = 1_000_000`
  - `MAX_D1_BATCH_STATEMENTS = 40`
  - `BackupRestoreOperation`
  - `buildBackupRestoreOperations(backup): BackupRestoreOperation[]`
  - `restoreBackup(request): Promise<BackupRestoreResult>`
  - `getD1Binding()`

- [ ] **Step 1: Write failing chunk and SQL-operation tests**

Add tests for:

```ts
it("builds bounded JSON1 operations instead of one statement per row", () => {
  const backup = makeLargeValidBackup({ references: 120, syntheses: 20, relations: 40 });
  const operations = buildBackupRestoreOperations(backup);

  expect(operations.length).toBeLessThanOrEqual(MAX_D1_BATCH_STATEMENTS);
  expect(operations.every(({ params }) => params.length === 1)).toBe(true);
  expect(operations.every(({ params }) =>
    new TextEncoder().encode(String(params[0])).byteLength < MAX_D1_JSON_CHUNK_BYTES,
  )).toBe(true);
  expect(operations.some(({ sql }) => sql.includes("json_each(?)"))).toBe(true);
});
```

Add separate assertions that:

- Empty arrays emit no unnecessary insert statement.
- Imported synthesis IDs produce one bounded relation-delete statement.
- Reference and synthesis operations use `ON CONFLICT(id) DO UPDATE`.
- Relation operations use plain `INSERT` after delete.
- More than 40 operations rejects before D1 access.

- [ ] **Step 2: Run operation tests and capture RED**

```powershell
npx vitest run --config vitest.config.ts tests/backup-db.test.ts
```

Expected: FAIL because restore operation exports do not exist.

- [ ] **Step 3: Expose the native server-only D1 binding**

Modify `db/index.ts`:

```ts
export function getD1Binding() {
  if (!env.DB) {
    throw new Error("Cloudflare D1 binding `DB` is unavailable.");
  }
  return env.DB;
}
```

Keep `getDb()` unchanged for all existing Drizzle CRUD.

- [ ] **Step 4: Implement static storage mappings and JSON chunking**

Use static identifier maps, never user-provided SQL identifiers:

```ts
const REFERENCE_RESTORE_COLUMNS = [
  ["id", "id"],
  ["title", "title"],
  ["source_url", "sourceUrl"],
  ["canonical_url", "canonicalUrl"],
  ["site_name", "siteName"],
  ["author", "author"],
  ["preview_url", "previewUrl"],
  ["media_type", "mediaType"],
  ["asset_category", "assetCategory"],
  ["source_category", "sourceCategory"],
  ["style_tags", "styleTags"],
  ["use_tags", "useTags"],
  ["mechanic_tags", "mechanicTags"],
  ["mood_tags", "moodTags"],
  ["visual_language_tags", "visualLanguageTags"],
  ["license_status", "licenseStatus"],
  ["attribution_text", "attributionText"],
  ["public_status", "publicStatus"],
  ["quality_status", "qualityStatus"],
  ["rating", "rating"],
  ["reference_value_score", "referenceValueScore"],
  ["transformability_score", "transformabilityScore"],
  ["copyright_risk_score", "copyrightRiskScore"],
  ["production_readiness_score", "productionReadinessScore"],
  ["inspiration_points", "inspirationPoints"],
  ["inspiration_entries", "inspirationEntries"],
  ["deconstruction_notes", "deconstructionNotes"],
  ["transformation_ideas", "transformationIdeas"],
  ["avoid_copying_notes", "avoidCopyingNotes"],
  ["related_original_asset", "relatedOriginalAsset"],
  ["created_at", "createdAt"],
  ["updated_at", "updatedAt"],
] as const;
```

Add complete equivalent maps for all synthesis and relation columns. Convert domain records through `referenceRecordToRow` and `synthesisRecordToRow`; serialize relation snapshots exactly once. Chunk normalized row arrays by UTF-8 byte length below 1,000,000 bytes.

- [ ] **Step 5: Generate deterministic JSON1 SQL**

Build SQL from only the static maps:

```ts
function buildJsonInsertSelect(
  table: string,
  columns: readonly (readonly [string, string])[],
  conflict: "update" | "none",
) {
  const names = columns.map(([column]) => `"${column}"`).join(",");
  const values = columns.map(([, key]) =>
    `json_extract(value, '$.${key}')`,
  ).join(",");
  const update = columns
    .filter(([column]) => column !== "id")
    .map(([column]) => `"${column}" = excluded."${column}"`)
    .join(",");
  return `INSERT INTO "${table}" (${names})
    SELECT ${values} FROM json_each(?) WHERE true
    ${conflict === "update" ? `ON CONFLICT("id") DO UPDATE SET ${update}` : ""}`;
}
```

The relation delete statement must be:

```sql
DELETE FROM "synthesis_references"
WHERE "synthesis_id" IN (SELECT value FROM json_each(?))
```

Return `{ sql, params: [jsonChunk] }` operations and reject if count exceeds 40.

- [ ] **Step 6: Write failing restore guard and orchestration tests**

Cover:

- Correct digests call one native `batch()` with generated prepared statements.
- Changed backup digest returns `{ ok: false, code: "backup_changed" }`.
- Changed state digest returns `{ ok: false, code: "preview_stale" }`.
- Overwrites with `confirm_overwrite: false` return `overwrite_confirmation_required`.
- Zero-overwrite restore does not require the checkbox.
- Native batch rejection returns `restore_failed` and does not report success.

Use this public contract:

```ts
export type BackupRestoreRequest = {
  backup: RefForgeBackupV1;
  backup_digest: string;
  state_digest: string;
  confirm_overwrite: boolean;
};

export type BackupRestoreResult =
  | { ok: true; preview: BackupPreview }
  | {
      ok: false;
      code:
        | "backup_changed"
        | "preview_stale"
        | "overwrite_confirmation_required"
        | "restore_failed";
    };
```

- [ ] **Step 7: Implement guarded native D1 batch restore**

`restoreBackup` must:

1. Reparse the backup.
2. Recompute backup digest.
3. Read current inventory and recompute preview/state digest immediately before write.
4. Require overwrite confirmation when `references.overwrite + syntheses.overwrite > 0`.
5. Build bounded operations.
6. Prepare every statement with `getD1Binding().prepare(sql).bind(...params)`.
7. Call `getD1Binding().batch(statements)` exactly once.
8. Return the pre-write preview counts only after batch success.

- [ ] **Step 8: Execute the production SQL contract against real SQLite**

Create `tests/backup-restore-sqlite.test.ts`. Apply migrations 0000, 0001 and 0002 to `DatabaseSync(":memory:")`. Execute the exact `BackupRestoreOperation` SQL and params inside a transaction:

```ts
function executeOperations(db: DatabaseSync, operations: BackupRestoreOperation[]) {
  db.exec("BEGIN");
  try {
    for (const operation of operations) {
      db.prepare(operation.sql).run(...operation.params as SQLInputValue[]);
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
```

Prove:

- Two references and one synthesis restore with exact timestamps.
- Existing same-ID records are overwritten.
- Current-only reference and synthesis remain.
- Imported synthesis relations are replaced in positions 0 and 1.
- A null-source relation retains its snapshot.
- Injecting an invalid relation after earlier operations causes rollback and leaves all three tables byte-for-byte unchanged.

Run:

```powershell
npx vitest run --config vitest.config.ts tests/backup-db.test.ts tests/backup-restore-sqlite.test.ts
```

Expected: PASS.

- [ ] **Step 9: Commit Task 3**

```powershell
git add db/index.ts lib/backup-db.ts tests/backup-db.test.ts tests/backup-restore-sqlite.test.ts
git commit -m "feat: 增加原子备份恢复 / add atomic backup restore"
```

---

### Task 4: Export, Preview And Restore API

**Files:**
- Create: `app/api/backup/request.ts`
- Create: `app/api/backup/route.ts`
- Create: `app/api/backup/preview/route.ts`
- Create: `app/api/backup/restore/route.ts`
- Create: `tests/backup-routes.test.ts`

**Interfaces:**
- Consumes: `createFullBackup`, `previewBackup`, `restoreBackup`, `parseRefForgeBackup`.
- Produces:
  - `GET /api/backup`
  - `POST /api/backup/preview`
  - `POST /api/backup/restore`
  - structured `{ code, path, message }` errors.

- [ ] **Step 1: Write failing route contract tests**

Mock `lib/backup-db.ts` and cover:

```ts
it("exports a complete Backup v1", async () => {
  vi.mocked(createFullBackup).mockResolvedValue(makeBackupFixture());
  const response = await exportRoute.GET();
  expect(response.status).toBe(200);
  await expect(response.json()).resolves.toEqual(makeBackupFixture());
});

it("previews without calling restore", async () => {
  vi.mocked(previewBackup).mockResolvedValue(preview);
  const response = await previewRoute.POST(jsonRequest({ backup: makeBackupFixture() }));
  expect(response.status).toBe(200);
  expect(restoreBackup).not.toHaveBeenCalled();
});
```

Add malformed JSON, body above the bounded request limit, missing `backup`, unknown version, validation issues, backup changed, preview stale, overwrite confirmation, restore failed and missing-table cases.

- [ ] **Step 2: Run route tests and capture RED**

```powershell
npx vitest run --config vitest.config.ts tests/backup-routes.test.ts
```

Expected: FAIL because backup routes do not exist.

- [ ] **Step 3: Implement a streaming bounded JSON reader**

In `app/api/backup/request.ts`, read `request.body` with a reader and stop after `MAX_BACKUP_BYTES + 131_072` bytes:

```ts
export async function readBoundedJson(request: Request) {
  const reader = request.body?.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (reader) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BACKUP_REQUEST_BYTES) {
      await reader.cancel();
      return { ok: false as const, code: "backup_too_large" as const };
    }
    chunks.push(value);
  }
  // Merge chunks, decode UTF-8 and JSON.parse with invalid_json mapping.
}
```

Do not rely only on `Content-Length`.

- [ ] **Step 4: Implement GET export**

`GET /api/backup` calls `createFullBackup()` and returns the Backup v1 object with:

```ts
return Response.json(backup, {
  headers: {
    "cache-control": "no-store",
    "content-disposition": `attachment; filename="${createBackupFilename(backup.exported_at)}"`,
  },
});
```

Map unavailable tables/bindings to a stable `database_unavailable` response without leaking raw database messages.

- [ ] **Step 5: Implement preview route**

Accept only `{ backup }`. Parse through `parseRefForgeBackup`; on validation failure return:

```json
{
  "code": "validation_failed",
  "issues": [
    {
      "code": "validation_failed",
      "path": "data.references[0].source_url",
      "message": "source_url must be an absolute URL"
    }
  ]
}
```

Return status 400 for invalid JSON/format/version/validation and 413 for size limits.

- [ ] **Step 6: Implement restore route**

Accept only:

```ts
type RestoreBody = {
  backup: unknown;
  backup_digest: string;
  state_digest: string;
  confirm_overwrite: boolean;
};
```

Map `backup_changed`, `preview_stale` and `overwrite_confirmation_required` to 409. Map rollback-safe `restore_failed` to 500 with no raw SQL details. Return `{ restored: true, preview }` only after `restoreBackup` succeeds.

- [ ] **Step 7: Run route and full data tests**

```powershell
npx vitest run --config vitest.config.ts tests/backup-routes.test.ts tests/backup.test.ts tests/backup-db.test.ts tests/backup-restore-sqlite.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit Task 4**

```powershell
git add app/api/backup lib/backup.ts lib/backup-db.ts tests/backup-routes.test.ts
git commit -m "feat: 提供备份恢复接口 / expose backup restore API"
```

---

### Task 5: Data Management State And Dialog

**Files:**
- Create: `app/data-management/data-management-state.ts`
- Create: `app/data-management/data-management-dialog.tsx`
- Create: `tests/data-management-state.test.ts`
- Create: `tests/data-management-components.test.ts`
- Modify: `lib/localization.ts`
- Modify: `tests/localization.test.ts`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Consumes: Backup v1 API and device preference types.
- Produces:
  - `DataManagementDialog`
  - `DataManagementState`
  - `dataManagementReducer`
  - `canSubmitRestore`
  - complete Chinese/English copy.

- [ ] **Step 1: Install the approved icon dependency**

Run:

```powershell
npm install lucide-react
```

Expected: `package.json` and `package-lock.json` add one production dependency. Use `DatabaseBackup`, `Download`, `Upload` and `X`; do not draw custom SVG icons.

- [ ] **Step 2: Write failing pure dialog-state tests**

Create exact tests for:

- Closed state resets selected file and preview.
- Selecting a new file invalidates an old preview/digests.
- Preview loading disables restore.
- Overwrite count greater than zero requires confirmation.
- Zero overwrite does not require the checkbox.
- Device preference restore is false by default even when present.
- Restore busy disables close and duplicate submit.
- API failure preserves the preview and file for retry.
- Restore success records separate data and preference outcomes.

Use:

```ts
expect(canSubmitRestore({
  ...previewReadyState,
  overwriteConfirmed: false,
  preview: { ...preview, references: { create: 0, overwrite: 1, preserve: 0 } },
})).toBe(false);
```

- [ ] **Step 3: Run state tests and capture RED**

```powershell
npx vitest run --config vitest.config.ts tests/data-management-state.test.ts
```

Expected: FAIL because the state module does not exist.

- [ ] **Step 4: Implement the pure reducer and submit guards**

Define:

```ts
export type DataManagementState = {
  tab: "backup" | "restore";
  includePreferences: boolean;
  restorePreferences: boolean;
  selectedFile: { name: string; size: number } | null;
  parsedBackup: RefForgeBackupV1 | null;
  preview: BackupPreview | null;
  overwriteConfirmed: boolean;
  status: "idle" | "loading_backup" | "previewing" | "ready" | "restoring" | "success" | "error";
  errorCode: string | null;
  preferenceResult: "not_requested" | "applied" | "failed";
};
```

Actions must explicitly cover open/reset, tab, export preference, file selected, preview started/succeeded/failed, overwrite confirmation, restore preference, restore started/succeeded/failed and close.

- [ ] **Step 5: Add localization before component markup**

Add keys for:

- Data management title/open/close.
- Backup and restore tabs.
- Full backup, include device preferences and transparent JSON warning.
- File choose/change, file metadata and version.
- Create/overwrite/preserve/relation/historical counts.
- Restore device preferences.
- Overwrite acknowledgement.
- Unsaved draft acknowledgement.
- Preview, restore, retry, success, partial preference failure.
- Every structured backup error code.

Extend `tests/localization.test.ts` to enumerate the new keys in both `zh` and `en`, and map each error code to non-empty safe copy.

- [ ] **Step 6: Write failing component source contracts**

In `tests/data-management-components.test.ts`, assert that the new component:

- Imports lucide icons.
- Uses `role="dialog"` or native `<dialog>`.
- Has tab semantics, file input restricted to `.json`, a live status region and overwrite checkbox.
- Calls `/api/backup`, `/api/backup/preview` and `/api/backup/restore`.
- Never renders `JSON.stringify(parsedBackup)` into JSX.
- Disables close while restoring.
- Revokes every object URL used for download.

- [ ] **Step 7: Implement `DataManagementDialog`**

Use this public prop contract:

```ts
export type DataManagementDialogProps = {
  open: boolean;
  language: Language;
  devicePreferences: BackupDevicePreferences;
  hasUnsavedDraft: boolean;
  businessMutationBusy: boolean;
  onClose: () => void;
  onRestoreCommitted: (
    preferences: BackupDevicePreferences | null,
  ) => Promise<"applied" | "failed" | "not_requested">;
};
```

Required behavior:

- Opening focuses the title or active tab.
- Escape closes only when not restoring.
- Closing returns focus to the trigger.
- Backup click fetches fresh `/api/backup`, optionally attaches normalized device preferences, downloads and revokes the object URL.
- File selection reads at most 5 MB, parses JSON locally, then sends `{ backup }` to preview.
- Restore sends the same parsed backup and returned digests.
- If `hasUnsavedDraft`, show a focused inline alertdialog and require explicit discard before sending restore.
- Call `onRestoreCommitted` only after server success.
- Show preference failure as partial success, not data failure.

- [ ] **Step 8: Run Task 5 tests**

```powershell
npx vitest run --config vitest.config.ts tests/data-management-state.test.ts tests/data-management-components.test.ts tests/localization.test.ts
```

Expected: PASS.

- [ ] **Step 9: Commit Task 5**

```powershell
git add app/data-management lib/localization.ts tests/data-management-state.test.ts tests/data-management-components.test.ts tests/localization.test.ts package.json package-lock.json
git commit -m "feat: 增加数据管理对话框 / add data management dialog"
```

---

### Task 6: Workspace Integration And Local Browser Acceptance

**Files:**
- Modify: `app/workspace/use-workspace-layout.ts`
- Modify: `app/synthesis/synthesis-workspace.tsx`
- Modify: `app/page.tsx`
- Modify: `app/globals.css`
- Modify: `tests/workspace-layout-components.test.ts`
- Modify: `tests/synthesis-workspace.test.ts`
- Modify: `tests/data-management-components.test.ts`
- Modify: `tests/localization.test.ts`
- Create: `docs/qa/2026-07-27-full-library-backup-restore.md`

**Interfaces:**
- Consumes: Task 5 dialog and Task 4 API.
- Produces: one root-owned data-management flow, reference/synthesis reload coordination and validated preference application.

- [ ] **Step 1: Write failing workspace integration contracts**

Add assertions that:

- `useWorkspaceLayout` returns `applyPreferences(preferences): boolean`.
- Reference toolbar renders `DataManagementDialog` trigger instead of legacy `exportLibraryJson`.
- Synthesis header receives and renders `onOpenDataManagement`.
- Synthesis workspace reports `{ dirty, busy }`.
- `restoreEpoch` aborts current synthesis reads, clears drafts and reloads summaries after restore.
- Page computes dirty state from add/edit reference drafts plus synthesis status.
- Page filters restored pinned IDs against the reloaded persisted reference IDs.
- Page has no import of `createReferenceJsonExport`.

- [ ] **Step 2: Run integration contracts and capture RED**

```powershell
npx vitest run --config vitest.config.ts tests/data-management-components.test.ts tests/workspace-layout-components.test.ts tests/synthesis-workspace.test.ts
```

Expected: FAIL on missing wiring and legacy export code.

- [ ] **Step 3: Expose safe external workspace preference application**

In `use-workspace-layout.ts`, add:

```ts
const applyPreferences = useCallback((next: WorkspaceLayoutPreferences) => {
  const normalized = parseWorkspaceLayoutPreferences(
    serializeWorkspaceLayoutPreferences(next),
  );
  try {
    window.localStorage.setItem(
      WORKSPACE_LAYOUT_STORAGE_KEY,
      serializeWorkspaceLayoutPreferences(normalized),
    );
    setPreferences(normalized);
    return true;
  } catch {
    return false;
  }
}, []);
```

Return it from the hook and test success/fallback source contracts.

- [ ] **Step 4: Report synthesis dirty/busy state and handle restore reload**

Extend `SynthesisWorkspaceProps`:

```ts
onOpenDataManagement: () => void;
onWorkspaceStatusChange: (status: { dirty: boolean; busy: boolean }) => void;
restoreEpoch: number;
```

Report changes through an effect. On a new `restoreEpoch`, abort list/detail controllers, clear pending confirmations and mutations, reset the draft, then reload the active filter. Add a data-management icon/text button to the synthesis header.

- [ ] **Step 5: Replace legacy page export with one root dialog**

In `app/page.tsx`:

- Remove `createReferenceJsonExport` and `exportLibraryJson`.
- Track `isDataManagementOpen`, synthesis status and `restoreEpoch`.
- Keep one trigger in the reference toolbar and pass the same open callback to synthesis.
- Treat a non-empty add draft, dirty reference edit or dirty synthesis draft as unsaved.
- Treat preview/save/delete/reference and synthesis mutations as business busy.
- Add a reusable async `reloadReferenceLibrary()` for initial load and post-restore refresh.
- On restore success, close add/edit/delete/comparison transient state, reload references, increment `restoreEpoch`, and preserve the selected ID only if it still exists.
- Restore pinned IDs only after intersecting them with reloaded persisted IDs.
- Apply workspace preferences through the hook method.
- Write both localStorage values before updating React state; return `"failed"` if either write throws.

- [ ] **Step 6: Add dialog and responsive CSS**

Add stable classes for overlay, dialog, title bar, tabs, backup summary, file metadata, diff grid, warnings, error list, confirmation row and sticky action footer.

Required CSS checks:

- Card radius no more than 8px.
- Dialog max width between 640px and 760px.
- Overlay and dialog do not create page-level overflow.
- At `max-width: 820px`, dialog fills available width and uses vertical summary/action layout.
- At 390px, controls fit within `calc(100vw - 24px)`.
- `prefers-reduced-motion: reduce` removes dialog transitions.
- Busy state does not change button dimensions.

- [ ] **Step 7: Run all automated gates before browser work**

```powershell
npm test
npm run typecheck
npm run lint
npm run build
```

Expected: all exit 0. Record exact test file/test counts in the QA document.

- [ ] **Step 8: Start the isolated local app**

Run:

```powershell
npm run dev -- --port 3013
```

Expected: vinext listens on `http://127.0.0.1:3013/` and returns HTTP 200.

- [ ] **Step 9: Complete local browser backup/restore acceptance**

Using the in-app browser or Chrome bound to the local app and a local D1 test path:

1. Open data management from reference view.
2. Export without preferences and inspect top-level Backup v1 keys.
3. Export with preferences and confirm pinned/layout values only.
4. Select a valid fixture and verify preview counts with zero writes.
5. Modify the fixture's same-ID records, restore and refresh.
6. Verify exact reference/synthesis fields, relation order and null-source snapshot.
7. Trigger stale preview by changing data before restore and confirm 409/re-preview.
8. Trigger unsaved reference and synthesis draft gates.
9. Verify Chinese and English.
10. Verify 1600x900, 1280x900 and 390x844 with document/body horizontal overflow 0.
11. Verify keyboard focus, Escape, busy close lock and console error 0.
12. Restore the local database and browser preferences to baseline.

Record exact identifiers, counts, viewport metrics and cleanup result in `docs/qa/2026-07-27-full-library-backup-restore.md`.

- [ ] **Step 10: Commit Task 6**

```powershell
git add app/page.tsx app/globals.css app/workspace/use-workspace-layout.ts app/synthesis/synthesis-workspace.tsx tests/workspace-layout-components.test.ts tests/synthesis-workspace.test.ts tests/data-management-components.test.ts tests/localization.test.ts docs/qa/2026-07-27-full-library-backup-restore.md
git commit -m "feat: 接入全库备份恢复 / integrate full-library backup restore"
```

---

### Task 7: Independent Review, Merge, Sites And Production Closure

**Files:**
- Modify: `AGENTS.md`
- Modify: `docs/qa/2026-07-27-full-library-backup-restore.md`
- Modify: `docs/progress/status.md`
- Modify: `docs/progress/timeline.md`
- Modify: `docs/progress/2026-07-27.md`
- Modify: `docs/superpowers/plans/2026-07-27-full-library-backup-restore.md`

**Interfaces:**
- Consumes: Tasks 1-6 reviewed feature branch.
- Produces: merged, pushed, deployed, production-verified Round 13 with zero QA residue and branch/worktree cleanup.

- [ ] **Step 1: Run task-level spec and quality reviews**

For each Task 1-6 commit range:

- Give one fresh reviewer the task requirements and diff range.
- Require an explicit spec-compliance verdict.
- Require a separate code-quality verdict.
- Fix every Critical or Important finding with a focused TDD commit.
- Re-run the covering focused tests and re-review.
- Record every important agent in the daily `Delegation Log`.

- [ ] **Step 2: Run a broad final review**

Review `git merge-base main HEAD..HEAD` for:

- Backup parser bypasses.
- Digest/state race handling.
- D1 query/parameter/statement-size limits.
- Partial restore paths.
- Snapshot or relation corruption.
- Raw error/credential leakage.
- Dirty-draft loss.
- Accessibility and responsive regressions.
- Missing cleanup or trace documentation.

Do not merge with unresolved Critical or Important findings.

- [ ] **Step 3: Run final feature-branch gates**

```powershell
npm test
npm run typecheck
npm run lint
npm run build
git diff --check main...HEAD
git status --short
```

Expected: all commands exit 0 and feature worktree is clean after evidence commit.

- [ ] **Step 4: Update local implementation evidence**

Set stage to `Round 13 implemented and locally verified; merge pending`. Record exact:

- Test files/test count.
- D1 JSON chunk maximum and statement count observed.
- SQLite rollback evidence.
- Browser file names, preview counts and restored IDs.
- Desktop/mobile overflow metrics.
- Console errors.
- Review verdicts.
- No-migration result.

Commit:

```powershell
git add AGENTS.md docs/qa/2026-07-27-full-library-backup-restore.md docs/progress/status.md docs/progress/timeline.md docs/progress/2026-07-27.md docs/superpowers/plans/2026-07-27-full-library-backup-restore.md
git commit -m "docs: 记录第十三轮实现验证 / record round 13 implementation verification"
```

- [ ] **Step 5: Finish the development branch**

From the main worktree:

```powershell
git checkout main
git merge --ff-only codex/round-13-backup-restore
npm test
npm run typecheck
npm run lint
npm run build
git push origin main
```

If GitHub HTTPS resets, verify DNS, 443 and auth separately, then use the already authenticated SSH remote URL for the same `main:main` push without changing `origin`.

- [ ] **Step 6: Build and deploy the exact merged source through Sites**

- Read `.openai/hosting.json` and reuse its exact project ID.
- Push the exact merged source state to the Sites repository.
- Build the archive from that exact commit.
- Save a new private Sites version with that source SHA.
- Deploy only the saved version.
- Inspect deployment until `succeeded`.
- Record source SHA, version ID, deployment ID and production URL.
- Confirm no migration is included or applied.

- [ ] **Step 7: Run authenticated production recovery batch**

Use a batch prefix such as `QA-R13-YYYYMMDD-HHMMSS` and perform through the real UI:

1. Record non-QA reference/synthesis IDs, counts and stable field digests.
2. Create two full QA references.
3. Create one full synthesis with both references in known order.
4. Pin one QA reference and set a non-default workspace layout.
5. Export Backup v1 with preferences.
6. Verify file format/version/counts and no credentials/media binary.
7. Edit both QA references, synthesis text/status and device preferences.
8. Select the saved backup and verify overwrite/preserve/relation preview counts.
9. Confirm overwrite and execute restore.
10. Reload and verify exact fields, original timestamps, relation order, snapshots and preferences.
11. Verify non-QA IDs, counts and stable field digests unchanged.
12. Delete the QA synthesis and two QA references.
13. Clear QA pin/layout changes and reset panels to `260/420`.
14. Reload and confirm QA prefix count 0, document/body overflow 0 at desktop and 390px, and console error 0.

One browser action must be followed by an independent state read before the next write. A timeout is not success evidence.

- [ ] **Step 8: Close documentation and cleanup**

- Set stage to `Round 13 complete; Round 14 design-ready`.
- Update all three progress documents and QA with exact production results.
- Commit and push final evidence.
- Remove `.worktrees/round-13-backup-restore`.
- Prune worktrees.
- Delete local and remote feature branch if present.
- Verify:

```powershell
git status --short --branch
git rev-parse main origin/main
git worktree list
git branch --all --list "*round-13-backup-restore*"
```

Expected: one clean synchronized `main`, no Round 13 branch/worktree and Sites production source recorded separately from later documentation-only commits.

## Definition Of Done

- [ ] New exports use only RefForge Backup v1.
- [ ] Backup includes complete references, syntheses, ordered relations and historical snapshots.
- [ ] Old reference-only JSON is rejected.
- [ ] Preview reports create/overwrite/preserve with zero writes.
- [ ] Restore preserves backup IDs/timestamps/snapshots and current backup-absent data.
- [ ] Backup/state digest changes block restore.
- [ ] JSON1 chunks remain under 1 MB and batch remains at or below 40 statements.
- [ ] Real SQLite proves exact SQL behavior and rollback.
- [ ] Optional pinned/layout preferences default off and round-trip when selected.
- [ ] Unsaved reference/synthesis drafts are protected.
- [ ] Chinese, English, keyboard, 1600px, 1280px and 390px pass.
- [ ] Tests, typecheck, lint, build, task reviews, final review and merged-main gates pass.
- [ ] Sites deploy succeeds with no migration.
- [ ] Production QA restores temporary data, preserves non-QA data and leaves zero residue.
- [ ] Three progress documents, QA, AGENTS, plan, GitHub main, Sites source and branch cleanup agree.
