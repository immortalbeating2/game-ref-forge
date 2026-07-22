# Round 12 可调整工作台布局实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 RefForge 固定桌面三栏升级为可拖拽、可键盘调整、可折叠恢复并持久化偏好的连续工作台，同时保持现有业务流程和响应式布局。

**Architecture:** 用 `lib/workspace-layout.ts` 提供所有可纯测的宽度、边界、持久化和键盘算法；React hook 只协调 ResizeObserver、localStorage 和 Pointer Events 生命周期；分隔条组件只负责可访问 DOM；`app/page.tsx` 保留业务状态并通过 CSS variables 接入现有三栏。参考视图采用五轨网格，综合稿视图采用三轨网格，`<=1280px` 回退到当前非拖拽布局。

**Tech Stack:** TypeScript 5.9、React 19、vinext、Vitest 4、CSS Grid、Pointer Events、ResizeObserver、localStorage、Codex in-app Browser、Codex App Sites。

## Global Constraints

- 桌面拖拽只在 `>1280px` 生效；`<=1280px` 不显示布局控制，`<=820px` 保持单栏。
- 左侧默认 `260px`、范围 `220-360px`；右侧默认 `420px`、范围 `340-640px`；中间安全宽度 `560px`。
- 普通分隔命中区 `8px`；折叠恢复轨道 `44px`。
- 键盘普通步长 `16px`、Shift 步长 `40px`；支持 Home、End 和双击复位。
- localStorage key 固定为 `ref-forge-workspace-layout-v1`，schema version 固定为 `1`。
- 不增加运行时依赖，不修改 API、D1、migration、reference/synthesis 模型或来源策略。
- 新文案必须同时提供中文和英文；控制必须有 tooltip、`aria-label` 和键盘路径。
- 实现遵循 TDD：每个生产行为先写失败测试并确认 RED，再写最小实现并确认 GREEN。
- 交付必须更新 `status.md`、`timeline.md`、`2026-07-22.md` 和 Round 12 QA 文档。

---

## File Structure

- Create `lib/workspace-layout.ts`: 布局常量、偏好解析/序列化、宽度约束和键盘目标纯函数。
- Create `tests/workspace-layout.test.ts`: 覆盖默认值、损坏偏好、宽度边界、视口约束、折叠和键盘算法。
- Create `app/workspace/use-workspace-layout.ts`: React 状态、ResizeObserver、Pointer Events 和 localStorage 生命周期。
- Create `app/workspace/workspace-separator.tsx`: 可访问分隔条与折叠恢复控制。
- Create `tests/workspace-layout-components.test.ts`: 源码契约、ARIA、事件清理、页面接线和响应式 CSS 回归。
- Modify `lib/localization.ts`: 增加调整、收起、展开和复位文案。
- Modify `tests/localization.test.ts`: 锁定中英文新增文案。
- Modify `app/page.tsx`: 接入 hook、左右分隔条、折叠按钮、视图 class 和 CSS variables。
- Modify `app/globals.css`: 五轨/三轨网格、内部滚动、分隔条、折叠、focus 和响应式降级。
- Create `docs/qa/2026-07-22-resizable-workspace-layout.md`: 记录自动化、浏览器、合并、部署和生产证据。
- Modify `AGENTS.md`: Round 12 完成后更新阶段与验证摘要。
- Modify `docs/progress/status.md`, `docs/progress/timeline.md`, `docs/progress/2026-07-22.md`: 记录计划、分支、任务、审查、合并、部署和遗留项。

## Preconditions

- 已批准设计：`docs/superpowers/specs/2026-07-22-resizable-workspace-layout-design.md`。
- `main` 包含 Round 12 设计和本计划提交，且先推送到 `origin/main`。
- 使用 `superpowers:using-git-worktrees` 创建 `.worktrees/round-12-resizable-workspace` 和 `codex/round-12-resizable-workspace`。
- 在 worktree 中运行 `npm install` 和 `npm test`，基线失败时停止并诊断。
- 使用 `superpowers:subagent-driven-development` 串行执行任务；每项必须有实现报告、任务审查和提交。

