# Round 15 Protected High-Fidelity Workstation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild RefForge's workstation to closely match the approved art direction while preserving every existing product, data, safety, backup, comparison, accessibility, and responsive contract.

**Architecture:** Keep the existing React page state and domain/data layers intact. Introduce pure layout migration and score-profile helpers, one shared preview renderer, lightweight local category SVG art, and focused presentational changes to the existing toolbar, cards, comparison dock, detail inspector, page shell, and CSS. Every behavior-bearing change starts with a focused failing test; visual fidelity is closed with measured same-viewport browser evidence rather than detector output alone.

**Tech Stack:** React 19, TypeScript 5.9, vinext/Vite, Vitest + Testing Library, lucide-react, CSS, local SVG assets, browser visual QA, Cloudflare Sites deployment.

## Global Constraints

- Stable production baseline is Sites version 18 from runtime source `4ec8659` until Round 15 is fully verified and deployment is explicitly authorized.
- Do not modify API routes, D1 schema, migrations, reference/synthesis domain models, source policy, or Backup v1 schema.
- Keep `workspace_layout.version: 1`; visual-generation migration must not become Backup schema versioning.
- Keep filters single-select and keep reference detail selection distinct from explicit comparison selection.
- Keep ordered comparison at 2-4 references; order is selection order, with no Ctrl/Shift requirement and no drag reordering.
- Keep compact/comfortable grid density; do not add a horizontal list mode.
- Real safe `preview_url` wins; failed or absent previews use local original category art; no third-party media is rehosted.
- Radar data uses existing fields only: rating, reference value, transformability, production readiness, and safety as `6 - copyright risk`.
- At 1480-1600px default desktop state, the center track must occupy at least 60% of the workspace.
- At `<=820px`, density control stays hidden, cards use comfortable touch geometry, and primary touch targets remain at least `44x44px`.
- No new runtime dependency.
- All user-facing copy remains bilingual through `lib/localization.ts`.
- Every implementation task uses TDD and ends in one focused Chinese + English commit.
- Every QA record uses a unique `QA-R15-` prefix and is deleted before delivery.

## File and Responsibility Map

### New files

- `lib/reference-art.ts` — exhaustive asset-category-to-local-art mapping and public fallback resolver.
- `app/workspace/reference-preview.tsx` — shared remote-preview/failure/category-art rendering used by cards and comparison dock.
- `lib/reference-score-profile.ts` — pure five-axis score derivation, including inverted copyright-risk safety.
- `app/workspace/score-radar.tsx` — dependency-free accessible SVG radar display with incomplete-score fallback.
- `tests/reference-art.test.ts` — exhaustive mapping and unknown-category fallback contract.
- `tests/reference-preview.test.tsx` — remote preview, fallback, failed load, and changed-URL retry contract.
- `tests/reference-score-profile.test.ts` — exact score and safety derivation contract.
- `tests/score-radar.test.tsx` — SVG accessibility and incomplete-data behavior.
- `tests/workstation-visual-contract.test.ts` — static CSS/asset checks for the protected-A shell, grid, texture, touch, and reduced-motion contracts.
- `public/art/reference-character.svg`
- `public/art/reference-environment.svg`
- `public/art/reference-prop.svg`
- `public/art/reference-ui-hud.svg`
- `public/art/reference-vfx.svg`
- `public/art/reference-material-texture.svg`
- `public/art/reference-animation.svg`
- `public/art/reference-audio.svg`
- `public/art/reference-generic.svg`
- `docs/qa/2026-08-01-round-15-design-qa.md` — measured local visual/interaction evidence and cleanup record.
- `docs/qa/2026-08-01-round-15-target-comparison.png` — same-viewport target/current comparison artifact.

### Existing files to modify

- `lib/workspace-layout.ts` — new center-first defaults/bounds, current storage key, legacy key, and pure migration.
- `app/workspace/use-workspace-layout.ts` — load current/legacy preferences through the pure migration and persist only the Round 15 key.
- `app/page.tsx` — use exported splitter bounds, add presentational shell classes, pass comparison position, and retain existing state/events.
- `lib/localization.ts` — add score-profile and comparison-selection guidance strings in Chinese and English.
- `app/workspace/reference-toolbar.tsx` — reshape the existing controls into one command rail without changing callbacks.
- `app/workspace/reference-card.tsx` — use shared preview art, image-led content hierarchy, and ordered comparison marker.
- `app/workspace/reference-detail.tsx` — add the score radar beside the numeric matrix and flatten section presentation.
- `app/workspace/detail-section.tsx` — keep disclosure semantics while simplifying surface markup/classes.
- `app/workspace/comparison-dock.tsx` — use shared previews and strengthen count, order, minimum, and next-step feedback.
- `app/globals.css` — protected-A tokens, graphite visibility, center-first grid, card/rail/inspector/dock/form/modal/synthesis styling, breakpoints, focus, touch, and reduced-motion rules.
- `tests/workspace-layout.test.ts` — exact new defaults, 60% center result, migration, resize, and keyboard contracts.
- `tests/workspace-layout-components.test.ts` — new splitter min/max/default behavior.
- `tests/backup.test.ts` — Backup v1 still round-trips layout version 1 after visual migration.
- `tests/reference-card.test.tsx` — category-art and ordered comparison state.
- `tests/reference-toolbar.test.tsx` — command-rail semantics and unchanged callback behavior.
- `tests/reference-detail.test.tsx` — numeric matrix plus score-profile integration.
- `tests/comparison-dock.test.tsx` — ordered art thumbnails and explicit guidance.
- `tests/localization.test.ts` — new bilingual copy.
- `tests/visual-assets.test.ts` — category asset existence/size and updated mobile/card rules.
- `docs/progress/status.md`, `docs/progress/timeline.md`, `docs/progress/2026-08-01.md` — mandatory stage, verification, review, deployment, and residual-risk trace.

---

### Task 1: Center-First Layout and Compatible Preference Migration

**Files:**
- Modify: `lib/workspace-layout.ts`
- Modify: `app/workspace/use-workspace-layout.ts`
- Modify: `app/page.tsx`
- Modify: `tests/workspace-layout.test.ts`
- Modify: `tests/workspace-layout-components.test.ts`
- Modify: `tests/backup.test.ts`

**Interfaces:**
- Produces: `LEGACY_WORKSPACE_LAYOUT_STORAGE_KEY`, current `WORKSPACE_LAYOUT_STORAGE_KEY`, defaults `220/352`, bounds `208-320/336-520`, center minimum `640`, and `migrateWorkspaceLayoutPreferences(currentRaw, legacyRaw): WorkspaceLayoutPreferences`.
- Preserves: `WorkspaceLayoutPreferences.version` remains literal `1`; `parseWorkspaceLayoutPreferences` and `serializeWorkspaceLayoutPreferences` remain Backup-compatible.
- Consumed later by: page splitter props, visual measurement, Backup preference read/write, and local browser refresh checks.

