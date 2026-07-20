# Round 11 多参考综合工作流实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让用户从参考库选择 2-4 条 reference，在独立工作区人工形成、持久化、编辑、导出和删除一份带历史快照的结构化综合稿。

**Architecture:** 在现有 vinext/React/D1 应用中新增 `syntheses` 主表和 `synthesis_references` 关联表，以纯函数维护领域校验、reference 快照、草稿和 Markdown，再由聚焦的数据访问层与 API routes 提供持久化。主页面只负责顶层视图和临时 reference 选择，综合稿列表与编辑状态封装在独立工作区组件中，避免继续膨胀现有 `app/page.tsx`。

**Tech Stack:** TypeScript 5.9、React 19、vinext、Drizzle ORM 0.45、Cloudflare D1、Vitest 4、CSS、Codex Browser/Chrome automation、Codex App Sites。

## Global Constraints

- 中文为默认界面，所有新增用户文案同时提供英文。
- 每份综合稿必须关联 2-4 条不重复 reference；保存后关联集合与顺序固定。
- 快照由服务端从当前 reference 生成，客户端不能提交可信快照。
- reference 更新不自动覆盖快照；只允许用户显式刷新单条快照。
- reference 删除后关联外键置空，历史快照必须继续可读。
- 综合稿状态仅为 `draft`、`actionable`、`archived`；新建默认 `draft`。
- 标题必填且最多 160 字符；目标资产最多 240 字符；其余文本字段各最多 8000 字符。
- Round 11 不接入 AI、项目文件夹、协作、自动同步、全库 JSON 改造或导入恢复。
- 不保存或重新托管第三方媒体；Markdown 只输出来源链接和文本研究结果。
- 所有应用代码必须在 `codex/round-11-multi-reference-synthesis` 功能分支与独立 worktree 中实现。
- 每个实现任务遵循 TDD RED→GREEN，并使用“中文 + English”提交信息。
- 交付前必须通过 migration、测试、类型检查、lint、构建、本地 CRUD、桌面/390px UI 和生产临时数据清理。

---

## File Structure

- Modify `db/schema.ts`: 定义两张新表、外键、唯一约束和列表索引。
- Create `drizzle/0002_multi_reference_synthesis.sql`: 由 Drizzle Kit 生成的新增式 migration。
- Modify `drizzle/meta/_journal.json`: 记录 migration 2。
- Create `drizzle/meta/0002_snapshot.json`: 记录新 schema 快照。
- Create `lib/synthesis.ts`: 领域类型、输入校验、记录标准化、版本化 reference 快照和派生状态。
- Create `lib/synthesis-draft.ts`: 表单草稿转换和 dirty 判断。
- Modify `lib/reference-db.ts`: 导出既有 reference row-to-record 转换供服务端快照复用。
- Create `lib/synthesis-db.ts`: 两表查询、原子创建、主体更新、快照刷新和删除。
- Create `lib/synthesis-export.ts`: 单份综合稿 Markdown 与安全文件名。
- Create `lib/synthesis-selection.ts`: 2-4 条临时选择的纯状态转换。
- Create `app/api/syntheses/route.ts`: 综合稿列表和创建。
- Create `app/api/syntheses/[id]/route.ts`: 综合稿详情、编辑和删除。
- Create `app/api/syntheses/[id]/references/[relationId]/refresh/route.ts`: 显式刷新单条快照。
- Create `app/synthesis/synthesis-workspace.tsx`: 综合稿列表/编辑工作区数据流、错误和确认状态。
- Create `app/synthesis/synthesis-list.tsx`: 状态筛选、最近更新列表和 CRUD 入口。
- Create `app/synthesis/synthesis-editor.tsx`: 参考摘要、结构化表单、保存与 Markdown 导出。
- Create `app/synthesis/synthesis-reference-card.tsx`: 快照、安全、评分、标签、缺失和 stale/unavailable 状态。
- Modify `app/page.tsx`: 顶层视图切换、临时多选和进入综合稿工作区。
- Modify `app/globals.css`: 选择操作条、全宽综合稿区、对比卡、表单组和 390px 行为。
- Modify `lib/localization.ts`: 完整的中英文 Round 11 文案与状态标签。
- Create `tests/synthesis.test.ts`: 领域校验、快照、stale/unavailable 派生。
- Create `tests/synthesis-draft.test.ts`: 草稿转换和未保存判断。
- Create `tests/synthesis-migration.test.ts`: migration、级联和 `SET NULL` 行为。
- Create `tests/synthesis-routes.test.ts`: route 状态码、payload 和错误映射。
- Create `tests/synthesis-export.test.ts`: Markdown 内容、空字段和未保存标记。
- Create `tests/synthesis-selection.test.ts`: 选择上下限、去重和顺序。
- Modify `tests/localization.test.ts`: 锁定新增双语文案。
- Create `docs/qa/2026-07-13-multi-reference-synthesis.md`: 本地、合并主线、部署和生产证据。
- Modify `docs/engineering/data-model.md`: 在实现后记录两表真实 schema 与快照契约。
- Modify `docs/engineering/architecture.md`: 记录综合稿模块和 API 边界。
- Modify `AGENTS.md`, `docs/progress/status.md`, `docs/progress/timeline.md`, `docs/progress/2026-07-13.md`: 持续记录阶段、验证、Delegation Log 和部署。

## Preconditions

- `docs/superpowers/specs/2026-07-13-multi-reference-synthesis-design.md` 已获得用户批准。
- `main`、`origin/main` 和 `origin/HEAD` 均指向 `b1ec341` 或包含它的后续文档提交。
- 在实施前使用 `superpowers:using-git-worktrees` 创建 `.worktrees/round-11-multi-reference-synthesis` 和分支 `codex/round-11-multi-reference-synthesis`。
- 在 worktree 中运行 `npm test`, `npm run typecheck`, `npm run lint`, `npm run build` 建立基线；任何基线失败先用 `superpowers:systematic-debugging` 定位。
- 不使用 seed 示例创建综合稿；只有真实 D1 reference 可以进入选择模式。

### Task 1: 建立综合稿领域契约与快照规则

**Files:**
- Create: `lib/synthesis.ts`
- Test: `tests/synthesis.test.ts`