### Task 1: 建立纯布局契约

**Files:**
- Create: `lib/workspace-layout.ts`
- Create: `tests/workspace-layout.test.ts`

**Interfaces:**
- Produces: `WorkspaceLayoutPreferences`, `WorkspaceLayoutMetrics`, `WorkspacePanelSide`, `WorkspaceViewMode`。
- Produces: `parseWorkspaceLayoutPreferences`, `serializeWorkspaceLayoutPreferences`, `resolveWorkspaceLayout`, `resizeWorkspacePanel`, `getKeyboardWorkspaceWidth`。
- Consumed by: Task 2 hook and Task 3 CSS-variable integration。

- [ ] **Step 1: 写偏好与约束失败测试**

Create `tests/workspace-layout.test.ts` with focused cases equivalent to:

```ts
import { describe, expect, it } from "vitest";
import {
  DEFAULT_WORKSPACE_LAYOUT,
  WORKSPACE_LAYOUT_STORAGE_KEY,
  getKeyboardWorkspaceWidth,
  parseWorkspaceLayoutPreferences,
  resizeWorkspacePanel,
  resolveWorkspaceLayout,
  serializeWorkspaceLayoutPreferences,
} from "../lib/workspace-layout";

describe("workspace layout preferences", () => {
  it("uses the versioned default for missing or damaged storage", () => {
    expect(WORKSPACE_LAYOUT_STORAGE_KEY).toBe("ref-forge-workspace-layout-v1");
    expect(parseWorkspaceLayoutPreferences(null)).toEqual(DEFAULT_WORKSPACE_LAYOUT);
    expect(parseWorkspaceLayoutPreferences("{")).toEqual(DEFAULT_WORKSPACE_LAYOUT);
    expect(parseWorkspaceLayoutPreferences('{"version":2}')).toEqual(DEFAULT_WORKSPACE_LAYOUT);
  });

  it("normalizes valid persisted widths and booleans", () => {
    const parsed = parseWorkspaceLayoutPreferences(JSON.stringify({
      version: 1,
      leftWidth: 999,
      rightWidth: 100,
      leftCollapsed: true,
      rightCollapsed: false,
    }));
    expect(parsed).toEqual({
      version: 1,
      leftWidth: 360,
      rightWidth: 340,
      leftCollapsed: true,
      rightCollapsed: false,
    });
    expect(parseWorkspaceLayoutPreferences(serializeWorkspaceLayoutPreferences(parsed))).toEqual(parsed);
  });
});

describe("workspace layout constraints", () => {
  it("reserves the 560px center while resolving reference tracks", () => {
    expect(resolveWorkspaceLayout({
      ...DEFAULT_WORKSPACE_LAYOUT,
      leftWidth: 360,
      rightWidth: 640,
    }, 1400, "references")).toMatchObject({
      leftWidth: 360,
      rightWidth: 464,
      leftHandleWidth: 8,
      rightHandleWidth: 8,
      centerWidth: 560,
    });
  });

  it("uses recovery rails for collapsed panels and omits the synthesis right track", () => {
    expect(resolveWorkspaceLayout({
      ...DEFAULT_WORKSPACE_LAYOUT,
      leftCollapsed: true,
      rightCollapsed: true,
    }, 1600, "references")).toMatchObject({
      leftWidth: 0,
      rightWidth: 0,
      leftHandleWidth: 44,
      rightHandleWidth: 44,
    });
    expect(resolveWorkspaceLayout(DEFAULT_WORKSPACE_LAYOUT, 1600, "syntheses")).toMatchObject({
      leftWidth: 260,
      rightWidth: 0,
      rightHandleWidth: 0,
    });
  });

  it("clamps the dragged side without silently resizing the opposite panel", () => {
    expect(resizeWorkspacePanel(DEFAULT_WORKSPACE_LAYOUT, "left", 900, 1440, "references").leftWidth).toBe(360);
    expect(resizeWorkspacePanel(DEFAULT_WORKSPACE_LAYOUT, "right", 900, 1281, "references").rightWidth).toBe(445);
  });
});

describe("workspace layout keyboard values", () => {
  it("supports normal, shifted, edge, and reset targets", () => {
    expect(getKeyboardWorkspaceWidth(260, "ArrowRight", false, 220, 360, 260)).toBe(276);
    expect(getKeyboardWorkspaceWidth(260, "ArrowLeft", true, 220, 360, 260)).toBe(220);
    expect(getKeyboardWorkspaceWidth(260, "Home", false, 220, 360, 260)).toBe(220);
    expect(getKeyboardWorkspaceWidth(260, "End", false, 220, 360, 260)).toBe(360);
    expect(getKeyboardWorkspaceWidth(320, "reset", false, 220, 360, 260)).toBe(260);
    expect(getKeyboardWorkspaceWidth(260, "Enter", false, 220, 360, 260)).toBeNull();
  });
});
```