- [ ] **Step 1: Write failing layout and migration tests**

Add exact assertions to `tests/workspace-layout.test.ts`:

```ts
import {
  LEGACY_WORKSPACE_LAYOUT_STORAGE_KEY,
  WORKSPACE_LEFT_DEFAULT,
  WORKSPACE_RIGHT_DEFAULT,
  migrateWorkspaceLayoutPreferences,
} from "../lib/workspace-layout";

it("uses protected-A defaults and keeps a 60 percent center at 1480px", () => {
  expect(WORKSPACE_LEFT_DEFAULT).toBe(220);
  expect(WORKSPACE_RIGHT_DEFAULT).toBe(352);
  expect(resolveWorkspaceLayout(DEFAULT_WORKSPACE_LAYOUT, 1480, "references")).toEqual({
    leftWidth: 220,
    rightWidth: 352,
    leftHandleWidth: 8,
    rightHandleWidth: 8,
    centerWidth: 892,
  });
});

it("resets the exact Round 14 default but preserves collapse state", () => {
  expect(migrateWorkspaceLayoutPreferences(null, JSON.stringify({
    version: 1,
    leftWidth: 260,
    rightWidth: 420,
    leftCollapsed: true,
    rightCollapsed: false,
  }))).toEqual({
    version: 1,
    leftWidth: 220,
    rightWidth: 352,
    leftCollapsed: true,
    rightCollapsed: false,
  });
});

it("preserves a custom legacy layout and clamps it to protected-A bounds", () => {
  expect(migrateWorkspaceLayoutPreferences(null, JSON.stringify({
    version: 1,
    leftWidth: 300,
    rightWidth: 500,
    leftCollapsed: false,
    rightCollapsed: true,
  }))).toEqual({
    version: 1,
    leftWidth: 300,
    rightWidth: 500,
    leftCollapsed: false,
    rightCollapsed: true,
  });
});
```

- [ ] **Step 2: Run focused tests and verify red**

Run:

```bash
npm test -- tests/workspace-layout.test.ts tests/workspace-layout-components.test.ts tests/backup.test.ts
```

Expected: FAIL because the new constants and migration function do not exist and the current defaults are `260/420`.

- [ ] **Step 3: Implement the pure layout contract**

Refactor candidate parsing privately and expose the migration in `lib/workspace-layout.ts`:

```ts
export const LEGACY_WORKSPACE_LAYOUT_STORAGE_KEY = "ref-forge-workspace-layout-v1";
export const WORKSPACE_LAYOUT_STORAGE_KEY = "ref-forge-workspace-layout-r15-v1";
export const WORKSPACE_LAYOUT_VERSION = 1 as const;
export const WORKSPACE_LEFT_DEFAULT = 220;
export const WORKSPACE_LEFT_MIN = 208;
export const WORKSPACE_LEFT_MAX = 320;
export const WORKSPACE_RIGHT_DEFAULT = 352;
export const WORKSPACE_RIGHT_MIN = 336;
export const WORKSPACE_RIGHT_MAX = 520;
export const WORKSPACE_CENTER_MIN = 640;

const LEGACY_LEFT_DEFAULT = 260;
const LEGACY_RIGHT_DEFAULT = 420;

export function migrateWorkspaceLayoutPreferences(
  currentRaw: string | null,
  legacyRaw: string | null,
): WorkspaceLayoutPreferences {
  const current = parseWorkspaceLayoutCandidate(currentRaw);
  if (current) return normalizeWorkspaceLayout(current);

  const legacy = parseWorkspaceLayoutCandidate(legacyRaw);
  if (!legacy) return createDefaultWorkspaceLayout();

  const usedLegacyDefaults =
    legacy.leftWidth === LEGACY_LEFT_DEFAULT &&
    legacy.rightWidth === LEGACY_RIGHT_DEFAULT;

  return normalizeWorkspaceLayout({
    ...legacy,
    leftWidth: usedLegacyDefaults ? WORKSPACE_LEFT_DEFAULT : legacy.leftWidth,
    rightWidth: usedLegacyDefaults ? WORKSPACE_RIGHT_DEFAULT : legacy.rightWidth,
  });
}
```

`parseWorkspaceLayoutCandidate` must return `null` for missing, malformed, wrong-version, non-finite, or wrong-boolean payloads. `parseWorkspaceLayoutPreferences` returns the candidate or new defaults, preserving its public signature.

- [ ] **Step 4: Connect the hook and splitter bounds**

In `useWorkspaceLayout`, read both keys once and persist only the current key:

```ts
setPreferences(migrateWorkspaceLayoutPreferences(
  window.localStorage.getItem(WORKSPACE_LAYOUT_STORAGE_KEY),
  window.localStorage.getItem(LEGACY_WORKSPACE_LAYOUT_STORAGE_KEY),
));
```

In `app/page.tsx`, replace literal splitter min/max values with `WORKSPACE_LEFT_MIN`, `WORKSPACE_LEFT_MAX`, `WORKSPACE_RIGHT_MIN`, and `WORKSPACE_RIGHT_MAX`. Do not change drag, keyboard, collapse, recovery, synthesis-view, or `applyPreferences` event flow.

- [ ] **Step 5: Lock Backup v1 compatibility**

Add to `tests/backup.test.ts`:

```ts
expect(parsed.backup.preferences?.workspace_layout).toMatchObject({
  version: 1,
  leftWidth: 220,
  rightWidth: 352,
});
expect(BACKUP_SCHEMA_VERSION).toBe(1);
```

Use a fixture whose layout is serialized through the updated public serializer; do not change `RefForgeBackupV1`, `BackupDevicePreferences`, or accepted key lists.

- [ ] **Step 6: Run focused and type gates**

Run:

```bash
npm test -- tests/workspace-layout.test.ts tests/workspace-layout-components.test.ts tests/backup.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add lib/workspace-layout.ts app/workspace/use-workspace-layout.ts app/page.tsx tests/workspace-layout.test.ts tests/workspace-layout-components.test.ts tests/backup.test.ts
git commit -m "feat: 重设中心优先工作台布局 / prioritize the workstation canvas"
```

### Task 2: Original Category Art and Shared Preview Fallback