**Interfaces:**
- Consumes: `ReferenceRecord` from `lib/reference.ts`.
- Produces: `SYNTHESIS_STATUSES`, `SynthesisStatus`, `SynthesisInput`, `CreateSynthesisInput`, `SynthesisRecord`, `SynthesisReferenceSnapshot`, `SynthesisReferenceLink`, `SynthesisDetail`, `SynthesisSummary`, `validateSynthesisInput()`, `validateCreateSynthesisInput()`, `createSynthesisRecord()`, `createReferenceSnapshot()`, `parseReferenceSnapshot()`, `deriveSnapshotState()`.

- [ ] **Step 1: 写领域契约失败测试**

Create `tests/synthesis.test.ts` with tests that assert:

```ts
import { describe, expect, it } from "vitest";
import type { ReferenceRecord } from "../lib/reference";
import {
  createReferenceSnapshot,
  createSynthesisRecord,
  deriveSnapshotState,
  parseReferenceSnapshot,
  validateCreateSynthesisInput,
  validateSynthesisInput,
} from "../lib/synthesis";

const reference = {
  id: "ref-1",
  title: "Material Study",
  source_url: "https://example.com/material",
  canonical_url: null,
  site_name: "Example",
  author: "Author",
  preview_url: null,
  media_type: "image",
  asset_category: "material_texture",
  source_category: null,
  style_tags: ["aged"],
  use_tags: ["environment"],
  mechanic_tags: ["exploration"],
  mood_tags: ["grounded"],
  visual_language_tags: ["edge wear"],
  license_status: "private_reference",
  attribution_text: null,
  public_status: "private",
  quality_status: "analyzed",
  rating: 4,
  reference_value_score: 5,
  transformability_score: 4,
  copyright_risk_score: 2,
  production_readiness_score: 3,
  inspiration_points: ["Wear follows use"],
  inspiration_entries: [],
  deconstruction_notes: "Wear clusters near contact edges.",
  transformation_ideas: "Apply the rule to an original prop.",
  avoid_copying_notes: "Do not copy the source texture.",
  related_original_asset: null,
  created_at: "2026-07-13T00:00:00.000Z",
  updated_at: "2026-07-13T01:00:00.000Z",
} satisfies ReferenceRecord;

it("accepts a valid synthesis with two to four unique references", () => {
  expect(validateCreateSynthesisInput({
    title: "Dungeon material direction",
    status: "draft",
    reference_ids: ["ref-1", "ref-2"],
  })).toEqual({ ok: true, errors: [] });
});

it.each([["ref-1"], ["a", "b", "c", "d", "e"], ["a", "a"]])(
  "rejects an invalid reference set %j",
  (reference_ids) => {
    expect(validateCreateSynthesisInput({
      title: "Invalid",
      status: "draft",
      reference_ids,
    }).ok).toBe(false);
  },
);

it("enforces title, status, and exact field limits", () => {
  expect(validateSynthesisInput({ title: " ", status: "draft" }).ok).toBe(false);
  expect(validateSynthesisInput({ title: "x".repeat(161), status: "draft" }).ok).toBe(false);
  expect(validateSynthesisInput({ title: "Valid", target_asset: "x".repeat(241), status: "draft" }).ok).toBe(false);
  expect(validateSynthesisInput({ title: "Valid", original_direction: "x".repeat(8001), status: "draft" }).ok).toBe(false);
  expect(validateSynthesisInput({ title: "Valid", status: "unknown" as "draft" }).ok).toBe(false);
});

it("creates a versioned snapshot and safely parses it", () => {
  const snapshot = createReferenceSnapshot(reference);
  expect(snapshot).toMatchObject({ schema_version: 1, reference_id: "ref-1", title: "Material Study" });
  expect(parseReferenceSnapshot(JSON.stringify(snapshot))).toEqual(snapshot);
  expect(parseReferenceSnapshot("not-json")).toBeNull();
});

it("derives current, stale, and unavailable states without persisting them", () => {
  const snapshot = createReferenceSnapshot(reference);
  expect(deriveSnapshotState(snapshot, reference.updated_at, true)).toEqual({ available: true, stale: false });
  expect(deriveSnapshotState(snapshot, "2026-07-13T02:00:00.000Z", true)).toEqual({ available: true, stale: true });
  expect(deriveSnapshotState(snapshot, null, false)).toEqual({ available: false, stale: false });
});
```

- [ ] **Step 2: 运行 focused test 验证 RED**

```powershell
npm test -- tests/synthesis.test.ts
```

Expected: FAIL because `lib/synthesis.ts` does not exist.

- [ ] **Step 3: 实现最小领域模型**

Create `lib/synthesis.ts` with the approved closed vocabulary and shapes:

```ts
import type { ReferenceRecord } from "./reference";

export const SYNTHESIS_STATUSES = ["draft", "actionable", "archived"] as const;
export type SynthesisStatus = (typeof SYNTHESIS_STATUSES)[number];

export type SynthesisInput = {
  title: string;
  target_asset?: string | null;
  shared_principles?: string | null;
  key_differences?: string | null;
  original_direction?: string | null;
  avoid_copying_notes?: string | null;
  design_constraints?: string | null;
  experiment_plan?: string | null;
  next_actions?: string | null;
  additional_notes?: string | null;
  status: SynthesisStatus;
};

export type CreateSynthesisInput = SynthesisInput & { reference_ids: string[] };
export type SynthesisRecord = Required<Omit<SynthesisInput, "target_asset" | "shared_principles" | "key_differences" | "original_direction" | "avoid_copying_notes" | "design_constraints" | "experiment_plan" | "next_actions" | "additional_notes">> & {
  id: string;
  target_asset: string | null;
  shared_principles: string | null;
  key_differences: string | null;
  original_direction: string | null;
  avoid_copying_notes: string | null;
  design_constraints: string | null;
  experiment_plan: string | null;
  next_actions: string | null;
  additional_notes: string | null;
  created_at: string;
  updated_at: string;
};

export type SynthesisReferenceSnapshot = {
  schema_version: 1;
  reference_id: string;
  reference_updated_at: string;
  title: string;
  source_url: string;
  canonical_url: string | null;
  site_name: string | null;
  author: string | null;
  media_type: ReferenceRecord["media_type"];
  asset_category: ReferenceRecord["asset_category"];
  license_status: ReferenceRecord["license_status"];
  public_status: ReferenceRecord["public_status"];
  quality_status: ReferenceRecord["quality_status"];
  scores: Pick<ReferenceRecord, "rating" | "reference_value_score" | "transformability_score" | "copyright_risk_score" | "production_readiness_score">;
  tags: Pick<ReferenceRecord, "style_tags" | "use_tags" | "mechanic_tags" | "mood_tags" | "visual_language_tags">;
  inspiration: Pick<ReferenceRecord, "inspiration_points" | "inspiration_entries" | "deconstruction_notes" | "transformation_ideas" | "avoid_copying_notes">;
};

export type SynthesisReferenceLink = {
  id: string;
  synthesis_id: string;
  reference_id: string | null;
  position: number;
  snapshot: SynthesisReferenceSnapshot;
  snapshot_updated_at: string;
  available: boolean;
  stale: boolean;
};

export type SynthesisDetail = SynthesisRecord & { references: SynthesisReferenceLink[] };
export type SynthesisSummary = Pick<SynthesisRecord, "id" | "title" | "target_asset" | "status" | "updated_at"> & { reference_count: number };
```