- [ ] **Step 2: 运行测试并确认 RED**

Run: `npm test -- tests/workspace-layout.test.ts`

Expected: FAIL because `lib/workspace-layout.ts` does not exist.

- [ ] **Step 3: 实现最小纯函数**

Create `lib/workspace-layout.ts` with these exact public values and signatures:

```ts
export const WORKSPACE_LAYOUT_STORAGE_KEY = "ref-forge-workspace-layout-v1";
export const WORKSPACE_LAYOUT_VERSION = 1 as const;
export const WORKSPACE_LEFT_DEFAULT = 260;
export const WORKSPACE_LEFT_MIN = 220;
export const WORKSPACE_LEFT_MAX = 360;
export const WORKSPACE_RIGHT_DEFAULT = 420;
export const WORKSPACE_RIGHT_MIN = 340;
export const WORKSPACE_RIGHT_MAX = 640;
export const WORKSPACE_CENTER_MIN = 560;
export const WORKSPACE_SEPARATOR_WIDTH = 8;
export const WORKSPACE_RECOVERY_RAIL_WIDTH = 44;
export const WORKSPACE_KEYBOARD_STEP = 16;
export const WORKSPACE_KEYBOARD_LARGE_STEP = 40;

export type WorkspacePanelSide = "left" | "right";
export type WorkspaceViewMode = "references" | "syntheses";
export type WorkspaceLayoutPreferences = {
  version: 1;
  leftWidth: number;
  rightWidth: number;
  leftCollapsed: boolean;
  rightCollapsed: boolean;
};
export type WorkspaceLayoutMetrics = {
  leftWidth: number;
  rightWidth: number;
  leftHandleWidth: number;
  rightHandleWidth: number;
  centerWidth: number;
};

export const DEFAULT_WORKSPACE_LAYOUT: WorkspaceLayoutPreferences;
export function parseWorkspaceLayoutPreferences(raw: string | null): WorkspaceLayoutPreferences;
export function serializeWorkspaceLayoutPreferences(value: WorkspaceLayoutPreferences): string;
export function resolveWorkspaceLayout(value: WorkspaceLayoutPreferences, containerWidth: number, view: WorkspaceViewMode): WorkspaceLayoutMetrics;
export function resizeWorkspacePanel(value: WorkspaceLayoutPreferences, side: WorkspacePanelSide, requestedWidth: number, containerWidth: number, view: WorkspaceViewMode): WorkspaceLayoutPreferences;
export function getKeyboardWorkspaceWidth(current: number, key: string, shiftKey: boolean, min: number, max: number, defaultWidth: number): number | null;
```

Implementation rules:

- Parse only a plain object with exact `version: 1`, finite numeric widths, and boolean collapse fields; any shape error returns a fresh default object.
- Static clamp runs before serialization and after parsing.
- Resolve handle widths as `44` when the matching panel is collapsed and `8` otherwise; synthesis always resolves right width and right handle to `0`.
- Reserve `560px` for center after handles. Clamp desired widths to static bounds, then reduce right toward `340`, followed by left toward `220`, until the panel budget fits.
- `resizeWorkspacePanel` uses the opposite effective panel width and current handle widths to compute the dragged side's dynamic maximum; it updates only the requested side.
- Keyboard helper returns clamped values for arrows/Home/End/reset and `null` for unhandled keys.

- [ ] **Step 4: 确认 GREEN 并提交 Task 1**

Run:

```powershell
npm test -- tests/workspace-layout.test.ts
npm run typecheck
git add lib/workspace-layout.ts tests/workspace-layout.test.ts
git commit -m "feat: 建立可调工作台布局契约 / add resizable workspace layout contract"
```

Expected: focused tests and typecheck exit 0; commit contains only Task 1 files.

### Task 2: 增加可访问分隔交互与本地化

**Files:**
- Create: `app/workspace/use-workspace-layout.ts`
- Create: `app/workspace/workspace-separator.tsx`
- Create: `tests/workspace-layout-components.test.ts`
- Modify: `lib/localization.ts`
- Modify: `tests/localization.test.ts`

**Interfaces:**
- Consumes: all Task 1 layout types/functions and constants.
- Produces: `useWorkspaceLayout(view)` returning `workspaceRef`, `preferences`, `metrics`, `workspaceStyle`, `draggingSide`, `separatorHandlers`, `togglePanel`, `restorePanel`.
- Produces: `WorkspaceSeparator` with expanded separator and collapsed recovery-button modes.
- Consumed by: Task 3 `app/page.tsx`.

- [ ] **Step 1: 写组件契约与本地化失败测试**

Create `tests/workspace-layout-components.test.ts` using `readFileSync` to require these source contracts before the files exist:

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("workspace layout interaction source", () => {
  it("keeps resize observation, storage, pointer capture, and blur cleanup in the hook", () => {
    const source = readFileSync(new URL("../app/workspace/use-workspace-layout.ts", import.meta.url), "utf8");
    expect(source).toContain("ResizeObserver");
    expect(source).toContain("WORKSPACE_LAYOUT_STORAGE_KEY");
    expect(source).toContain("setPointerCapture");
    expect(source).toContain("releasePointerCapture");
    expect(source).toContain('window.addEventListener("blur"');
  });

  it("renders an accessible separator and a real recovery button", () => {
    const source = readFileSync(new URL("../app/workspace/workspace-separator.tsx", import.meta.url), "utf8");
    expect(source).toContain('role="separator"');
    expect(source).toContain('aria-orientation="vertical"');
    expect(source).toContain("aria-valuemin");
    expect(source).toContain("aria-valuemax");
    expect(source).toContain("aria-valuenow");
    expect(source).toMatch(/collapsed[\s\S]*<button/);
  });
});
```

Extend `tests/localization.test.ts` with exact copy:

```ts
expect(uiCopy().resizeFiltersPanel).toBe("调整筛选面板宽度");
expect(uiCopy().resizeDetailsPanel).toBe("调整详情面板宽度");
expect(uiCopy().collapseFiltersPanel).toBe("收起筛选面板");
expect(uiCopy().expandFiltersPanel).toBe("展开筛选面板");
expect(uiCopy().collapseDetailsPanel).toBe("收起详情面板");
expect(uiCopy().expandDetailsPanel).toBe("展开详情面板");
expect(uiCopy().resetPanelWidth).toBe("双击恢复默认宽度");