**Files:**
- Create: `lib/reference-art.ts`
- Create: `app/workspace/reference-preview.tsx`
- Create: `tests/reference-art.test.ts`
- Create: `tests/reference-preview.test.tsx`
- Create: nine `public/art/reference-*.svg` files listed in the file map
- Modify: `app/workspace/reference-card.tsx`
- Modify: `app/workspace/comparison-dock.tsx`
- Modify: `tests/reference-card.test.tsx`
- Modify: `tests/comparison-dock.test.tsx`
- Modify: `tests/visual-assets.test.ts`

**Interfaces:**
- Produces: `REFERENCE_ART_BY_CATEGORY: Record<AssetCategory, string>` and `referenceArtFor(category: AssetCategory | string): string`.
- Produces: `ReferencePreview({ reference, language, categoryLabelVisible?, className?, overlay? })` with remote-first and local-fallback rendering.
- Preserves: failed remote URL is retried when `reference.preview_url` changes for the same record.
- Consumed later by: cards, comparison dock, visual QA, seed state, and multi-category fixtures.

- [ ] **Step 1: Write exhaustive failing mapping tests**

Create `tests/reference-art.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { ASSET_CATEGORIES } from "../lib/reference";
import { REFERENCE_ART_BY_CATEGORY, referenceArtFor } from "../lib/reference-art";

it("maps every asset category to a local SVG", () => {
  expect(Object.keys(REFERENCE_ART_BY_CATEGORY).sort()).toEqual([...ASSET_CATEGORIES].sort());
  for (const category of ASSET_CATEGORIES) {
    expect(referenceArtFor(category)).toMatch(/^\/art\/reference-[a-z-]+\.svg$/);
  }
});

it("uses the generic local art for an unexpected runtime value", () => {
  expect(referenceArtFor("unexpected")).toBe("/art/reference-generic.svg");
});
```

- [ ] **Step 2: Write failing preview component tests**

Create `tests/reference-preview.test.tsx` with remote, absent, failure, and changed-URL cases:

```tsx
const { container, rerender } = render(
  <ReferencePreview reference={makeReference({ preview_url: null, asset_category: "ui_hud" })} language="en" />,
);
expect(container.querySelector('[data-reference-art="ui_hud"] img')?.getAttribute("src"))
  .toBe("/art/reference-ui-hud.svg");

const broken = makeReference({ preview_url: "https://example.com/broken.jpg" });
rerender(<ReferencePreview reference={broken} language="en" />);
fireEvent.error(container.querySelector("img.reference-preview__remote") as HTMLImageElement);
expect(container.querySelector("img.reference-preview__remote")).toBeNull();

rerender(<ReferencePreview reference={{ ...broken, preview_url: "https://example.com/fixed.jpg" }} language="en" />);
expect(container.querySelector("img.reference-preview__remote")?.getAttribute("src"))
  .toBe("https://example.com/fixed.jpg");
```

- [ ] **Step 3: Run focused tests and verify red**

Run:

```bash
npm test -- tests/reference-art.test.ts tests/reference-preview.test.tsx tests/reference-card.test.tsx tests/comparison-dock.test.tsx
```

Expected: FAIL because the mapping and shared component do not exist.

- [ ] **Step 4: Create the mapping and shared component**

Use this exact mapping in `lib/reference-art.ts`:

```ts
export const REFERENCE_ART_BY_CATEGORY: Record<AssetCategory, string> = {
  character: "/art/reference-character.svg",
  environment: "/art/reference-environment.svg",
  prop: "/art/reference-prop.svg",
  ui_hud: "/art/reference-ui-hud.svg",
  vfx: "/art/reference-vfx.svg",
  material_texture: "/art/reference-material-texture.svg",
  animation: "/art/reference-animation.svg",
  audio: "/art/reference-audio.svg",
};

export function referenceArtFor(category: AssetCategory | string) {
  return REFERENCE_ART_BY_CATEGORY[category as AssetCategory] ?? "/art/reference-generic.svg";
}
```

`ReferencePreview` must always render the local art as the stable base layer, render a decorative remote image above it only while the URL has not failed, show the localized category badge only when requested, and render `overlay` after the images. Keep both images `alt=""` because the surrounding card/dock already supplies the accessible name.

- [ ] **Step 5: Create the nine original SVG textures**

Create viewBox `0 0 1600 900` SVGs with a shared dark graphite base, subtle grain/filter, no embedded text, no logo, and these distinct motifs:

| File | Motif | Accent |
|---|---|---|
| `reference-character.svg` | abstract gesture arcs and joint nodes | muted coral |
| `reference-environment.svg` | perspective grid, horizon layers, fog | desaturated teal |
| `reference-prop.svg` | exploded structural blocks and axes | warm brass |
| `reference-ui-hud.svg` | alignment grid, modular panels, scan line | cool cyan |
| `reference-vfx.svg` | particle stream and energy rings | violet-teal |
| `reference-material-texture.svg` | sample tiles, grain and relief contours | mineral green |
| `reference-animation.svg` | onion-skin arcs and timing ticks | amber-green |
| `reference-audio.svg` | layered waveform and frequency bands | blue-green |
| `reference-generic.svg` | neutral drafting grid and graphite bloom | neutral teal |

Use opacity below `0.42` for large accent shapes and keep the center/lower title-safe region below `0.28` contrast against the graphite base. Each file must remain below `120KB`; total size must remain below `700KB`.

- [ ] **Step 6: Replace duplicate fallback implementations**

In `ReferenceCard` and `ComparisonDock`, remove their local `failedPreviewUrl` logic and render `ReferencePreview`. Keep the card's category badge and comparison marker through `categoryLabelVisible` and `overlay`; keep the dock thumbnail compact. Do not change activation, pinning, checkbox, remove, collapse, or retry semantics.

- [ ] **Step 7: Add asset integrity tests**

Extend `tests/visual-assets.test.ts` to read every mapped asset, assert `<svg`, `viewBox="0 0 1600 900"`, no `<text`, per-file size `<=120 * 1024`, and total size `<=700 * 1024`.

- [ ] **Step 8: Run focused and type gates**

Run:

```bash
npm test -- tests/reference-art.test.ts tests/reference-preview.test.tsx tests/reference-card.test.tsx tests/comparison-dock.test.tsx tests/visual-assets.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add lib/reference-art.ts app/workspace/reference-preview.tsx app/workspace/reference-card.tsx app/workspace/comparison-dock.tsx public/art/reference-*.svg tests/reference-art.test.ts tests/reference-preview.test.tsx tests/reference-card.test.tsx tests/comparison-dock.test.tsx tests/visual-assets.test.ts
git commit -m "feat: 增加原创分类纹理回退 / add original category art fallbacks"
```