Implement `validateSynthesisInput`, `validateCreateSynthesisInput`, `createSynthesisRecord`, `createReferenceSnapshot`, `parseReferenceSnapshot`, and `deriveSnapshotState` with these exact rules:

- trim strings and convert optional blanks to `null`;
- reject titles outside 1-160, target assets above 240, text fields above 8000, invalid status, non-array IDs, fewer than 2, more than 4, blanks, and duplicates;
- parse snapshots only when `schema_version === 1` and required scalar/array groups have valid runtime shapes;
- stale is `available && currentUpdatedAt > snapshot.reference_updated_at` using parsed timestamps; invalid timestamps safely return `stale: false`.

- [ ] **Step 4: 验证 GREEN 并提交 Task 1**

```powershell
npm test -- tests/synthesis.test.ts
npm run typecheck
git add lib/synthesis.ts tests/synthesis.test.ts
git commit -m "feat: 建立综合稿领域契约 / add synthesis domain contract"
```

Expected: focused tests and typecheck pass.

### Task 2: 新增两表 D1 schema 与 migration 回归测试

**Files:**
- Modify: `db/schema.ts`
- Create: `drizzle/0002_multi_reference_synthesis.sql`
- Modify: `drizzle/meta/_journal.json`
- Create: `drizzle/meta/0002_snapshot.json`
- Test: `tests/synthesis-migration.test.ts`

**Interfaces:**
- Consumes: existing `references` Drizzle table.
- Produces: `syntheses` and `synthesisReferences` Drizzle tables with cascade and set-null semantics.

- [ ] **Step 1: 写 migration 行为失败测试**

Create `tests/synthesis-migration.test.ts` using `node:sqlite` `DatabaseSync`. Read and apply migrations `0000`, `0001`, and `0002`, splitting on `--> statement-breakpoint`. The test must:

```ts
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";

function applyMigration(db: DatabaseSync, path: string) {
  const sql = readFileSync(path, "utf8");
  for (const statement of sql.split("--> statement-breakpoint")) {
    if (statement.trim()) db.exec(statement);
  }
}

it("preserves snapshots after reference delete and cascades synthesis delete", () => {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  applyMigration(db, "drizzle/0000_melodic_colleen_wing.sql");
  applyMigration(db, "drizzle/0001_massive_zodiak.sql");
  applyMigration(db, "drizzle/0002_multi_reference_synthesis.sql");

  db.exec(`INSERT INTO references (id,title,source_url,media_type,asset_category,license_status,public_status,created_at,updated_at)
    VALUES ('ref-1','One','https://example.com','image','prop','private_reference','private','2026-07-13','2026-07-13')`);
  db.exec(`INSERT INTO syntheses (id,title,status,created_at,updated_at)
    VALUES ('syn-1','Study','draft','2026-07-13','2026-07-13')`);
  db.exec(`INSERT INTO synthesis_references (id,synthesis_id,reference_id,position,snapshot_json,snapshot_updated_at)
    VALUES ('link-1','syn-1','ref-1',0,'{"schema_version":1}','2026-07-13')`);

  db.exec("DELETE FROM references WHERE id = 'ref-1'");
  expect(db.prepare("SELECT reference_id, snapshot_json FROM synthesis_references WHERE id = 'link-1'").get()).toEqual({
    reference_id: null,
    snapshot_json: '{"schema_version":1}',
  });

  db.exec("DELETE FROM syntheses WHERE id = 'syn-1'");
  expect(db.prepare("SELECT COUNT(*) AS count FROM synthesis_references").get()).toEqual({ count: 0 });
  db.close();
});
```

- [ ] **Step 2: 运行测试验证 RED**

```powershell
npm test -- tests/synthesis-migration.test.ts
```

Expected: FAIL because `drizzle/0002_multi_reference_synthesis.sql` does not exist.

- [ ] **Step 3: 扩展 Drizzle schema**

Modify `db/schema.ts` to import `index`, `uniqueIndex`, and define:

```ts
export const syntheses = sqliteTable("syntheses", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  targetAsset: text("target_asset"),
  sharedPrinciples: text("shared_principles"),
  keyDifferences: text("key_differences"),
  originalDirection: text("original_direction"),
  avoidCopyingNotes: text("avoid_copying_notes"),
  designConstraints: text("design_constraints"),
  experimentPlan: text("experiment_plan"),
  nextActions: text("next_actions"),
  additionalNotes: text("additional_notes"),
  status: text("status").notNull().default("draft"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  index("idx_syntheses_status").on(table.status),
  index("idx_syntheses_updated_at").on(table.updatedAt),
]);

export const synthesisReferences = sqliteTable("synthesis_references", {
  id: text("id").primaryKey(),
  synthesisId: text("synthesis_id").notNull().references(() => syntheses.id, { onDelete: "cascade" }),
  referenceId: text("reference_id").references(() => references.id, { onDelete: "set null" }),
  position: integer("position").notNull(),
  snapshotJson: text("snapshot_json").notNull(),
  snapshotUpdatedAt: text("snapshot_updated_at").notNull(),
}, (table) => [
  index("idx_synthesis_references_synthesis_id").on(table.synthesisId),
  uniqueIndex("uq_synthesis_references_position").on(table.synthesisId, table.position),
  uniqueIndex("uq_synthesis_references_reference").on(table.synthesisId, table.referenceId),
]);
```

