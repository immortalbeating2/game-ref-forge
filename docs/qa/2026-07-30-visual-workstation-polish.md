# Round 14 Visual Workstation Polish QA

## Scope

Round 14 upgrades the existing private reference workstation without changing reference or synthesis data, API routes, D1, migrations, or Backup v1.

## Asset Evidence

- Approved target: `docs/product/assets/round-14-visual-target.png`
  - SHA-256: `7C458ABF2A4B53420DE0C2FA84908387131B2E5053573CBBFB38CB334A3F283C`
- Generated graphite texture: `public/art/workbench-graphite.webp`
  - Size: `87,118` bytes
  - SHA-256: `8B16FF65055F4A67279DB9C41DB537ECF17CFB0C7F00B8D0522EC7A69EBF1556`
- Final implementation screenshot: `docs/qa/2026-07-30-round-14-final-desktop.png`
- Same-state target comparison: `docs/qa/2026-07-30-round-14-comparison.png`

The texture was generated specifically for RefForge and contains no third-party source media.

## Automated Evidence

- Density preference parser/serializer and React hydration/persistence coverage.
- Toolbar density controls and search shortcut behavior.
- Compact/comfortable card contracts and safe image fallback.
- Ordered comparison dock selection, collapse, removal, and synthesis entry.
- Structured detail section ordering and disclosure behavior.
- Existing reference, synthesis, Backup v1, layout, API, and migration coverage remains green.

Current full command gate:

- `npm test`: 39 files / 420 tests passed.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm run build`: passed.
- `git diff --check`: passed.

The density preference repair was retested in a clean browser tab after the hook implementation changed; comfortable and compact modes both survived the post-hydration reload state, and console error count remained `0`.

The first independent review returned four Important findings. TDD repair coverage now includes:

- `Escape` collapsing the expanded comparison dock without cancelling selection;
- `/` remaining inside a dialog rather than focusing the background search field;
- mobile comfortable card geometry and `44x44px` pin targets;
- failed preview fallback and same-record URL retry in cards and the comparison dock.

## Local Browser Evidence

The local app ran at `http://localhost:57350/` against temporary Round 14 references with prefix `QA-R14-20260730`.

- Search `/` shortcut focused the search input.
- Search and title sorting changed the visible deck correctly.
- Compact and comfortable density both persisted across reload.
- Data management dialog opened and closed.
- Add and edit forms opened; cancel returned to the selected reference without a write.
- Chinese and English interfaces exposed complete labels.
- Score matrix collapsed and restored.
- Pin/unpin returned to the original state.
- Comparison mode passed `0/4`, `1/4`, `2/4`, `3/4`, and `4/4` gates.
- Comparison order, collapse/recovery, item removal, and synthesis entry worked.
- Left splitter passed keyboard adjustment, pointer drag, and double-click reset.
- Expanded comparison dock collapsed on `Escape` while comparison mode and selection remained active.
- Pressing `/` from the data management close button kept focus on that modal button.
- Detail and filter panels remained reachable.
- Category fallback visuals rendered for references without safe preview images.

The copied local database did not include migration 2, so synthesis workspace data loading displayed its existing migration-required message. The reference-to-synthesis transition itself worked, and synthesis behavior remains covered by the full automated suite and prior Round 11-13 evidence.

## Responsive Evidence

| Viewport | Document/body horizontal overflow | Result |
| --- | ---: | --- |
| `1600x900` | `0px` | Passed |
| `1280x900` | `0px` | Passed |
| `1024x768` | `0px` | Passed |
| `390x844` | `0px` | Passed |

At `390x844`:

- no button, select, or input text overflow was detected in Chinese or English;
- the data management dialog measured `317.33px` wide inside the `390px` viewport;
- desktop density and splitter controls were removed from the touch layout;
- the established single-column document flow remained reachable.

The in-app browser repeated the fixed sidebar region when combining temporary mobile viewport emulation with a full-page screenshot. DOM snapshots, element bounds, overflow metrics, interaction readback, and a clean-tab console check were correct, so that image is not used as application evidence.

## Visual Review

- First same-viewport review found toolbar action overflow and repaired it.
- Interactive review found density reload loss and added a failing regression test before repair.
- Final `1487x1058` target/implementation comparison passed.
- Impeccable detector returned no findings for the changed UI surfaces.

See `design-qa.md` for the visual decision record.

## Cleanup

- Four temporary local references were deleted through the local API.
- Two additional review-repair references were deleted through the local API.
- Post-cleanup query returned `qa_remaining=0` and `total=0`.
- A fresh browser tab reloaded the zero-reference state.
- Clean-tab console error count: `0`.
- Workspace density and splitter width were reset to compact and `260px`.

## Result

Local Round 14 behavior, visual hierarchy, responsive layout, cleanup, console checks, and the full command gate passed. Independent review remains the last pre-merge check.