### Task 3: Protected-A Visual Foundation and Three-Pane Shell

**Files:**
- Modify: `app/globals.css`
- Modify: `app/page.tsx`
- Create: `tests/workstation-visual-contract.test.ts`
- Modify: `tests/visual-assets.test.ts`

**Interfaces:**
- Produces: protected-A CSS tokens and shell classes for the research rail, canvas, inspector, separators, background, and scroll surfaces.
- Preserves: page state, DOM order, workspace view switch, filter values, splitter elements, and mobile stacking.
- Consumed later by: command rail, cards, detail inspector, comparison dock, forms, synthesis surfaces, and visual QA.

- [ ] **Step 1: Write failing shell-contract tests**

Create `tests/workstation-visual-contract.test.ts` and read `app/globals.css` as text:

```ts
it("defines the protected-A material tokens and visible graphite layers", () => {
  expect(css).toContain("--canvas-graphite: #090d0f");
  expect(css).toContain("--surface-rail: rgba(14, 20, 21, 0.9)");
  expect(css).toMatch(/body[\s\S]*workbench-graphite\.webp/);
  expect(css).toMatch(/\.gallery-pane[\s\S]*background:\s*rgba\(9, 13, 15, 0\.38\)/);
});

it("uses the center-first desktop tracks", () => {
  expect(css).toMatch(/grid-template-columns:[^;]*--workspace-left-width[^;]*--workspace-right-width/);
  expect(css).toMatch(/@media \(min-width: 1281px\)/);
});
```

- [ ] **Step 2: Run the new test and verify red**

Run:

```bash
npm test -- tests/workstation-visual-contract.test.ts tests/visual-assets.test.ts
```

Expected: FAIL because the new token names and lower-opacity gallery surface are absent.

- [ ] **Step 3: Establish the token and background system**

Define one authoritative root token set in `app/globals.css`:

```css
:root {
  --canvas-graphite: #090d0f;
  --surface-rail: rgba(14, 20, 21, 0.9);
  --surface-canvas: rgba(9, 13, 15, 0.38);
  --surface-inspector: rgba(13, 18, 19, 0.88);
  --surface-command: rgba(18, 25, 26, 0.82);
  --surface-card: rgba(15, 21, 22, 0.94);
  --line-subtle: rgba(153, 178, 173, 0.16);
  --line-strong: rgba(151, 207, 190, 0.34);
  --signal: #63d4b1;
  --signal-strong: #8ce5c7;
  --signal-soft: rgba(99, 212, 177, 0.12);
  --text-primary: #edf4f0;
  --text-secondary: #aab8b3;
  --text-tertiary: #75837f;
}
```

Compose `body` from graphite image, dark radial light, and base color. Keep `.gallery-pane` at `rgba(9, 13, 15, 0.38)` so the texture remains visible; keep text-bearing controls/cards on the stronger surface tokens.

- [ ] **Step 4: Flatten the three-pane shell**

Add presentational classes in `app/page.tsx` only where needed (`research-rail`, `reference-canvas`, `reference-inspector`). Preserve the existing `<aside>`, `<section>`, `WorkspaceSeparator`, and render conditions. In CSS:

- remove nested outer card borders from the rail and inspector;
- use one continuous vertical rail surface and one continuous inspector surface;
- reduce panel padding while retaining focus clearance;
- keep scrollbars local to canvas and inspector on desktop;
- retain recovery rails and splitter hit targets;
- use borders/brightness instead of shadows for permanent surfaces.

- [ ] **Step 5: Preserve motion and focus contracts**

Keep visible `:focus-visible` outlines and add all new transform/opacity transitions to the existing `prefers-reduced-motion: reduce` block. Do not add background motion, animated grain, or decorative looping animation.

- [ ] **Step 6: Run focused, lint, and type gates**

Run:

```bash
npm test -- tests/workstation-visual-contract.test.ts tests/visual-assets.test.ts tests/workspace-layout-components.test.ts
npm run typecheck
npm run lint
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add app/globals.css app/page.tsx tests/workstation-visual-contract.test.ts tests/visual-assets.test.ts
git commit -m "feat: 重建石墨工作台视觉基底 / rebuild the graphite workstation shell"
```

### Task 4: Unified Command Rail and Image-Led Reference Cards

**Files:**
- Modify: `app/workspace/reference-toolbar.tsx`
- Modify: `app/workspace/reference-card.tsx`
- Modify: `app/globals.css`
- Modify: `tests/reference-toolbar.test.tsx`
- Modify: `tests/reference-card.test.tsx`
- Modify: `tests/workstation-visual-contract.test.ts`
- Modify: `tests/visual-assets.test.ts`

**Interfaces:**
- Consumes: existing `ReferenceToolbarProps`, `ReferenceCardProps`, `ReferencePreview`, density preferences, and unchanged callbacks.
- Produces: a single `reference-command-rail` visual hierarchy and card classes that target four compact columns / three comfortable columns.
- Preserves: `/` search focus, sorting, data management, comparison start, add, density radiogroup, activation, pinning, selection, and all disabled states.

- [ ] **Step 1: Write failing semantic and visual tests**

Extend component tests:

```tsx
const { container } = render(<ReferenceToolbar {...makeProps()} />);
expect(container.querySelector(".reference-command-rail")).toBeTruthy();
expect(screen.getByRole("radiogroup", { name: "Density" })).toBeTruthy();
expect(screen.getByRole("button", { name: "Add reference" })).toBeTruthy();

const card = screen.getByRole("button", { name: "Kenney UI Pack" });
expect(card.closest("article")?.classList.contains("reference-card--compact")).toBe(true);
expect(card.querySelector(".reference-preview")).toBeTruthy();
```

Extend the CSS contract test:

```ts
expect(css).toMatch(/\.workspace--density-compact \.reference-grid\s*\{[^}]*minmax\(214px, 1fr\)/);
expect(css).toMatch(/\.workspace--density-comfortable \.reference-grid\s*\{[^}]*minmax\(282px, 1fr\)/);
```

- [ ] **Step 2: Run focused tests and verify red**

Run:

```bash
npm test -- tests/reference-toolbar.test.tsx tests/reference-card.test.tsx tests/workstation-visual-contract.test.ts tests/visual-assets.test.ts
```

Expected: FAIL on the new command-rail class, preview hierarchy, and grid values.

- [ ] **Step 3: Reshape the toolbar without changing props**

Keep the existing `ReferenceToolbarProps`. Change only grouping and class names:

- `header.toolbar` becomes `header.toolbar.reference-command-rail`;
- heading/result count stays first;
- search receives the largest flexible track;
- sort and density form the secondary cluster;
- data management and comparison use restrained secondary treatment;
- add reference remains the single filled primary action;
- controls may wrap below 1280px but retain DOM order and accessible labels.