- [ ] **Step 4: 生成命名 migration 并检查 SQL**

```powershell
npx drizzle-kit generate --name=multi_reference_synthesis
rg -n "CREATE TABLE.*syntheses|CREATE TABLE.*synthesis_references|ON DELETE cascade|ON DELETE set null|CREATE.*INDEX" drizzle/0002_multi_reference_synthesis.sql
```

Expected: Drizzle creates the exact `0002_multi_reference_synthesis.sql` and `0002_snapshot.json`; SQL contains two tables, both foreign-key actions, two list indexes, and three relation indexes/uniques.

- [ ] **Step 5: 验证 migration GREEN 并提交 Task 2**

```powershell
npm test -- tests/synthesis-migration.test.ts
npm run typecheck
git add db/schema.ts drizzle/0002_multi_reference_synthesis.sql drizzle/meta/_journal.json drizzle/meta/0002_snapshot.json tests/synthesis-migration.test.ts
git commit -m "feat: 增加综合稿数据表 / add synthesis database tables"
```

Expected: migration test proves `SET NULL` and cascade behavior.

### Task 3: 实现综合稿数据访问层

**Files:**
- Create: `lib/synthesis-db.ts`
- Modify: `lib/synthesis.ts`
- Modify: `lib/reference-db.ts`
- Test: `tests/synthesis.test.ts`

**Interfaces:**
- Consumes: `getDb()`, `references`, `syntheses`, `synthesisReferences`, and Task 1 domain helpers.
- Produces: `listSyntheses(status?)`, `getSynthesis(id)`, `createSynthesis(input)`, `updateSynthesis(id, input)`, `deleteSynthesis(id)`, `refreshSynthesisReference(synthesisId, relationId)`.

- [ ] **Step 1: 扩展序列化与错误结果失败测试**

Add tests to `tests/synthesis.test.ts` for:

```ts
expect(createSynthesisRecord({ title: "  Study  ", status: "draft", target_asset: "  Prop  " }, "2026-07-13T00:00:00.000Z")).toMatchObject({
  title: "Study",
  target_asset: "Prop",
  shared_principles: null,
  status: "draft",
  created_at: "2026-07-13T00:00:00.000Z",
  updated_at: "2026-07-13T00:00:00.000Z",
});
```

Also assert malformed stored snapshots return a stable placeholder snapshot carrying `schema_version: 1`, `reference_id`, title `"Unavailable snapshot"`, empty arrays, and null scores rather than crashing a whole detail response.

- [ ] **Step 2: 运行 focused test 验证 RED**

```powershell
npm test -- tests/synthesis.test.ts
```

Expected: FAIL until the timestamp injection and stored-snapshot fallback are implemented.

- [ ] **Step 3: 实现数据访问函数**

Create `lib/synthesis-db.ts` with these exact behaviors:

```ts
export type SynthesisMutationResult =
  | { ok: true; synthesis: SynthesisDetail }
  | { ok: false; code: "validation"; errors: string[] }
  | { ok: false; code: "not_found" }
  | { ok: false; code: "reference_not_found"; reference_ids: string[] };

export type SynthesisRefreshResult =
  | { ok: true; synthesis: SynthesisDetail }
  | { ok: false; code: "relation_not_found" }
  | { ok: false; code: "reference_unavailable" };

export async function listSyntheses(status?: SynthesisStatus): Promise<SynthesisSummary[]>;
export async function getSynthesis(id: string): Promise<SynthesisDetail | null>;
export async function createSynthesis(input: CreateSynthesisInput): Promise<SynthesisMutationResult>;
export async function updateSynthesis(id: string, input: SynthesisInput): Promise<SynthesisMutationResult>;
export async function deleteSynthesis(id: string): Promise<boolean>;
export async function refreshSynthesisReference(synthesisId: string, relationId: string): Promise<SynthesisRefreshResult>;
```

Implementation rules:

- rename and export the existing private `rowToRecord` in `lib/reference-db.ts` as `referenceRowToRecord`; keep `recordToRow` private and keep all existing reference behavior unchanged;
- `listSyntheses` uses a left join, `count(synthesisReferences.id)`, group by synthesis ID, optional validated status, and descending `updatedAt`.
- `getSynthesis` loads one main row plus ordered links, left joins current references, converts current rows through `referenceRowToRecord`, parses each stored snapshot, and derives `available`/`stale` from current `updatedAt`.
- `createSynthesis` validates first, loads all selected references with `inArray`, converts them through `referenceRowToRecord`, restores requested order, fails with `{ ok:false, code:"reference_not_found", reference_ids }` if any are absent, and executes exactly two D1 batch statements: one main insert and one multi-value relation insert.
- relation IDs and synthesis ID use `crypto.randomUUID()`; `position` is the array index; snapshot time equals the server creation timestamp.
- `updateSynthesis` validates fields, updates only the main row, preserves `createdAt`, and returns `not_found` when no row changes.
- `refreshSynthesisReference` loads the owned relation and current reference, returns `relation_not_found` or `reference_unavailable` distinctly, then batches relation snapshot update plus synthesis `updatedAt` update.
- `deleteSynthesis` returns whether a row was deleted; the database performs cascade cleanup.
- no function accepts client-provided `snapshot_json`, `position`, `reference_id` changes, or `created_at`.

- [ ] **Step 4: 运行领域回归和 typecheck**

```powershell
npm test -- tests/synthesis.test.ts tests/synthesis-migration.test.ts
npm run typecheck
```

Expected: all focused tests pass and Drizzle query types compile.

- [ ] **Step 5: 提交 Task 3**

