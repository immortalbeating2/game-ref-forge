import { readFileSync } from "node:fs";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";

import type { SQLWrapper } from "drizzle-orm";
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core";
import { describe, expect, it, vi } from "vitest";

vi.mock("../db", () => ({ getDb: vi.fn() }));

import {
  buildRefreshRelationCasCondition,
  buildRefreshSynthesisCasCondition,
} from "../lib/synthesis-db";

const dialect = new SQLiteSyncDialect();

function applyMigration(db: DatabaseSync, path: string) {
  const migration = readFileSync(path, "utf8");
  for (const statement of migration.split("--> statement-breakpoint")) {
    if (statement.trim()) db.exec(statement);
  }
}

function compileCondition(expression: SQLWrapper) {
  return dialect.sqlToQuery(expression.getSQL());
}

function runWithParams(
  db: DatabaseSync,
  sql: string,
  params: unknown[],
) {
  return db.prepare(sql).run(...params as SQLInputValue[]);
}

describe("synthesis refresh CAS on SQLite", () => {
  it("keeps a newer snapshot from an older refresh and updates both timestamps atomically", () => {
    const db = new DatabaseSync(":memory:");
    db.exec("PRAGMA foreign_keys = ON");
    applyMigration(db, "drizzle/0000_melodic_colleen_wing.sql");
    applyMigration(db, "drizzle/0001_massive_zodiak.sql");
    applyMigration(db, "drizzle/0002_multi_reference_synthesis.sql");
    db.exec(`INSERT INTO \`references\` (id,title,source_url,media_type,asset_category,license_status,public_status,created_at,updated_at)
      VALUES ('ref-1','One','https://example.com','image','prop','private_reference','private','created','source-a')`);
    db.exec(`INSERT INTO syntheses (id,title,status,created_at,updated_at)
      VALUES ('syn-1','Study','draft','created','synthesis-old')`);
    db.exec(`INSERT INTO synthesis_references (id,synthesis_id,reference_id,position,snapshot_json,snapshot_updated_at)
      VALUES ('link-1','syn-1','ref-1',0,'snapshot-old','snapshot-time-old')`);

    const staleCondition = compileCondition(buildRefreshRelationCasCondition({
      synthesisId: "syn-1",
      relationId: "link-1",
      referenceId: "ref-1",
      previousSnapshotJson: "snapshot-old",
      previousSnapshotUpdatedAt: "snapshot-time-old",
      referenceUpdatedAt: "source-a",
    }));
    db.exec("UPDATE synthesis_references SET snapshot_json = 'snapshot-newer', snapshot_updated_at = 'snapshot-time-newer' WHERE id = 'link-1'");
    db.exec("UPDATE syntheses SET updated_at = 'synthesis-newer' WHERE id = 'syn-1'");

    const staleWrite = runWithParams(
      db,
      `UPDATE synthesis_references SET snapshot_json = ?, snapshot_updated_at = ? WHERE ${staleCondition.sql}`,
      ["snapshot-stale", "snapshot-time-stale", ...staleCondition.params],
    );
    expect(staleWrite.changes).toBe(0);
    expect(db.prepare("SELECT snapshot_json, snapshot_updated_at FROM synthesis_references WHERE id = 'link-1'").get()).toEqual({
      snapshot_json: "snapshot-newer",
      snapshot_updated_at: "snapshot-time-newer",
    });

    db.exec("UPDATE synthesis_references SET snapshot_json = 'snapshot-old', snapshot_updated_at = 'snapshot-time-old' WHERE id = 'link-1'");
    db.exec("UPDATE syntheses SET updated_at = 'synthesis-old' WHERE id = 'syn-1'");
    const relationCondition = compileCondition(buildRefreshRelationCasCondition({
      synthesisId: "syn-1",
      relationId: "link-1",
      referenceId: "ref-1",
      previousSnapshotJson: "snapshot-old",
      previousSnapshotUpdatedAt: "snapshot-time-old",
      referenceUpdatedAt: "source-a",
    }));
    const synthesisCondition = compileCondition(buildRefreshSynthesisCasCondition({
      synthesisId: "syn-1",
      relationId: "link-1",
      referenceId: "ref-1",
      snapshotJson: "snapshot-current",
      snapshotUpdatedAt: "refresh-time",
    }));

    db.exec("BEGIN");
    const rolledBackRelation = runWithParams(
      db,
      `UPDATE synthesis_references SET snapshot_json = ?, snapshot_updated_at = ? WHERE ${relationCondition.sql}`,
      ["snapshot-current", "refresh-time", ...relationCondition.params],
    );
    expect(rolledBackRelation.changes).toBe(1);
    db.exec("ROLLBACK");
    expect(db.prepare("SELECT snapshot_json FROM synthesis_references WHERE id = 'link-1'").get()).toEqual({ snapshot_json: "snapshot-old" });
    expect(db.prepare("SELECT updated_at FROM syntheses WHERE id = 'syn-1'").get()).toEqual({ updated_at: "synthesis-old" });

    db.exec("BEGIN");
    const relationWrite = runWithParams(
      db,
      `UPDATE synthesis_references SET snapshot_json = ?, snapshot_updated_at = ? WHERE ${relationCondition.sql}`,
      ["snapshot-current", "refresh-time", ...relationCondition.params],
    );
    const synthesisWrite = runWithParams(
      db,
      `UPDATE syntheses SET updated_at = ? WHERE ${synthesisCondition.sql}`,
      ["refresh-time", ...synthesisCondition.params],
    );
    db.exec("COMMIT");

    expect({ relationChanges: relationWrite.changes, synthesisChanges: synthesisWrite.changes }).toEqual({
      relationChanges: 1,
      synthesisChanges: 1,
    });
    expect(db.prepare("SELECT snapshot_json, snapshot_updated_at FROM synthesis_references WHERE id = 'link-1'").get()).toEqual({
      snapshot_json: "snapshot-current",
      snapshot_updated_at: "refresh-time",
    });
    expect(db.prepare("SELECT updated_at FROM syntheses WHERE id = 'syn-1'").get()).toEqual({ updated_at: "refresh-time" });
    db.close();
  });
});