- [ ] **Step 4: Rebalance the card hierarchy**

Keep the existing `article > selection button + pin button` semantics. Make the preview 16:9 and visually dominant; place category as a small overlay; reduce card body gaps; keep title at two lines; keep source, license/public/quality, score summary, quality signals, and density-dependent tags. Remove large pure category fills because `ReferencePreview` now supplies art.

Use these desktop grid targets:

```css
.workspace--density-compact .reference-grid {
  grid-template-columns: repeat(auto-fit, minmax(214px, 1fr));
  gap: 10px;
}

.workspace--density-comfortable .reference-grid {
  grid-template-columns: repeat(auto-fit, minmax(282px, 1fr));
  gap: 14px;
}
```

Cap cards from stretching beyond the intended image-wall rhythm by applying a canvas-specific maximum only when unused grid space would otherwise produce oversized cards. Do not hardcode a fixed column count at widths where it causes overflow.

- [ ] **Step 5: Keep density and mobile semantics**

Compact hides only secondary tag preview; comfortable shows it. At `<=820px`, hide density controls, force tag preview visible, use comfortable preview/body spacing, and preserve pin/control targets at `44x44px`.

- [ ] **Step 6: Run focused and interaction tests**

Run:

```bash
npm test -- tests/reference-toolbar.test.tsx tests/reference-card.test.tsx tests/reference-preview.test.tsx tests/workstation-visual-contract.test.ts tests/visual-assets.test.ts tests/workspace-shortcuts.test.ts
npm run typecheck
npm run lint
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add app/workspace/reference-toolbar.tsx app/workspace/reference-card.tsx app/globals.css tests/reference-toolbar.test.tsx tests/reference-card.test.tsx tests/workstation-visual-contract.test.ts tests/visual-assets.test.ts
git commit -m "feat: 重做命令轨道与图像型参考卡 / rebuild command rail and image-led cards"
```

### Task 5: Accessible Score Radar and Continuous Detail Inspector

**Files:**
- Create: `lib/reference-score-profile.ts`
- Create: `app/workspace/score-radar.tsx`
- Create: `tests/reference-score-profile.test.ts`
- Create: `tests/score-radar.test.tsx`
- Modify: `app/workspace/reference-detail.tsx`
- Modify: `app/workspace/detail-section.tsx`
- Modify: `lib/localization.ts`
- Modify: `tests/reference-detail.test.tsx`
- Modify: `tests/localization.test.ts`
- Modify: `app/globals.css`

**Interfaces:**
- Produces: `ReferenceScoreAxis`, `ReferenceScoreProfile`, and `buildReferenceScoreProfile(reference, labels)`.
- Produces: `ScoreRadar({ profile, title, incompleteLabel })` that renders a labeled SVG only when all five scores exist.
- Preserves: numeric matrix as authoritative, section order, disclosure state, quality navigation, edit/delete events, and bilingual labels.

- [ ] **Step 1: Write failing score derivation tests**

Create `tests/reference-score-profile.test.ts`:

```ts
const labels = {
  rating: "Rating",
  referenceValue: "Reference value",
  transformability: "Transformability",
  productionReadiness: "Production readiness",
  safety: "Safety",
};
const profile = buildReferenceScoreProfile(makeReference({
  rating: 4,
  reference_value_score: 5,
  transformability_score: 3,
  production_readiness_score: 2,
  copyright_risk_score: 1,
}), labels);

expect(profile.axes.map((axis) => axis.value)).toEqual([4, 5, 3, 2, 5]);
expect(profile.complete).toBe(true);
expect(buildReferenceScoreProfile(makeReference({ rating: null }), labels).complete).toBe(false);
```

- [ ] **Step 2: Write failing radar accessibility tests**

Create `tests/score-radar.test.tsx`:

```tsx
render(<ScoreRadar profile={completeProfile} title="Score profile" incompleteLabel="Complete all five scores" />);
expect(screen.getByRole("img", { name: /Score profile.*Rating 4.*Safety 5/ })).toBeTruthy();
expect(document.querySelector("polygon[data-score-polygon]")).toBeTruthy();

render(<ScoreRadar profile={incompleteProfile} title="Score profile" incompleteLabel="Complete all five scores" />);
expect(screen.getByText("Complete all five scores")).toBeTruthy();
expect(document.querySelector("polygon[data-score-polygon]")).toBeNull();
```

- [ ] **Step 3: Run focused tests and verify red**

Run:

```bash
npm test -- tests/reference-score-profile.test.ts tests/score-radar.test.tsx tests/reference-detail.test.tsx tests/localization.test.ts
```

Expected: FAIL because the helper, component, and new localized labels do not exist.

- [ ] **Step 4: Implement the pure profile helper**

Define axes in this exact order: `rating`, `reference_value`, `transformability`, `production_readiness`, `safety`. Normalize only integer values 1-5; return `null` otherwise. Derive safety only when copyright risk is present:

```ts
const copyrightRisk = score(reference.copyright_risk_score);
const safety = copyrightRisk === null ? null : 6 - copyrightRisk;
const axes: ReferenceScoreAxis[] = [
    { key: "rating", label: labels.rating, value: score(reference.rating) },
    { key: "reference_value", label: labels.referenceValue, value: score(reference.reference_value_score) },
    { key: "transformability", label: labels.transformability, value: score(reference.transformability_score) },
    { key: "production_readiness", label: labels.productionReadiness, value: score(reference.production_readiness_score) },
    { key: "safety", label: labels.safety, value: safety },
];
return {
  axes,
  complete: axes.every((axis) => axis.value !== null),
};
```

- [ ] **Step 5: Implement the dependency-free radar**

Use a `viewBox="0 0 200 180"` SVG, five concentric polygons, five axis lines, one filled score polygon, and five labels. Calculate points with `Math.cos`/`Math.sin`; do not add a chart dependency. The SVG `aria-label` must concatenate localized title and every `label value`. If incomplete, render only the localized fallback and no score polygon.

- [ ] **Step 6: Integrate radar and flatten detail sections**

Add bilingual copy keys `scoreProfile`, `safetyScore`, and `scoreProfileIncomplete`. In `ReferenceDetail`, build the profile and render:

```tsx
<div className="score-inspector-grid">
  <ScoreRadar
    profile={scoreProfile}
    title={copy.scoreProfile}
    incompleteLabel={copy.scoreProfileIncomplete}
  />
  <div className="score-summary">{/* existing five exact numbers */}</div>
</div>
```