```powershell
git add lib/synthesis.ts lib/reference-db.ts lib/synthesis-db.ts tests/synthesis.test.ts
git commit -m "feat: 增加综合稿数据访问 / add synthesis data access"
```

### Task 4: 建立综合稿 API routes 与 route 回归

**Files:**
- Create: `app/api/syntheses/route.ts`
- Create: `app/api/syntheses/[id]/route.ts`
- Create: `app/api/syntheses/[id]/references/[relationId]/refresh/route.ts`
- Test: `tests/synthesis-routes.test.ts`

**Interfaces:**
- Consumes: all Task 3 data-access functions.
- Produces: JSON routes defined by the approved spec.

- [ ] **Step 1: 写 route 失败测试**

Create `tests/synthesis-routes.test.ts`. Use `vi.mock("../lib/synthesis-db", ...)`, reset mocks before each test, and dynamically import route modules. Cover these exact cases:

```ts
expect((await collection.GET(new Request("http://local/api/syntheses?status=draft&sort=recent"))).status).toBe(200);
expect((await collection.POST(new Request("http://local/api/syntheses", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ title: "Study", status: "draft", reference_ids: ["a", "b"] }),
}))).status).toBe(201);
```

Also assert:

- invalid status query returns 400 without calling the DB;
- any `sort` value other than omitted or `recent` returns 400 without calling the DB;
- malformed JSON and validation results return 400 with `{ errors }`;
- missing synthesis returns 404 for GET/PATCH/DELETE;
- successful PATCH returns `{ synthesis }` and DELETE returns 204;
- refresh returns 200, 404 for missing relation/synthesis, and 409 for unavailable source;
- thrown missing-table errors return 500 with a migration-oriented message without leaking credentials.

- [ ] **Step 2: 运行 route test 验证 RED**

```powershell
npm test -- tests/synthesis-routes.test.ts
```

Expected: FAIL because the routes do not exist.

- [ ] **Step 3: 实现 route handlers**

Implement these signatures:

```ts
// app/api/syntheses/route.ts
export async function GET(request: Request): Promise<Response>;
export async function POST(request: Request): Promise<Response>;

// app/api/syntheses/[id]/route.ts
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }): Promise<Response>;
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response>;
export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }): Promise<Response>;

// refresh route
export async function POST(_request: Request, context: { params: Promise<{ id: string; relationId: string }> }): Promise<Response>;
```

Use response bodies:

- list: `{ syntheses: SynthesisSummary[] }`;
- create/detail/update/refresh: `{ synthesis: SynthesisDetail }`;
- validation: `{ errors: string[] }`;
- operational error: `{ error: string, code?: string }`;
- delete success: empty body with status 204.

Do not add a separate authentication layer; Sites private access remains the outer boundary used by the existing references routes.

- [ ] **Step 4: 验证 API GREEN 并提交 Task 4**

```powershell
npm test -- tests/synthesis-routes.test.ts tests/synthesis.test.ts tests/synthesis-migration.test.ts
npm run typecheck
git add app/api/syntheses lib/synthesis-db.ts tests/synthesis-routes.test.ts
git commit -m "feat: 增加综合稿 API / add synthesis API"
```

Expected: route tests pass with all approved status codes.

### Task 5: 增加草稿、临时选择、Markdown 与双语契约

**Files:**
- Create: `lib/synthesis-draft.ts`
- Create: `lib/synthesis-selection.ts`
- Create: `lib/synthesis-export.ts`
- Modify: `lib/localization.ts`
- Create: `tests/synthesis-draft.test.ts`
- Create: `tests/synthesis-selection.test.ts`
- Create: `tests/synthesis-export.test.ts`
- Modify: `tests/localization.test.ts`

**Interfaces:**
- Produces: `SynthesisDraft`, `createEmptySynthesisDraft()`, `detailToSynthesisDraft()`, `draftToSynthesisInput()`, `isSynthesisDraftDirty()`, `toggleSynthesisSelection()`, `canEnterSynthesisComparison()`, `formatSynthesisMarkdown()`, `safeSynthesisExportFilename()`.

- [ ] **Step 1: 写四组失败测试**

Tests must assert:

```ts
expect(toggleSynthesisSelection([], "a")).toEqual(["a"]);
expect(toggleSynthesisSelection(["a"], "a")).toEqual([]);
expect(toggleSynthesisSelection(["a", "b", "c", "d"], "e")).toEqual(["a", "b", "c", "d"]);
expect(canEnterSynthesisComparison(["a", "b"])).toBe(true);
expect(canEnterSynthesisComparison(["a"])).toBe(false);
```

```ts
const draft = detailToSynthesisDraft(detail);
expect(draft.status).toBe("draft");
expect(isSynthesisDraftDirty(draft, detail)).toBe(false);
expect(isSynthesisDraftDirty({ ...draft, title: "Changed" }, detail)).toBe(true);
expect(draftToSynthesisInput({ ...draft, target_asset: "  " }).target_asset).toBeNull();
```

```ts
const markdown = formatSynthesisMarkdown(detail, { unsaved: true, exportedAt: "2026-07-13T00:00:00.000Z" });
expect(markdown).toContain("# Study");
expect(markdown).toContain("Unsaved changes");
expect(markdown).toContain("https://example.com/material");
expect(markdown).not.toContain("preview_url");
```

Extend `tests/localization.test.ts` so every new key exists and is non-empty in `zh` and `en`, including view switch, compare mode, counts, status labels, field labels, stale/unavailable, refresh, save states, unsaved confirmation, delete confirmation, filters and export warning.

- [ ] **Step 2: 运行 focused tests 验证 RED**

```powershell
npm test -- tests/synthesis-draft.test.ts tests/synthesis-selection.test.ts tests/synthesis-export.test.ts tests/localization.test.ts
```

Expected: FAIL because the three helpers and new copy do not exist.

- [ ] **Step 3: 实现纯 helper 和文案**

Implement selection with a fixed maximum of 4 and preserved insertion order. Implement draft conversion for every synthesis field and dirty comparison against normalized input.

Implement Markdown section order exactly as:

```text
Title
Status and target asset
Unsaved warning when applicable
References in position order
Shared principles
Key differences
Original direction
Avoid copying
Design constraints
Experiment plan
Next actions
Additional notes
Exported at
```

