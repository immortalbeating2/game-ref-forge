import { readFileSync } from "node:fs";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";

import { describe, expect, it, vi } from "vitest";

vi.mock("../db", () => ({ getDb: vi.fn() }));

import { referenceRecordToStorageRow } from "../lib/reference-db";
import { synthesisRecordToStorageRow } from "../lib/synthesis-db";
import { makeReference, makeSynthesis } from "./fixtures/backup";

function applyMigration(db: DatabaseSync, path: string) {
  const migration = readFileSync(path, "utf8");
  for (const statement of migration.split("--> statement-breakpoint")) {
    if (statement.trim()) db.exec(statement);
  }
}

function insertRow(db: DatabaseSync, table: "references" | "syntheses", row: Record<string, unknown>) {
  const keys = Object.keys(row);
  const names = keys.map((key) => `"${key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)}"`).join(",");
  const placeholders = keys.map(() => "?").join(",");
  db.prepare(`INSERT INTO "${table}" (${names}) VALUES (${placeholders})`).run(
    ...keys.map((key) => row[key]) as SQLInputValue[],
  );
}

describe("backup storage mappers on SQLite", () => {
  it("persists exact JSON values and reads table rows in stable id order", () => {
    const db = new DatabaseSync(":memory:");
    applyMigration(db, "drizzle/0000_melodic_colleen_wing.sql");
    applyMigration(db, "drizzle/0001_massive_zodiak.sql");
    applyMigration(db, "drizzle/0002_multi_reference_synthesis.sql");

    const first = makeReference({
      id: "ref-2",
      style_tags: ["  exact value  "],
      inspiration_entries: [{
        ...makeReference().inspiration_entries[0],
        id: " exact-entry-id ",
      }],
    });
    const second = makeReference({ id: "ref-1" });
    insertRow(db, "references", referenceRecordToStorageRow(first) as Record<string, unknown>);
    insertRow(db, "references", referenceRecordToStorageRow(second) as Record<string, unknown>);

    const referenceRows = db.prepare("SELECT id, style_tags, inspiration_entries FROM \"references\" ORDER BY id").all() as Array<Record<string, string>>;
    expect(referenceRows.map(({ id }) => id)).toEqual(["ref-1", "ref-2"]);
    expect(referenceRows[1].style_tags).toBe(JSON.stringify(first.style_tags));
    expect(referenceRows[1].inspiration_entries).toBe(JSON.stringify(first.inspiration_entries));

    insertRow(db, "syntheses", synthesisRecordToStorageRow(makeSynthesis({ id: "syn-2" })) as Record<string, unknown>);
    insertRow(db, "syntheses", synthesisRecordToStorageRow(makeSynthesis({ id: "syn-1" })) as Record<string, unknown>);
    const synthesisRows = db.prepare("SELECT id FROM syntheses ORDER BY id").all() as Array<{ id: string }>;
    expect(synthesisRows.map(({ id }) => id)).toEqual(["syn-1", "syn-2"]);
    db.close();
  });
});