Keep section order exactly: source/safety, score matrix, quality checklist, tag axes, inspiration extraction. Restyle `DetailSection` as divided rows in one inspector surface; keep `button`, `aria-controls`, `aria-expanded`, fixed source section, summaries, and 44px toggles.

- [ ] **Step 7: Run focused, type, and lint gates**

Run:

```bash
npm test -- tests/reference-score-profile.test.ts tests/score-radar.test.tsx tests/reference-detail.test.tsx tests/localization.test.ts
npm run typecheck
npm run lint
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add lib/reference-score-profile.ts app/workspace/score-radar.tsx app/workspace/reference-detail.tsx app/workspace/detail-section.tsx lib/localization.ts app/globals.css tests/reference-score-profile.test.ts tests/score-radar.test.tsx tests/reference-detail.test.tsx tests/localization.test.ts
git commit -m "feat: 增加评分雷达与连续检查器 / add score radar and continuous inspector"
```

### Task 6: Unmistakable Ordered Comparison Mode

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/workspace/reference-card.tsx`
- Modify: `app/workspace/comparison-dock.tsx`
- Modify: `lib/localization.ts`
- Modify: `app/globals.css`
- Modify: `tests/reference-card.test.tsx`
- Modify: `tests/comparison-dock.test.tsx`
- Modify: `tests/localization.test.ts`
- Modify: `tests/synthesis-selection.test.ts`

**Interfaces:**
- Adds: `comparisonPosition: number | null` to `ReferenceCardProps`.
- Preserves: `ComparisonSelectionState`, maximum 4, minimum 2 for handoff, selection-order semantics, cancellation, collapse-on-Escape, and synthesis handoff.
- Produces: persistent `0/4-4/4` guidance, numbered card markers, ordered dock items, and explicit insufficient-selection explanation.

- [ ] **Step 1: Write failing ordered-marker tests**

Extend `tests/reference-card.test.tsx`:

```tsx
render(<ReferenceCard {...makeProps()} isComparisonMode isComparisonSelected comparisonPosition={2} />);
expect(screen.getByRole("checkbox", { name: "Kenney UI Pack" }).getAttribute("aria-checked")).toBe("true");
expect(screen.getByText("2", { selector: ".reference-card__comparison-position" })).toBeTruthy();
```

Extend dock tests:

```tsx
expect(screen.getByText("Click cards to add them in comparison order")).toBeTruthy();
expect(screen.getByText("Select at least 1 more")).toBeTruthy();
```

- [ ] **Step 2: Run focused tests and verify red**

Run:

```bash
npm test -- tests/reference-card.test.tsx tests/comparison-dock.test.tsx tests/localization.test.ts tests/synthesis-selection.test.ts
```

Expected: FAIL because `comparisonPosition` and the guidance copy are absent.

- [ ] **Step 3: Pass selection order without changing the state machine**

In `app/page.tsx` calculate:

```ts
const comparisonPosition = isSelectedForComparison
  ? comparisonReferenceIds.indexOf(reference.id) + 1
  : null;
```

Pass it to `ReferenceCard`. Do not add keyboard modifier handling, drag handlers, reorder callbacks, or a second selection store.

- [ ] **Step 4: Strengthen card and dock feedback**

On selected comparison cards, render the numeric position inside `.reference-card__comparison-position`; on unselected cards render the plus marker. Add bilingual `comparisonSelectionHint` and display it in the dock header. Keep `role="status"`, `aria-live="polite"`, ordered `<ol>`, remove buttons, cancel, handoff, expand/collapse, and Escape behavior.

- [ ] **Step 5: Visually separate selection states**

Use shape plus color:

- detail-selected: one thin signal outline;
- comparison-selected: two-pixel signal outline plus filled numbered square;
- pinned: top-right pin button;
- comparison limit: reduced contrast and a not-allowed cursor without hiding information.

Ensure normal click in comparison mode remains the only activation path and pin buttons remain disabled in that mode.

- [ ] **Step 6: Run focused and full selection tests**

Run:

```bash
npm test -- tests/reference-card.test.tsx tests/comparison-dock.test.tsx tests/localization.test.ts tests/synthesis-selection.test.ts tests/interaction-state.test.ts
npm run typecheck
npm run lint
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add app/page.tsx app/workspace/reference-card.tsx app/workspace/comparison-dock.tsx lib/localization.ts app/globals.css tests/reference-card.test.tsx tests/comparison-dock.test.tsx tests/localization.test.ts tests/synthesis-selection.test.ts
git commit -m "feat: 强化有序对比选择反馈 / clarify ordered comparison selection"
```

### Task 7: Secondary Flow and Responsive Visual Unification

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/globals.css`
- Modify: `tests/workstation-visual-contract.test.ts`
- Modify: `tests/visual-assets.test.ts`
- Modify: relevant existing form/dialog/synthesis component tests only if markup classes change

**Interfaces:**
- Consumes: protected-A tokens and existing page/forms/dialog/synthesis markup.
- Produces: one material system across add, edit, guided quality completion, delete confirmation, data management, synthesis list/editor, empty states, and mobile fallbacks.
- Preserves: all fields, validation, dirty-state gates, focus restore, Escape handling, confirmation semantics, Backup operations, and synthesis CRUD.

- [ ] **Step 1: Write failing secondary-surface CSS tests**

Add exact expectations:

```ts
expect(css).toMatch(/\.reference-form[\s\S]*var\(--surface-command\)/);
expect(css).toMatch(/\.detail-edit-form[\s\S]*var\(--line-subtle\)/);
expect(css).toMatch(/\.data-management-dialog[\s\S]*var\(--surface-inspector\)/);
expect(css).toMatch(/\.synthesis-workspace[\s\S]*var\(--canvas-graphite\)/);
expect(css).toMatch(/@media \(max-width: 820px\)[\s\S]*min-width:\s*44px[\s\S]*min-height:\s*44px/);
```

- [ ] **Step 2: Run visual and existing workflow tests to verify red only on new contracts**

Run:

```bash
npm test -- tests/workstation-visual-contract.test.ts tests/visual-assets.test.ts tests/data-management-dialog.test.tsx tests/synthesis-workspace.test.ts tests/synthesis-page-state.test.ts
```

Expected: new protected-A CSS expectations FAIL; existing behavior tests remain PASS.

- [ ] **Step 3: Apply the material system to reference flows**

Restyle add form, detail edit form, quality-guided navigation, sticky save actions, delete confirmation, empty results, seed notice, status messages, and data management dialog using the shared tokens. Keep inputs on opaque readable surfaces, error/success colors semantic, primary actions singular, and destructive actions clearly separated.