Empty sections render `-`; unavailable references retain snapshot title and URL with an unavailable note. Reuse the slug rules from `reference-export.ts`, but keep the synthesis filename helper independent and return `<slug>-synthesis-YYYY-MM-DD.md`.

Add explicit `uiCopy` keys and `labelForSynthesisStatus(status, language)`; do not infer English strings by transforming Chinese keys.

- [ ] **Step 4: 验证 GREEN 并提交 Task 5**

```powershell
npm test -- tests/synthesis-draft.test.ts tests/synthesis-selection.test.ts tests/synthesis-export.test.ts tests/localization.test.ts
npm run typecheck
git add lib/synthesis-draft.ts lib/synthesis-selection.ts lib/synthesis-export.ts lib/localization.ts tests/synthesis-draft.test.ts tests/synthesis-selection.test.ts tests/synthesis-export.test.ts tests/localization.test.ts
git commit -m "feat: 增加综合稿交互契约 / add synthesis interaction contract"
```

### Task 6: 构建独立综合稿列表与编辑工作区

**Files:**
- Create: `app/synthesis/synthesis-workspace.tsx`
- Create: `app/synthesis/synthesis-list.tsx`
- Create: `app/synthesis/synthesis-editor.tsx`
- Create: `app/synthesis/synthesis-reference-card.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: synthesis API, helpers, `Language`, and optional initial reference IDs.
- Produces: one self-contained `SynthesisWorkspace` mounted by `app/page.tsx`.

- [ ] **Step 1: 创建组件契约并验证 typecheck RED**

Create component shells with these exact props and exported component:

```ts
export type SynthesisWorkspaceProps = {
  language: Language;
  initialReferenceIds: string[];
  onInitialReferenceIdsConsumed: () => void;
  onBackToReferences: () => void;
};

export function SynthesisWorkspace(props: SynthesisWorkspaceProps): React.JSX.Element;
```

`SynthesisList` receives summaries, status filter, loading state, and callbacks. `SynthesisEditor` receives `SynthesisDetail | null`, a `SynthesisDraft`, mode `"create" | "edit"`, save/refresh/export/delete callbacks and busy/error state. `SynthesisReferenceCard` receives one link plus language and refresh state.

Run:

```powershell
npm run typecheck
```

Expected: FAIL until all props are implemented and imported types exist.

- [ ] **Step 2: 实现工作区状态与 API 数据流**

`SynthesisWorkspace` must own:

- `summaries`, `statusFilter`, `activeDetail`, `draft`, `mode`;
- list/detail/save/delete/refresh loading states kept separate;
- `message`, `pendingDelete`, and `pendingNavigation` confirmation state;
- an `AbortController` for list/detail reads;
- one `beforeunload` listener only while `isSynthesisDraftDirty` is true.

When `initialReferenceIds.length >= 2`, open a blank create draft, retain those IDs only for the POST body, call `onInitialReferenceIdsConsumed`, and do not fetch snapshot data client-side. On successful create, replace the create draft with the returned server detail and refresh the list.

Internal back, status-filter switch, opening another synthesis, and returning to references must use an app-owned unsaved confirmation. Browser/tab close uses the native `beforeunload` contract because custom UI cannot intercept it.

- [ ] **Step 3: 实现列表、编辑器和参考摘要**

List behavior:

- filters: all/draft/actionable/archived;
- sort: API recent order only;
- row fields: title, target asset, localized status, reference count, updated time;
- actions: open, archive through PATCH, delete through confirmation.

Editor field groups:

- 方向: title, target_asset, original_direction;
- 对比: shared_principles, key_differences;
- 边界: avoid_copying_notes, design_constraints;
- 执行: experiment_plan, next_actions;
- 记录: additional_notes.

Reference card behavior:

- display snapshot title/source, license/public/quality, five scores, compact tags, inspiration points and summary;
- calculate missing source/safety/scores/tags/inspiration groups from the snapshot and render warnings without blocking save;
- render stale and unavailable as text plus visual state, never color alone;
- show refresh only when `available`; disable while refreshing.

Saving validates locally with `validateSynthesisInput`, retains the draft on any error, and displays saving/saved/failed. Markdown uses current draft merged into the loaded detail and marks unsaved output.

- [ ] **Step 4: 添加 scoped CSS 与 390px 结构**

Add classes scoped under `.synthesis-workspace`:

- `.synthesis-workspace` spans grid columns `2 / -1` and uses an unframed full-width layout;
- `.synthesis-toolbar` uses stable wrapping command groups;
- `.synthesis-reference-strip` uses 2-4 equal columns above 820px;
- `.synthesis-form-section` is an unframed band with border separators, not a card inside a card;
- `.synthesis-list-row` uses radius at most 8px;
- `.synthesis-save-bar` remains visible without covering the final field;
- status chips use existing accent/warning/danger tokens and text labels.

At `max-width: 720px`, reference cards become an 82%-width horizontal scroll-snap strip, the form becomes one column, secondary commands enter a native `<details>` action menu, and all command targets are at least 44px high. Ensure `min-width: 0`, `overflow-wrap: anywhere`, and stable toolbar tracks prevent page overflow.

- [ ] **Step 5: 运行 typecheck/lint/build 并提交 Task 6**

```powershell
npm run typecheck
npm run lint
npm run build
git add app/synthesis app/globals.css
git commit -m "feat: 构建综合稿工作区 / build synthesis workspace"
```

Expected: all three gates pass; the component is not yet mounted.

### Task 7: 接入主工作台、多选模式与完整本地 CRUD

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/globals.css`
- Create: `docs/qa/2026-07-13-multi-reference-synthesis.md`
- Modify: `docs/progress/2026-07-13.md`

**Interfaces:**
- Consumes: `SynthesisWorkspace`, selection helpers, current filtered/sorted references.
- Produces: the complete user workflow from references to saved synthesis.

- [ ] **Step 1: 接入顶层视图与临时选择状态**

Add page state:

```ts
type WorkspaceView = "references" | "syntheses";
const [workspaceView, setWorkspaceView] = useState<WorkspaceView>("references");
const [isComparisonSelectionMode, setIsComparisonSelectionMode] = useState(false);
const [comparisonReferenceIds, setComparisonReferenceIds] = useState<string[]>([]);
const [pendingSynthesisReferenceIds, setPendingSynthesisReferenceIds] = useState<string[]>([]);
```

Add a segmented “参考 / 综合稿” switch below language selection. Render reference filters/deck/detail only for `references`; render `SynthesisWorkspace` for `syntheses`.

“开始对比” must be disabled when `isUsingSeedReferences` is true. Starting selection closes add/edit states safely, clears prior comparison IDs, and changes card semantics from selecting details to toggling comparison IDs. The pin button remains disabled in comparison mode to keep one click meaning.

- [ ] **Step 2: 实现 2-4 条选择操作条**

Render a stable selection indicator on cards and a sticky bottom action bar with count `N / 4`, cancel, and enter. Enter is disabled unless `canEnterSynthesisComparison()` is true. On enter:

```ts
setPendingSynthesisReferenceIds(comparisonReferenceIds);
setComparisonReferenceIds([]);
setIsComparisonSelectionMode(false);
setWorkspaceView("syntheses");
```

Filtering must not mutate `comparisonReferenceIds`. Cancel restores normal card detail behavior.

- [ ] **Step 3: 应用 migration 到本地 Sites D1 状态**

Start the dev server once so `.wrangler/state` creates the local D1 sqlite file. Locate the single active sqlite file under `.wrangler/state/v3/d1`, then apply only migration 2 with Node 22 `node:sqlite`:

```powershell
$db = Get-ChildItem -Recurse .wrangler/state/v3/d1 -Filter *.sqlite | Sort-Object LastWriteTime -Descending | Select-Object -First 1 -ExpandProperty FullName
$env:REFFORGE_LOCAL_DB = $db
node --input-type=module -e "import {readFileSync} from 'node:fs'; import {DatabaseSync} from 'node:sqlite'; const db=new DatabaseSync(process.env.REFFORGE_LOCAL_DB); db.exec('PRAGMA foreign_keys=ON'); for (const statement of readFileSync('drizzle/0002_multi_reference_synthesis.sql','utf8').split('--> statement-breakpoint')) if (statement.trim()) db.exec(statement); db.close();"
```

Expected: command exits 0. Query `sqlite_master` with a second read-only `node:sqlite` command and confirm both new tables exist. Do not delete or recreate the existing local references data.

- [ ] **Step 4: 运行本地 API CRUD smoke**

Create two temporary references through the existing API, capture IDs, then:

1. POST a synthesis with the two IDs and all ten fields.
2. GET list and detail; assert relation order and snapshots.
3. PATCH title, status, original direction and next actions.
4. Update one source reference; GET detail and assert `stale: true`.
5. POST refresh; GET detail and assert `stale: false`.
6. Delete the other reference; GET detail and assert `available: false` with snapshot retained.
7. DELETE synthesis and remaining reference.
8. GET list/references and prove all QA data is absent.

Record exact HTTP statuses and IDs in the QA document; never record tokens.

- [ ] **Step 5: 运行本地浏览器 CRUD 与响应式验证**

Using the in-app browser on the local dev server:

- create or reuse two temporary D1 references;
- enter compare mode, select across a filter change, verify 2/4 and cancel restoration;
- create a synthesis, reload, edit all field groups, switch to actionable, reload, and verify persistence;
- export Markdown and inspect filename/content;
- update one source, verify stale, explicitly refresh it;
- delete one source and verify historical snapshot;
- verify list status filters, archive, delete confirmation and final cleanup;
- switch Chinese/English and verify visible copy;
- measure desktop, 1024px and 390x844: `document.documentElement.scrollWidth - document.documentElement.clientWidth === 0` and no sticky-action overlap;
- confirm browser console has no application errors.

- [ ] **Step 6: 运行全量门禁并提交 Task 7**

```powershell
npm test
npm run typecheck
npm run lint
npm run build
git diff --check
git add app/page.tsx app/globals.css docs/qa/2026-07-13-multi-reference-synthesis.md docs/progress/2026-07-13.md
git commit -m "feat: 接入多参考综合流程 / wire multi-reference synthesis flow"
```

Expected: all gates pass and local QA data is absent.

### Task 8: 更新工程文档、独立审查并完成分支

**Files:**
- Modify: `docs/engineering/data-model.md`
- Modify: `docs/engineering/architecture.md`
- Modify: `AGENTS.md`
- Modify: `docs/progress/status.md`
- Modify: `docs/progress/timeline.md`
- Modify: `docs/progress/2026-07-13.md`
- Modify: valid review-finding files only

- [ ] **Step 1: 同步真实工程文档与三份留痕**

Document the implemented schema, foreign-key semantics, snapshot version, API list and module boundaries. Set stage to “Round 11 implemented and locally verified; merge pending”. Record every task commit, migration result, exact test counts, browser viewports, cleanup result and a `Delegation Log` for each subagent.

- [ ] **Step 2: 使用 `superpowers:requesting-code-review` 独立审查**

Review base SHA and feature HEAD against the approved spec and this plan. Priorities:

- client-forged snapshots or relationship changes;
- non-atomic create/refresh writes;
- invalid 2-4 bounds or duplicate IDs;
- broken `ON DELETE SET NULL`/cascade behavior;
- stale detection timestamp errors;
- malformed snapshot crashes;
- lost drafts, bypassed unsaved confirmations or duplicate submissions;
- seed examples accidentally sent to D1;
- bilingual gaps, keyboard failures, nested cards, 390px overflow or sticky overlap;
- production cleanup paths.

- [ ] **Step 3: 对有效 Critical/Important finding 执行 RED→GREEN**

For each valid behavior defect, add a focused failing unit/API/browser regression first, run it to observe RED, implement the smallest fix, rerun GREEN, and commit with a focused bilingual message. Record intentionally deferred Minor findings in the QA document.

- [ ] **Step 4: 运行新鲜全量验证**

```powershell
npm test
npm run typecheck
npm run lint
npm run build
git diff --check
git status --short --branch
```

Expected: zero failures, clean diff check, and only intended documentation changes before their commit.

