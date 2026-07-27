import { describe, expect, it } from "vitest";
import {
  MAX_BACKUP_BYTES,
  MAX_BACKUP_REFERENCES,
  MAX_BACKUP_RELATIONS,
  MAX_BACKUP_SYNTHESES,
  canonicalBackupJson,
  createBackupDigest,
  createBackupFilename,
  parseRefForgeBackup,
  withBackupPreferences,
} from "../lib/backup";
import { makeBackupFixture, makeReference, makeSynthesis } from "./fixtures/backup";

function expectInvalid(value: unknown, path: string) {
  const result = parseRefForgeBackup(value);
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.issues.some((issue) => issue.path === path)).toBe(true);
}

describe("Backup v1 domain contract", () => {
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

  it.each([
    ["reference", (backup: ReturnType<typeof makeBackupFixture>) => ({
      ...backup,
      data: { ...backup.data, references: [backup.data.references[0], backup.data.references[0]] },
    }), "data.references[1].id"],
    ["synthesis", (backup: ReturnType<typeof makeBackupFixture>) => ({
      ...backup,
      data: { ...backup.data, syntheses: [backup.data.syntheses[0], backup.data.syntheses[0]] },
    }), "data.syntheses[1].id"],
    ["relation", (backup: ReturnType<typeof makeBackupFixture>) => ({
      ...backup,
      data: {
        ...backup.data,
        synthesis_references: [backup.data.synthesis_references[0], backup.data.synthesis_references[0]],
      },
    }), "data.synthesis_references[1].id"],
  ])("rejects duplicate %s ids", (_label, mutate, path) => {
    expectInvalid(mutate(makeBackupFixture()), path);
  });

  it("requires ordered, complete relation positions for every synthesis", () => {
    const backup = makeBackupFixture();
    backup.data.synthesis_references[1].position = 2;

    expectInvalid(backup, "data.synthesis_references[1].position");
  });

  it("reports a non-contiguous position at its original global relation index", () => {
    const backup = makeBackupFixture();
    const secondSynthesis = makeSynthesis({ id: "syn-2", title: "Second direction" });
    backup.data.syntheses.push(secondSynthesis);
    backup.data.synthesis_references.push(
      {
        ...backup.data.synthesis_references[0],
        id: "link-3",
        synthesis_id: secondSynthesis.id,
        position: 0,
      },
      {
        ...backup.data.synthesis_references[1],
        id: "link-4",
        synthesis_id: secondSynthesis.id,
        position: 2,
      },
    );

    expectInvalid(backup, "data.synthesis_references[3].position");
  });

  it.each([1, 5])("requires two to four relations per synthesis", (count) => {
    const backup = makeBackupFixture();
    backup.data.synthesis_references = Array.from({ length: count }, (_, index) => ({
      ...backup.data.synthesis_references[index % 2],
      id: `link-${index}`,
      position: index,
      reference_id: `ref-${(index % 2) + 1}`,
      snapshot: backup.data.synthesis_references[index % 2].snapshot,
    }));

    expectInvalid(backup, "data.synthesis_references");
  });

  it("rejects duplicate available reference relations but permits multiple historical relations", () => {
    const duplicateAvailable = makeBackupFixture();
    duplicateAvailable.data.synthesis_references[1] = {
      ...duplicateAvailable.data.synthesis_references[1],
      reference_id: "ref-1",
      snapshot: duplicateAvailable.data.synthesis_references[0].snapshot,
    };
    expectInvalid(duplicateAvailable, "data.synthesis_references[1].reference_id");

    const multipleHistorical = makeBackupFixture();
    multipleHistorical.data.synthesis_references = [
      ...multipleHistorical.data.synthesis_references,
      {
        ...multipleHistorical.data.synthesis_references[1],
        id: "link-3",
        position: 2,
      },
    ];
    expect(parseRefForgeBackup(multipleHistorical).ok).toBe(true);
  });

  it.each([
    ["synthesis", (backup: ReturnType<typeof makeBackupFixture>) => ({
      ...backup,
      data: {
        ...backup.data,
        synthesis_references: [{ ...backup.data.synthesis_references[0], synthesis_id: "missing" }],
      },
    }), "data.synthesis_references[0].synthesis_id"],
    ["reference", (backup: ReturnType<typeof makeBackupFixture>) => ({
      ...backup,
      data: {
        ...backup.data,
        synthesis_references: [{ ...backup.data.synthesis_references[0], reference_id: "missing" }],
      },
    }), "data.synthesis_references[0].reference_id"],
  ])("rejects dangling relation %s ids", (_label, mutate, path) => {
    expectInvalid(mutate(makeBackupFixture()), path);
  });

  it("rejects relation snapshots that do not match available references", () => {
    const backup = makeBackupFixture();
    backup.data.synthesis_references[0].snapshot.reference_id = "ref-2";

    expectInvalid(backup, "data.synthesis_references[0].snapshot.reference_id");
  });

  it.each([
    ["timestamp", "reference_updated_at", "invalid", "data.synthesis_references[1].snapshot.reference_updated_at"],
    ["blank id", "reference_id", "", "data.synthesis_references[1].snapshot.reference_id"],
    ["oversized id", "reference_id", "x".repeat(201), "data.synthesis_references[1].snapshot.reference_id"],
  ])("rejects a historical snapshot with an invalid %s", (_label, field, value, path) => {
    const backup = makeBackupFixture();
    Object.assign(backup.data.synthesis_references[1].snapshot, { [field]: value });

    expectInvalid(backup, path);
  });

  it.each([
    ["export", (backup: ReturnType<typeof makeBackupFixture>) => ({ ...backup, exported_at: "invalid" }), "exported_at"],
    ["reference", (backup: ReturnType<typeof makeBackupFixture>) => ({
      ...backup,
      data: { ...backup.data, references: [{ ...backup.data.references[0], updated_at: "invalid" }] },
    }), "data.references[0].updated_at"],
    ["relation", (backup: ReturnType<typeof makeBackupFixture>) => ({
      ...backup,
      data: {
        ...backup.data,
        synthesis_references: [{ ...backup.data.synthesis_references[0], snapshot_updated_at: "invalid" }],
      },
    }), "data.synthesis_references[0].snapshot_updated_at"],
  ])("rejects invalid %s timestamps", (_label, mutate, path) => {
    expectInvalid(mutate(makeBackupFixture()), path);
  });

  it.each([
    ["2026-02-29T00:00:00.000Z", false],
    ["2026-02-31T00:00:00.000Z", false],
    ["2024-02-29T00:00:00.000Z", true],
    ["2026-07-27T08:00:00+08:00", true],
    ["2026-07-27T08:00:00-05:30", true],
  ])("validates calendar dates and timezone offsets for %s", (exportedAt, valid) => {
    const backup = makeBackupFixture();
    backup.exported_at = exportedAt;

    expect(parseRefForgeBackup(backup).ok).toBe(valid);
  });

  it.each(["references", "syntheses", "synthesis_references"] as const)(
    "reports a non-array data.%s as validation_failed",
    (field) => {
      const backup = makeBackupFixture();
      const malformed = {
        ...backup,
        data: { ...backup.data, [field]: { invalid: true } },
      };
      const result = parseRefForgeBackup(malformed);

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.issues.some((entry) =>
        entry.path === `data.${field}` && entry.code === "validation_failed",
      )).toBe(true);
    },
  );

  it("returns a structured validation failure for deeply nested malformed JSON", () => {
    let deeplyNested: unknown = "leaf";
    for (let depth = 0; depth < 10_000; depth += 1) deeplyNested = { next: deeplyNested };
    const backup = makeBackupFixture();
    const malformed = {
      ...backup,
      data: { ...backup.data, references: deeplyNested },
    };

    expect(() => parseRefForgeBackup(malformed)).not.toThrow();
    const result = parseRefForgeBackup(malformed);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues[0].code).toBe("validation_failed");
  });

  it.each([
    ["enum", (backup: ReturnType<typeof makeBackupFixture>) => ({
      ...backup,
      data: { ...backup.data, references: [{ ...backup.data.references[0], media_type: "invalid" }] },
    }), "data.references[0]"],
    ["score", (backup: ReturnType<typeof makeBackupFixture>) => ({
      ...backup,
      data: { ...backup.data, references: [{ ...backup.data.references[0], rating: 6 }] },
    }), "data.references[0]"],
    ["snapshot", (backup: ReturnType<typeof makeBackupFixture>) => ({
      ...backup,
      data: {
        ...backup.data,
        synthesis_references: [{
          ...backup.data.synthesis_references[0],
          snapshot: { ...backup.data.synthesis_references[0].snapshot, scores: { rating: "5" } },
        }],
      },
    }), "data.synthesis_references[0].snapshot"],
  ])("rejects invalid %s domain values", (_label, mutate, path) => {
    expectInvalid(mutate(makeBackupFixture()), path);
  });

  it.each([
    "rating",
    "reference_value_score",
    "transformability_score",
    "copyright_risk_score",
    "production_readiness_score",
  ] as const)("rejects a fractional reference %s", (field) => {
    const backup = makeBackupFixture();
    backup.data.references[0][field] = 1.5;

    expectInvalid(backup, "data.references[0]");
  });

  it.each([
    "rating",
    "reference_value_score",
    "transformability_score",
    "copyright_risk_score",
    "production_readiness_score",
  ] as const)("rejects a fractional snapshot %s", (field) => {
    const backup = makeBackupFixture();
    backup.data.synthesis_references[0].snapshot.scores[field] = 1.5;

    expectInvalid(backup, "data.synthesis_references[0].snapshot");
  });

  it("rejects count limits before accepting records", () => {
    const backup = makeBackupFixture();
    expectInvalid({ ...backup, data: { ...backup.data, references: Array(MAX_BACKUP_REFERENCES + 1).fill(makeReference()) } }, "data.references");
    expectInvalid({ ...backup, data: { ...backup.data, syntheses: Array(MAX_BACKUP_SYNTHESES + 1).fill(makeSynthesis()) } }, "data.syntheses");
    expectInvalid({ ...backup, data: { ...backup.data, synthesis_references: Array(MAX_BACKUP_RELATIONS + 1).fill(backup.data.synthesis_references[0]) } }, "data.synthesis_references");
  });

  it("accepts canonical JSON at 5 MB and rejects one byte above it", () => {
    const atLimit = makeBackupFixture();
    const originalTitle = atLimit.data.references[0].title;
    const currentBytes = new TextEncoder().encode(canonicalBackupJson(atLimit)).byteLength;
    atLimit.data.references[0].title = "x".repeat(MAX_BACKUP_BYTES - currentBytes + originalTitle.length);

    expect(new TextEncoder().encode(canonicalBackupJson(atLimit)).byteLength).toBe(MAX_BACKUP_BYTES);
    expect(parseRefForgeBackup(atLimit).ok).toBe(true);

    atLimit.data.references[0].title += "x";
    const result = parseRefForgeBackup(atLimit);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues[0].code).toBe("backup_too_large");
  });

  it("creates stable digests for key order but retains array order", async () => {
    const backup = makeBackupFixture();
    const reorderedKeys = {
      preferences: backup.preferences,
      data: backup.data,
      app: backup.app,
      exported_at: backup.exported_at,
      schema_version: backup.schema_version,
      format: backup.format,
    };
    const reversedReferences = { ...backup, data: { ...backup.data, references: [...backup.data.references].reverse() } };
    const reversedRelations = { ...backup, data: { ...backup.data, synthesis_references: [...backup.data.synthesis_references].reverse() } };

    await expect(createBackupDigest(backup)).resolves.toBe(await createBackupDigest(reorderedKeys));
    await expect(createBackupDigest(backup)).resolves.not.toBe(await createBackupDigest(reversedReferences));
    await expect(createBackupDigest(backup)).resolves.not.toBe(await createBackupDigest(reversedRelations));
  });

  it("keeps preferences opt-in and normalizes stored preference contracts", () => {
    const backup = makeBackupFixture();
    expect(backup.preferences).toBeNull();

    expect(withBackupPreferences(backup, {
      pinned_reference_ids: ["ref-1", "", "ref-2", "ref-1"],
      workspace_layout: {
        version: 1,
        leftWidth: 999,
        rightWidth: 100,
        leftCollapsed: true,
        rightCollapsed: false,
      },
    }).preferences).toEqual({
      pinned_reference_ids: ["ref-1", "ref-2"],
      workspace_layout: {
        version: 1,
        leftWidth: 360,
        rightWidth: 340,
        leftCollapsed: true,
        rightCollapsed: false,
      },
    });
  });

  it("rejects open device preferences and creates a safe dated filename", () => {
    const backup = makeBackupFixture();
    expectInvalid({
      ...backup,
      preferences: {
        pinned_reference_ids: [],
        workspace_layout: { version: 1, leftWidth: 260, rightWidth: 420, leftCollapsed: false, rightCollapsed: false },
        extra: true,
      },
    }, "preferences");
    expect(createBackupFilename("2026-07-27T12:00:00.000Z")).toBe("ref-forge-backup-v1-2026-07-27.json");
  });
});