- [ ] **Step 4: Apply the material system to synthesis flows**

Keep synthesis information architecture and fields unchanged. Replace nested card-on-card surfaces with the graphite base, one list/editor surface, section dividers, and restrained relation cards. Do not modify relation order, snapshot state, stale/refresh behavior, archive/delete, or Markdown export.

- [ ] **Step 5: Reconcile all breakpoints**

At `1281px+`, use desktop panes and sticky inspector/dock. At `821-1280px`, allow command groups and detail content to wrap while preventing outer overflow. At `<=820px`, retain the existing single-column fallback, hide splitters and density controls, show comfortable tags, keep `44x44px` targets, and ensure dialogs/forms use viewport-safe widths. At `<=720px`, stack dock items/actions without covering content.

- [ ] **Step 6: Preserve reduced motion, focus, and text wrapping**

All new transitions must disable under reduced motion. Every icon control retains a visible focus ring. Long Chinese/English titles, URLs, tags, and synthesis snapshots use `min-width: 0` and `overflow-wrap: anywhere` where truncation would hide required content.

- [ ] **Step 7: Run focused and full workflow suites**

Run:

```bash
npm test -- tests/workstation-visual-contract.test.ts tests/visual-assets.test.ts tests/data-management-components.test.ts tests/data-management-dialog.test.tsx tests/synthesis-workspace.test.ts tests/synthesis-page-state.test.ts tests/reference-detail.test.tsx
npm run typecheck
npm run lint
npm run build
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add app/page.tsx app/globals.css tests/workstation-visual-contract.test.ts tests/visual-assets.test.ts
git add tests/data-management-components.test.ts tests/data-management-dialog.test.tsx tests/synthesis-workspace.test.ts tests/synthesis-page-state.test.ts tests/reference-detail.test.tsx
git commit -m "feat: 统一次级流程与响应式视觉 / unify secondary and responsive surfaces"
```

Only stage an existing test file in the second `git add` when the implementation actually required a behavior-preserving selector/class adjustment and the diff is relevant.

### Task 8: Complete Automated Gates and Measured Local Visual QA

**Files:**
- Create: `docs/qa/2026-08-01-round-15-design-qa.md`
- Create: `docs/qa/2026-08-01-round-15-target-comparison.png`
- Modify: `docs/progress/2026-08-01.md`
- Modify: `docs/progress/status.md`
- Modify: `docs/progress/timeline.md`
- Modify: implementation/tests only for defects reproduced during QA

**Interfaces:**
- Produces: complete automated evidence, same-viewport visual evidence, exact measurements, interaction evidence, console status, and zero-residue record.
- Consumes: approved target `docs/product/assets/round-14-visual-target.png`, Round 14 baseline screenshots, local build, and all prior task outputs.

- [ ] **Step 1: Run the complete automated gate**

Run from the branch root:

```bash
npm test
npm run typecheck
npm run lint
npm run build
git diff --check main...HEAD
```

Expected: all tests PASS, typecheck/lint/build exit 0, and diff check returns no output. Record exact test-file and test counts.

- [ ] **Step 2: Run the Impeccable detector as a limited signal**

Run the repository's installed Impeccable detector against the app. Record its output in the QA document, explicitly stating that a clean detector result is not visual-fidelity approval.

- [ ] **Step 3: Start the production build locally and create dense QA data**

Serve the built app locally. Create 12 temporary references with the unique prefix `QA-R15-<timestamp>-`, covering all eight asset categories, at least two valid remote previews, at least one intentionally failed preview, both density-relevant tag states, varied scores, and at least four comparison candidates. Record created IDs before visual checks.

- [ ] **Step 4: Verify the default two-seed state separately**

Before or after the dense fixture, verify that the normal two seed references show distinct local category art, equal preview heights, readable titles/status, no broken-image icons, and a discoverable enabled “Start comparison” action.

- [ ] **Step 5: Measure desktop fidelity at 1600 and 1480px**

Record DOM measurements:

```js
({
  workspace: document.querySelector(".workspace")?.getBoundingClientRect().width,
  left: document.querySelector(".research-rail")?.getBoundingClientRect().width,
  center: document.querySelector(".reference-canvas")?.getBoundingClientRect().width,
  right: document.querySelector(".reference-inspector")?.getBoundingClientRect().width,
  columns: getComputedStyle(document.querySelector(".reference-grid")).gridTemplateColumns.split(" ").length,
  horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
})
```

At 1480px, require center/workspace `>=0.60`, compact columns `4`, horizontal overflow `0`; verify comfortable columns `3`. At 1600px, verify the same composition remains intentional rather than stretching to oversized cards.

- [ ] **Step 6: Capture same-viewport comparison evidence**

Capture the implementation at the same viewport/aspect used for the approved target. Produce `docs/qa/2026-08-01-round-15-target-comparison.png` containing target, Round 14 baseline, and Round 15 implementation. Review and record conclusions for composition, texture visibility, card image ratio, command rail unity, inspector flatness, density, and hierarchy.

- [ ] **Step 7: Verify complete interaction and responsive behavior**

Exercise search shortcut, search, sort, every single-select filter, clear filters, density and refresh persistence, pin, add/cancel, edit/cancel, quality-guided editing, data management open/cancel, detail disclosure, splitter pointer drag, keyboard, reset, collapse/recovery, Chinese/English, comparison `0/4` through `4/4`, remove, collapse/Escape, synthesis handoff/cancel, synthesis workspace, and return to references.

Verify layouts at `1600`, `1480`, `1280`, `1024`, and `390x844`; require document/body horizontal overflow `0`, no dock/form/modal obstruction, and mobile primary targets at least `44x44px`.

- [ ] **Step 8: Verify radar and preview degradation**

Confirm complete scores draw the five-axis polygon and announce the text summary; incomplete scores show the localized fallback with no data polygon. Confirm safe real previews win, a broken preview changes to category art, and a changed valid URL retries.

- [ ] **Step 9: Check console and delete every QA record**

Require console error count `0`. Delete all `QA-R15-` references and any synthesis created by handoff, reload, search the prefix, and record residue `0`. Stop the local service after evidence capture.

- [ ] **Step 10: Repair reproducible defects with focused red-green cycles**

For each defect, add the smallest failing test or deterministic CSS contract, reproduce, repair, rerun the focused test, then rerun the complete gate. Do not accept an unexplained visual exception against a must-pass metric.

- [ ] **Step 11: Write QA and progress evidence**

In `docs/qa/2026-08-01-round-15-design-qa.md`, record commands, counts, viewports, measurements, screenshots, interaction results, console result, cleanup result, detector result, deviations, and residual risks. Update all three progress documents to `Round 15 implemented and locally verified; independent review pending` only after every must-pass item succeeds.