expect(uiCopy("en").resizeFiltersPanel).toBe("Resize filters panel");
expect(uiCopy("en").resizeDetailsPanel).toBe("Resize details panel");
expect(uiCopy("en").collapseFiltersPanel).toBe("Collapse filters panel");
expect(uiCopy("en").expandFiltersPanel).toBe("Expand filters panel");
expect(uiCopy("en").collapseDetailsPanel).toBe("Collapse details panel");
expect(uiCopy("en").expandDetailsPanel).toBe("Expand details panel");
expect(uiCopy("en").resetPanelWidth).toBe("Double-click to reset width");
```

- [ ] **Step 2: 运行测试并确认 RED**

Run: `npm test -- tests/workspace-layout-components.test.ts tests/localization.test.ts`

Expected: FAIL because workspace files and localization keys are absent.

- [ ] **Step 3: 实现 hook 与分隔条**

`useWorkspaceLayout` must:

- initialize from `DEFAULT_WORKSPACE_LAYOUT`, then safely load localStorage after mount;
- observe the workspace container with `ResizeObserver` and keep its content width;
- derive `metrics` through `resolveWorkspaceLayout` and expose CSS custom properties for both widths and both handle tracks;
- persist preference changes in a guarded effect;
- retain pointer start X, start width, pointer ID and side in a ref;
- on move, invert horizontal delta for the right panel and call `resizeWorkspacePanel`;
- capture/release the pointer on the separator element, end on up/cancel/lost capture, and end on `window.blur`;
- end an active drag if the measured width enters `<=1280px`;
- route Arrow/Home/End through `getKeyboardWorkspaceWidth` and call `preventDefault` only for handled keys;
- toggle collapse without changing stored width, restore with the stored width, and reset one side to its default.

`WorkspaceSeparator` must:

- render `role="separator"`, vertical orientation, `tabIndex={0}`, localized label/title and numeric ARIA values when expanded;
- expose hook-owned pointer, keyboard and double-click handlers without duplicating calculations;
- render a `type="button"` recovery control when collapsed and omit separator numeric semantics in that mode;
- use stable directional symbols with `aria-hidden="true"`; all meaning lives in localized labels.

Add the seven exact localization keys to both language objects in `lib/localization.ts`.

- [ ] **Step 4: 确认 GREEN 并提交 Task 2**

Run:

```powershell
npm test -- tests/workspace-layout-components.test.ts tests/workspace-layout.test.ts tests/localization.test.ts
npm run typecheck
git add app/workspace/use-workspace-layout.ts app/workspace/workspace-separator.tsx lib/localization.ts tests/workspace-layout-components.test.ts tests/localization.test.ts
git commit -m "feat: 增加工作台分隔交互 / add workspace separator interactions"
```

Expected: focused tests and typecheck exit 0; no application page or CSS integration is included yet.

### Task 3: 接入三栏页面并完成响应式样式

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/globals.css`
- Modify: `tests/workspace-layout-components.test.ts`
- Create: `docs/qa/2026-07-22-resizable-workspace-layout.md`

**Interfaces:**
- Consumes: Task 2 hook and separator component.
- Produces: reference five-track layout, synthesis three-track layout, collapse controls, internal desktop scroll and responsive fallback.

- [ ] **Step 1: 增加页面/CSS 失败契约**

Extend `tests/workspace-layout-components.test.ts` to assert:

```ts
it("wires reference and synthesis grid modes without leaking splitters to responsive layouts", () => {
  const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

  expect(page).toContain("useWorkspaceLayout");
  expect(page).toContain("workspace--references");
  expect(page).toContain("workspace--syntheses");
  expect(page.match(/<WorkspaceSeparator/g)).toHaveLength(2);
  expect(page).toContain("collapseFiltersPanel");
  expect(page).toContain("collapseDetailsPanel");
  expect(css).toContain("var(--workspace-left-width)");
  expect(css).toContain("var(--workspace-right-width)");
  expect(css).toMatch(/@media \(max-width: 1280px\)[\s\S]*\.workspace-separator[\s\S]*display:\s*none/);
  expect(css).toMatch(/@media \(max-width: 820px\)[\s\S]*grid-template-columns:\s*1fr/);
});
```

- [ ] **Step 2: 运行测试并确认 RED**

Run: `npm test -- tests/workspace-layout-components.test.ts`

Expected: FAIL because `app/page.tsx` and CSS do not yet wire the new modules.