- [ ] **Step 5: 提交实现留痕**

```powershell
git add docs/engineering/data-model.md docs/engineering/architecture.md AGENTS.md docs/progress/status.md docs/progress/timeline.md docs/progress/2026-07-13.md docs/qa/2026-07-13-multi-reference-synthesis.md
git commit -m "docs: 记录第十一轮综合实现 / record round 11 synthesis implementation"
```

- [ ] **Step 6: 使用 `superpowers:finishing-a-development-branch`**

选择合并到本地 `main`。该技能必须在合并前复验、从主工作树合并、在合并后的 `main` 再运行测试/typecheck/lint/build、确认无未提交文件，然后删除 owned worktree 和本地功能分支。任何验证失败都停止清理并进入 systematic debugging。

### Task 9: 推送、部署 Sites 并完成生产真实 CRUD

**Files:**
- Modify: `AGENTS.md`
- Modify: `docs/qa/2026-07-13-multi-reference-synthesis.md`
- Modify: `docs/progress/status.md`
- Modify: `docs/progress/timeline.md`
- Modify: `docs/progress/2026-07-13.md`

- [x] **Step 1: 外部写入前验证合并主线**

```powershell
git status --short --branch
git log -1 --oneline --decorate
npm test
npm run typecheck
npm run lint
npm run build
```

Expected: clean `main`, all gates exit 0.

- [x] **Step 2: 推送 GitHub `main`**

```powershell
git push origin main
git rev-parse HEAD
git rev-parse origin/main
```

Expected: both SHAs match. If DNS or connection reset recurs, record the exact error and do not claim remote sync.

- [x] **Step 3: 同步 Sites source 并部署带 migration 的新版本**

Use `sites:sites-hosting` and the available Sites connector to:

- read `.openai/hosting.json` and keep project ID `appgprj_6a246b271d848191b88b60d1633030c7`;
- synchronize the exact merged `main` commit to Sites source without persisting credentials;
- save a version whose `commit_sha` matches the synchronized source;
- confirm the build artifact contains `dist/.openai/drizzle/0002_multi_reference_synthesis.sql`;
- deploy using the verified owner-only/private path;
- poll until `succeeded` or `failed` and record version/deployment IDs.

Do not manually apply remote SQL before the Sites version is ready unless the hosting flow explicitly requires it. Never deploy an app expecting the new tables before the corresponding remote migration succeeds.

- [x] **Step 4: 运行生产临时 reference + synthesis CRUD**

Against the authenticated production URL `https://game-ref-forge.yeep-6613.chatgpt.site/`:

1. Create `Round 11 Production Ref A <timestamp>` and `Round 11 Production Ref B <timestamp>`.
2. Enter compare mode, select both, create `Round 11 Production Synthesis <timestamp>` with all field groups.
3. Reload and confirm synthesis, snapshots and field values persist.
4. Edit title/status/next actions, save once, reload and confirm.
5. Export single Markdown and inspect source links plus unsaved/saved marker behavior.
6. Update Ref A, confirm stale warning, refresh snapshot, and confirm warning clears.
7. Delete Ref B, reload synthesis, and confirm historical snapshot remains available as unavailable-source evidence.
8. Archive synthesis, filter archived, then delete it.
9. Delete Ref A and confirm all three QA titles are absent after reload/API read.
10. Verify desktop and 390x844 overflow are `0`, controls are clickable, and console application errors are `0`.

If browser automation times out after a write, first re-read UI/API state before retrying to avoid duplicate data. If cleanup must use the authenticated API, record that separately. Do not claim full production CRUD unless UI create, edit, refresh, delete and persistence assertions all pass.

- [x] **Step 5: 完成阶段与部署留痕**

Update stage to `Round 11 complete; Round 12 design-ready`. Record exact GitHub SHA, Sites source SHA, version/deployment IDs, migration result, production QA IDs/titles, Markdown result, 390px evidence and cleanup proof in the QA document and all three progress files.

- [ ] **Step 6: 提交并推送最终部署证据**

```powershell
git diff --check
rg -n "Round 11|Sites version|migration|Production Synthesis|390|cleanup|清理" AGENTS.md docs/qa/2026-07-13-multi-reference-synthesis.md docs/progress/status.md docs/progress/timeline.md docs/progress/2026-07-13.md
git add AGENTS.md docs/qa/2026-07-13-multi-reference-synthesis.md docs/progress/status.md docs/progress/timeline.md docs/progress/2026-07-13.md
git commit -m "docs: 记录第十一轮部署结果 / record round 11 deployment"
git push origin main
git status --short --branch
```

Expected: clean `main` aligned with `origin/main`. If Sites source intentionally remains one docs-only commit behind GitHub, record that exact distinction.

## Final Verification Checklist

- [ ] `syntheses` and `synthesis_references` migration applies to existing data without rewriting references.
- [ ] D1 verifies `ON DELETE SET NULL`, `ON DELETE CASCADE`, order uniqueness and relationship uniqueness.
- [ ] Only 2-4 unique real D1 references can create a synthesis.
- [ ] Server creates every snapshot; client cannot forge snapshots or change saved relationships.
- [ ] List, create, read, edit, status change, archive, delete and reload persistence pass.
- [ ] Reference update produces stale state; explicit refresh clears it without changing another snapshot.
- [ ] Reference delete preserves the synthesis and readable historical snapshot.
- [ ] Markdown exports current text and source links without media copies or all-library JSON changes.
- [ ] Save/refresh/delete failures preserve prior data and provide visible bilingual feedback.
- [ ] Unsaved internal navigation uses app confirmation; browser close uses `beforeunload`.
- [ ] Seed examples cannot enter persisted comparison mode.
- [ ] Chinese and English, keyboard use, desktop, 1024px and 390px checks pass.
- [ ] No page-level horizontal overflow, incoherent overlap, nested cards or unstable action sizing remains.
- [ ] All automated tests, typecheck, lint and production build pass on merged `main`.
- [ ] Local and production temporary references/syntheses are deleted and absence is confirmed.
- [ ] Engineering docs, QA evidence, three progress traces and Delegation Log match real results.
- [ ] GitHub `main`, Sites source and the deployed version are reconciled and documented.