- [ ] **Step 12: Commit**

```bash
git add docs/qa/2026-08-01-round-15-design-qa.md docs/qa/2026-08-01-round-15-target-comparison.png docs/progress/status.md docs/progress/timeline.md docs/progress/2026-08-01.md
git add app lib tests public/art
git commit -m "test: 完成高保真工作台本地验收 / verify high-fidelity workstation locally"
```

The second `git add` stages only verified defect repairs that remain after Tasks 1-7; if there are none, omit it.

### Task 9: Independent Review and Final Local Closure

**Files:**
- Modify: implementation/tests/docs only for accepted review findings
- Modify: `docs/qa/2026-08-01-round-15-design-qa.md`
- Modify: `docs/progress/status.md`
- Modify: `docs/progress/timeline.md`
- Modify: `docs/progress/2026-08-01.md`

**Interfaces:**
- Produces: an independent specification and code review verdict with Critical/Important findings resolved or explicitly blocking delivery.
- Consumes: approved spec, implementation plan, full branch diff, automated evidence, and same-viewport comparison.

- [ ] **Step 1: Request independent review**

Use `superpowers:requesting-code-review`. Give the reviewer:

- base `main` and current branch HEAD;
- approved design spec and this plan;
- target, Round 14 baseline, and Round 15 comparison image;
- QA measurements and complete gate results;
- explicit review priorities: contract preservation, Backup compatibility, visual fidelity, preview safety, score direction, comparison discoverability, accessibility, responsive behavior, and test strength.

- [ ] **Step 2: Classify findings**

Treat Critical and Important findings as blocking. Verify each report against code or a reproduction before changing implementation. Record non-blocking suggestions separately rather than expanding scope.

- [ ] **Step 3: Repair blocking findings with TDD**

For every verified blocker: write or adjust a focused failing test, run red, implement the minimal repair, run green, and update QA evidence. Keep each repair commit focused:

```bash
git commit -m "fix: 修复高保真复审问题 / address high-fidelity review findings"
```

- [ ] **Step 4: Rerun final local gates**

Run:

```bash
npm test
npm run typecheck
npm run lint
npm run build
git diff --check main...HEAD
```

Repeat affected browser measurements and screenshots. Require no Critical/Important findings, all gates passing, console error `0`, horizontal overflow `0`, and QA residue `0`.

- [ ] **Step 5: Record approval and commit evidence**

Update QA and progress docs with reviewer mode, scope, verdict, repairs, final counts, and final stage `Round 15 locally approved; merge pending`.

```bash
git add docs/qa/2026-08-01-round-15-design-qa.md docs/progress/status.md docs/progress/timeline.md docs/progress/2026-08-01.md
git add app lib tests public/art
git commit -m "docs: 记录高保真工作台最终复审 / record final workstation review"
```

Omit paths with no diff.

### Task 10: Merge, Deploy, Production QA, and Traceable Closure

**Files:**
- Modify: `docs/progress/status.md`
- Modify: `docs/progress/timeline.md`
- Modify: `docs/progress/2026-08-01.md`
- Modify/Create: production QA evidence under `docs/qa/` if deployment occurs on a later date

**Interfaces:**
- Produces: synchronized GitHub/Sites runtime source, deployed version, authenticated production evidence, cleanup, and final Round 15 stage.
- Preserves: version 18 as rollback baseline until the new deployment is confirmed healthy.

- [ ] **Step 1: Confirm merge readiness**

Require clean branch status, independent approval, complete gates, visual metrics, console `0`, residue `0`, and no unrelated files. Compare `git diff --stat main...HEAD` and `git diff --name-only main...HEAD` against the plan's file map.

- [ ] **Step 2: Merge according to repository policy**

Fast-forward `codex/round-15-protected-a` into updated `main` only if it remains a clean descendant. Do not use destructive reset or checkout commands. Remove the feature branch only after merged-main and deployment closure.

- [ ] **Step 3: Verify merged main**

Run on merged `main`:

```bash
npm test
npm run typecheck
npm run lint
npm run build
git status --short --branch
```

Expected: all gates PASS and no uncommitted runtime changes.

- [ ] **Step 4: Synchronize GitHub and Sites source**

Push `main`, verify the remote commit equals local HEAD, update Sites runtime source to that exact commit, save a new private version, and deploy it. Record commit, version ID, deployment ID, final deployment status, and retain Sites version 18 as documented rollback reference.

- [ ] **Step 5: Run authenticated production QA**

Prefer read-only validation first: two seed references show local category art, default center-first layout, compact/comfortable semantics, refresh persistence, comparison discoverability, 1280/390 no overflow, and console error `0`. If dense production validation is required, create uniquely prefixed `QA-R15-` records, verify all required visual/interaction paths, then delete them and prove residue `0`.

- [ ] **Step 6: Record final delivery**

Update progress status, timeline, daily log, and production QA evidence with runtime source, GitHub synchronization, Sites version/deployment, production measurements, console result, cleanup, rollback baseline, residual risks, and next stage. Mark `Round 15 complete; Round 16 design-ready` only after production QA succeeds.

- [ ] **Step 7: Commit and push evidence-only closure**

```bash
git add docs/progress/status.md docs/progress/timeline.md docs/progress/2026-08-01.md docs/qa
git commit -m "docs: 记录高保真工作台部署验收 / record workstation deployment QA"
git push origin main
```

If the production QA date differs, use that date's progress and QA files instead of backdating evidence.

## Plan Self-Review

- Spec coverage: every approved requirement maps to Tasks 1-10; no API, D1, migration, domain, source-policy, or Backup schema work is introduced.
- Product-contract check: filters remain single-select; comparison remains explicit, ordered, and capped at four; density remains two grid modes.
- Layout arithmetic check: `1480 - 220 - 352 - 8 - 8 = 892`; `892 / 1480 = 60.27%`.
- Preview-safety check: real safe URL remains remote; local assets are original abstract art; failed URL falls back; no third-party hosting is added.
- Score-direction check: safety is `6 - copyright risk`; incomplete profiles do not draw zero-valued polygons.
- Type check: Task 2 mapping and preview interfaces are consumed consistently by cards/dock; Task 5 profile interface is consumed consistently by the radar/detail; Task 6 adds one nullable numeric prop through page/card tests.
- Evidence check: detector output is explicitly insufficient without same-viewport comparison, measurements, browser interaction, console, and cleanup.
- Delivery check: progress documentation, independent review, merged-main verification, deployment, production QA, and rollback baseline are all explicit tasks.
