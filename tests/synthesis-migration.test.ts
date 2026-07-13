import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";

function applyMigration(db: DatabaseSync, path: string) {
  const sql = readFileSync(path, "utf8");
  for (const statement of sql.split("--> statement-breakpoint")) {
    if (statement.trim()) db.exec(statement);
  }
}

describe("synthesis migration", () => {
  it("preserves snapshots after reference delete and cascades synthesis delete", () => {
    const db = new DatabaseSync(":memory:");
    db.exec("PRAGMA foreign_keys = ON");
    applyMigration(db, "drizzle/0000_melodic_colleen_wing.sql");
    applyMigration(db, "drizzle/0001_massive_zodiak.sql");
    applyMigration(db, "drizzle/0002_multi_reference_synthesis.sql");

    db.exec(`INSERT INTO \`references\` (id,title,source_url,media_type,asset_category,license_status,public_status,created_at,updated_at)
      VALUES ('ref-1','One','https://example.com','image','prop','private_reference','private','2026-07-13','2026-07-13')`);
    db.exec(`INSERT INTO syntheses (id,title,status,created_at,updated_at)
      VALUES ('syn-1','Study','draft','2026-07-13','2026-07-13')`);
    db.exec(`INSERT INTO synthesis_references (id,synthesis_id,reference_id,position,snapshot_json,snapshot_updated_at)
      VALUES ('link-1','syn-1','ref-1',0,'{"schema_version":1}','2026-07-13')`);

    db.exec("DELETE FROM `references` WHERE id = 'ref-1'");
    expect(db.prepare("SELECT reference_id, snapshot_json FROM synthesis_references WHERE id = 'link-1'").get()).toEqual({
      reference_id: null,
      snapshot_json: '{"schema_version":1}',
    });

    db.exec("DELETE FROM syntheses WHERE id = 'syn-1'");
    expect(db.prepare("SELECT COUNT(*) AS count FROM synthesis_references").get()).toEqual({ count: 0 });
    db.close();
  });
});
