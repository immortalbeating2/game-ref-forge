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

## Production Evidence

- Runtime source: `4926de6207d0d601cb44390b6e435dc816b112d7`.
- Sites version 16: `appgprj_6a246b271d848191b88b60d1633030c7~appgver_a1683ea096b08191be0759de11cef149`.
- Deployment: `appgdep_6a6b276b59688191a430a7f9da007b5e`, status `succeeded`.
- Production URL: `https://game-ref-forge.yeep-6613.chatgpt.site`.
- Authenticated DOM confirmed Chinese default, the Round 14 toolbar, compact/comfortable controls, dense reference cards, and structured detail sections.
- Comfortable density survived a production reload; final density was reset to compact.
- The default 1280px production tab had zero document/body horizontal overflow.
- A fresh tab created with a real `390x844` viewport reported `innerWidth=390`, `clientWidth=375`, `scrollWidth=375`, zero horizontal overflow, and two `44x44px` pin targets.
- No reference or synthesis write was performed.

The in-app browser control client repeatedly waited on failed Statsig telemetry requests. Long multi-click calls therefore timed out even when an earlier action completed. Comparison, keyboard, modal focus, disclosure, splitter, and cleanup behavior remain covered by the complete local browser run and 420 automated tests. This is a non-blocking automation evidence boundary, not a confirmed application failure.

## Result

Round 14 behavior, visual hierarchy, responsive layout, cleanup, console checks, merged-main command gate, exact-source deployment, and production read-only smoke passed. The post-repair independent review returned `Approved` with no Critical or Important findings. Round 14 is complete and Round 15 is design-ready.

## Post-Deploy Card Preview Alignment Correction

A production screenshot exposed unequal preview heights between adjacent equal-height reference cards. This was not an approved visual variation. The implicit rows in `.reference-card__select` stretched to distribute the card's remaining height, so a shorter body produced a taller preview.

- Regression test added before the CSS repair and observed failing.
- `.reference-card__select` now uses `grid-template-rows: max-content 1fr`.
- Local fixture used one short and one wrapped-title reference.
- Both cards measured `480.71px` high.
- Both 16:9 previews measured `134.91px` high with identical top and bottom coordinates.
- Document horizontal overflow was `0`.
- Temporary fixture residue after cleanup was `0`.
- Updated command gate: 39 files / 421 tests, typecheck, lint, build and diff check passed.

The correction changes only card-internal layout and its regression test. It does not alter API, D1, migrations, Backup v1, dependencies, business data, or the Round 14 interaction contract.

Production closure:

- Runtime source: `5c1803b1d0ec6e718c4e275f0ca0a4bc71a875cd`.
- Sites version 17: `appgprj_6a246b271d848191b88b60d1633030c7~appgver_cc84c828771c8191bcac16943e24f49e`.
- Deployment: `appgdep_6a6b4d18633c819196d68844c4cb5462`, status `succeeded`.
- Both production cards measured `520.52px` high.
- Both production previews measured `142px` high with identical top and bottom coordinates.
- Production horizontal overflow was `0`; console error count was `0`.
- The production check was read-only and performed no reference or synthesis write.
- The local feature branch and temporary server were removed after closure.