- [ ] **Step 3: 接入页面结构**

Modify `app/page.tsx` with these boundaries:

- call `useWorkspaceLayout(workspaceView)` once near the other UI state;
- set `ref={workspaceRef}`, `style={workspaceStyle}`, and mode class on the root `<main>`;
- add an icon-only `type="button"` collapse control beside the brand eyebrow without moving filter state;
- render the left `WorkspaceSeparator` immediately after the sidebar in both views;
- render the right `WorkspaceSeparator` only inside the references fragment, between gallery and detail;
- add an always-available icon-only detail collapse control at the top of the detail panel;
- pass localized labels and the correct `220-360` or `340-640` ARIA bounds;
- do not move, duplicate or reset reference/synthesis business state.

- [ ] **Step 4: 实现桌面轨道、滚动和响应式降级**

Modify `app/globals.css`:

- `.workspace--references` uses five tracks from the four CSS variables plus `minmax(560px, 1fr)`;
- `.workspace--syntheses` uses left width, left handle, and `minmax(0, 1fr)`;
- assign sidebar, gallery, separators, detail and synthesis workspace to explicit columns;
- at `>1280px`, set workspace `height: 100dvh; min-height: 0; overflow: hidden` and make content panes individually `overflow-y: auto` with `min-height: 0`;
- remove sidebar/detail hard vertical borders at desktop and render a subtle separator center line that strengthens on hover, focus-visible and dragging;
- give separators stable `8px`/CSS-variable tracks, `touch-action: none`, `cursor: col-resize`, and no text selection while dragging;
- style collapsed recovery buttons as stable icon controls, not text pills;
- hide collapsed panel contents through width/visibility/overflow classes without unmounting DOM;
- in `@media (max-width: 1280px)`, restore the current two-column layout, normal document overflow and details below; hide all separator and collapse controls;
- in `@media (max-width: 820px)`, preserve the current one-column layout and 16px padding;
- keep `prefers-reduced-motion` free of animated panel transitions.

- [ ] **Step 5: 确认自动化 GREEN**

Run:

```powershell
npm test -- tests/workspace-layout-components.test.ts tests/workspace-layout.test.ts tests/localization.test.ts
npm test
npm run typecheck
npm run lint
npm run build
git diff --check
```

Expected: all tests pass; typecheck, lint, build and diff check exit 0.

- [ ] **Step 6: 运行本地浏览器验收并记录 QA**

Start the isolated worktree server with `npm run dev -- --port 3012`. If 3012 is already occupied by this repository, reuse that process only after confirming its working directory and commit; otherwise stop the unrelated process or use 3013 and record the actual URL. Record in `docs/qa/2026-07-22-resizable-workspace-layout.md`:

- 1600x900 pointer drag left/right to min/max and center computed width `>=560`;
- keyboard Arrow/Shift/Home/End and double-click reset;
- left/right collapse and recovery without losing selected reference or active view;
- reference to synthesis to reference preserves right width;
- reload preserves widths and collapse preferences; corrupted storage falls back safely;
- desktop document/body horizontal overflow 0 and outer vertical overflow 0;
- 1280x900, 1024x768 and 390x844 have no splitters, overlap or page-level horizontal overflow;
- Chinese and English labels/tooltips are present; console error count is 0.

- [ ] **Step 7: 提交 Task 3**

Run:

```powershell
git add app/page.tsx app/globals.css tests/workspace-layout-components.test.ts docs/qa/2026-07-22-resizable-workspace-layout.md
git commit -m "feat: 接入可调三栏工作台 / wire resizable three-pane workspace"
```

Expected: commit contains the integrated UI, CSS, contract test and truthful local QA evidence.

### Task 4: 独立审查、完整验证与交付留痕

**Files:**
- Modify: `AGENTS.md`
- Modify: `docs/qa/2026-07-22-resizable-workspace-layout.md`
- Modify: `docs/progress/status.md`
- Modify: `docs/progress/timeline.md`
- Modify: `docs/progress/2026-07-22.md`
- Modify: `docs/superpowers/plans/2026-07-22-resizable-workspace-layout.md`

