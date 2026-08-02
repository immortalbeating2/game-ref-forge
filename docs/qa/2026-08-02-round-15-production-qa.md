# Round 15 Production QA

Date: 2026-08-02

## Deployment identity

- GitHub and Sites runtime source: `83b31f5b39de5528f95129195782d4b1a389aee6`.
- Sites project: `appgprj_6a246b271d848191b88b60d1633030c7`.
- Sites version 19: `appgprj_6a246b271d848191b88b60d1633030c7~appgver_e505723944fc819180a44940dd9ed349`.
- Deployment: `appgdep_6a6eb74ac79481918b29a0e1e41994a8`.
- Final deployment status: `succeeded`.
- Production URL: `https://game-ref-forge.yeep-6613.chatgpt.site`.
- Sites version 18 remains available as the rollback baseline.

The archive was packaged from the already validated merged-main `dist`. The first save attempt was correctly rejected because the Sites source repository had not yet advanced to the GitHub commit. After pushing the identical commit to the Sites source repository and verifying `refs/heads/main` as the full SHA above, version 19 saved and deployed successfully. No migration or runtime environment change was applied.

## Merged-main gate

- `npm test`: 44 files / 463 tests passed.
- `npm run typecheck`: passed.
- `npm run lint`: passed after removing the already-verified linked worktree whose ignored generated `dist` had been scanned by root ESLint.
- `npm run build`: passed.
- `git diff --check 6033f22233a559656ebbc329b858c049e152be43...83b31f5b39de5528f95129195782d4b1a389aee6`: exit `0`, no diagnostics.
- Local `main`, GitHub `origin/main`, and Sites source `main` were all verified at `83b31f5b39de5528f95129195782d4b1a389aee6` before saving the version.

## Authenticated production evidence

The QA used the existing authenticated production UI and changed only device-local layout/density preferences. It did not create, edit, delete, restore, archive, or synthesize any business record.

### Visual identity and default layout

- The two seed cards loaded distinct original local art: `/art/reference-ui-hud.svg` and `/art/reference-material-texture.svg`; both have natural size `267 x 150`.
- The page exposed the Round 15 image-led cards, graphite workstation composition, continuous inspector, score radar, command rail, and ordered comparison feedback rather than the Round 14 surface.
- The inherited Chrome device preference initially measured `292 / 752 / 420`. Double-click reset on both existing separators restored the approved Round 15 defaults at 1480px: research rail `220px`, center canvas `892px`, inspector `352px`, plus two `8px` separators.
- Center share was `892 / 1480 = 60.27%`; document horizontal overflow was `0`.

### Density and preview geometry

| State | Production measurement | Result |
| --- | --- | --- |
| Compact at 1480 x 1000 | radio checked; `workspace--density-compact`; both previews `262.67 x 147.75px` | ratio `1.778`, broken images `0`, overflow `0` |
| Comfortable at 1480 x 1000 | radio checked; `workspace--density-comfortable`; both previews `350.67 x 197.25px` | ratio `1.778`, broken images `0`, overflow `0` |
| Comfortable reload | radio and card classes remained comfortable after reload | preference persistence passed |
| Final preference | compact radio was checked again before comparison QA | reset passed |

Only two seed records exist in production, so a real four-column/three-column dense-library count was intentionally not manufactured. The exact deployed source already passed the local 12-reference browser matrix with 1480/1600 compact `4` columns and comfortable `3` columns.

### Ordered comparison and persisted-only boundary

- Both seed selections reported `aria-checked=true`.
- Ordered position 1: `Kenney UI Pack` / `Kenney`.
- Ordered position 2: `Poly Haven Material Reference` / `Poly Haven`.
- The dock reached `2 / 4` and `进入综合稿` was natively disabled.
- The exact visible reason was `示例可用于对比探索；保存至少两条参考后才能进入综合稿。`.
- The browser action used to cancel comparison was interrupted before readback, so the final tab may have retained temporary `2 / 4` UI selection. This state is client-only and caused no reference, synthesis, relation, API, or D1 write.

## Evidence boundary and cleanup

- The in-app browser failed before production navigation; Chrome fallback loaded and measured the page successfully.
- Chrome browser-client repeatedly logged its own Statsig `initialize` / `rgstr` POST timeouts against `ab.chatgpt.com`. Those tool-runtime messages are not application console evidence.
- A scoped 390 x 844 probe successfully set the viewport, but the first read failed because the page sandbox does not expose `requestAnimationFrame`; the retry was interrupted before returning. Therefore this document does not claim production 390px DOM metrics.
- `tab.dev.logs()` was not reached before the controlled stop, so this document does not claim a production page console-error count.
- These are non-blocking production evidence gaps: the exact deployed source already passed real local 390px single-column layout, `44px` touch targets, document/body overflow `0`, broken images `0`, and application console error `0`, together with the full automated and merged-main gates.
- Both browser agents reset temporary viewport overrides and finalized their tabs. No production business write occurred, and no QA fixture or cleanup write was required.

## Verdict

Round 15 production deployment is healthy for the directly observed desktop visual, density, persistence, comparison, image, and overflow contracts. The 390px and page-console production measurements remain explicitly unobserved due to the browser-control boundary, with matching exact-source local evidence retained. Sites version 19 is the stable production baseline; version 18 remains the rollback reference.