**Interfaces:**
- Consumes: Tasks 1-3 feature branch and QA evidence.
- Produces: reviewed, merged, pushed, deployed and production-verified Round 12 with branch/worktree cleanup.

- [ ] **Step 1: 完成逐任务和全分支审查**

- For each Task 1-3 commit range, generate a review package and require both spec-compliance and code-quality approval.
- Dispatch one broad final reviewer against `git merge-base main HEAD..HEAD`.
- Fix every Critical or Important finding through one focused fix agent, rerun covering tests, and re-review.
- Record all agents in the 2026-07-22 `Delegation Log` with purpose, scope, result and closure.

- [ ] **Step 2: 运行最终功能分支门禁**

Run fresh:

```powershell
npm test
npm run typecheck
npm run lint
npm run build
git diff --check main...HEAD
git status --short
```

Expected: all commands exit 0 and feature worktree is clean after documentation commit.

- [ ] **Step 3: 更新实现状态文档**

- Set the feature-branch stage to `Round 12 implemented and locally verified; merge pending`.
- Record exact test file/test counts, browser viewport metrics, localStorage checks, console errors, commits, review verdicts and any minor residual risk.
- State explicitly that no dependency, API, D1, migration or production data changed.
- Check completed plan steps as evidence becomes real; do not pre-check deployment or production steps.

Commit:

```powershell
git add AGENTS.md docs/qa/2026-07-22-resizable-workspace-layout.md docs/progress/status.md docs/progress/timeline.md docs/progress/2026-07-22.md docs/superpowers/plans/2026-07-22-resizable-workspace-layout.md
git commit -m "docs: 记录第十二轮实现验证 / record round 12 implementation verification"
```

- [ ] **Step 4: 使用 finishing-a-development-branch 合并并复验**

The user's standing choice is local merge and cleanup after verification. From the main worktree:

```powershell
git checkout main
git merge --ff-only codex/round-12-resizable-workspace
npm test
npm run typecheck
npm run lint
npm run build
git push origin main
```

Expected: fast-forward merge, merged-main gates exit 0, and GitHub `main` advances to the verified commit.

- [ ] **Step 5: 部署 Sites 并验证生产布局**

- Synchronize Sites source to the merged `main`, save and deploy one new version.
- On the authenticated production page, repeat the read-only 1600px drag/keyboard/collapse/reload checks and 1280px/390px responsive checks.
- Confirm console error 0, document/body horizontal overflow 0, layout preference persistence, and no reference/synthesis writes.
- Record Sites source SHA, version ID, deployment ID/status and exact production metrics in QA and progress docs.

- [ ] **Step 6: 收口文档与清理分支/worktree**

- Set stage to `Round 12 complete; Round 13 design-ready` only after production verification.
- Commit and push final deployment/production evidence.
- Remove `.worktrees/round-12-resizable-workspace`, prune worktrees, delete local and remote feature branch if present.
- Verify `git worktree list`, `git branch -vv`, `git status --short --branch`, and `git rev-parse main origin/main` show one clean synchronized main line.

## Definition of Done

- [ ] Pure layout helpers prove parsing, clamping, center-width safety, collapse and keyboard behavior.
- [ ] Desktop reference view has two accessible separators; synthesis view has only the left separator.
- [ ] Pointer, keyboard, double-click, collapse/recovery and refresh persistence work locally and in production.
- [ ] Desktop outer scrolling is removed without hiding pane scrolling.
- [ ] 1280px, 1024px and 390px responsive layouts remain non-draggable and free of page-level overflow.
- [ ] No API, D1, migration, dependency or production business-data change occurs.
- [ ] Tests, typecheck, lint, build, task reviews, final review, merged-main verification and production smoke pass.
- [ ] Three progress documents, QA evidence, AGENTS stage, plan checkboxes, GitHub main, Sites deployment and branch cleanup agree.
