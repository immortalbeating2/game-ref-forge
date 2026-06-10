# 2026-06-10 Live Usability Validation

## Scope

Validate deployed RefForge v1 on production and fix only issues required for the deployed app to be normally usable.

Production URL:

```text
https://game-ref-forge.yeep-6613.chatgpt-team.site
```

## Branch

- Branch: `codex/round-2-live-validation`
- Base: `578dd8a19dc9935515130f8aff19d6f3217a975c`
- Mode: branch only
- Worktree: not used

## Test References

Use clearly named QA records:

- `QA Test - Kenney UI Pack`
- `QA Test - Poly Haven Texture`
- `QA Test - Metadata Failure`

Delete at least one QA record before final completion.

## Automated Baseline

- [x] `npm test`
- [x] `npm run typecheck`
- [x] `npm run lint`
- [x] `npm run build`

## Production Data Validation

- [ ] Open production URL.
- [ ] Add `QA Test - Kenney UI Pack`.
- [ ] Add `QA Test - Poly Haven Texture`.
- [ ] Refresh page and confirm added references remain visible.
- [ ] Delete one QA reference.
- [ ] Refresh page and confirm deleted reference remains absent.

Result note:

- Blocked for command-line validation on 2026-06-10. Direct unauthenticated requests to the production URL and `/api/references` return `403 Forbidden`.
- Sites project access is configured as `custom`; the current agent session has no authenticated browser control tool exposed for the production allowlist user.

## Metadata Preview Validation

- [x] Preview a source expected to succeed.
- [ ] Confirm title/site/canonical/preview fields are filled when metadata exists.
- [x] Preview a source expected to fail or be blocked.
- [x] Confirm failure message is understandable.
- [ ] Confirm manually entered fields remain after preview failure.
- [ ] Save manually after preview failure.

Result note:

- Local success case `https://example.com/` filled title and site. It did not provide canonical or preview metadata, so the richer production/source-specific metadata field check remains open.

## Interaction QA

- [x] Search by title.
- [ ] Search by source/site.
- [ ] Filter by asset category.
- [ ] Filter by license status.
- [ ] Filter by public status.
- [x] Clear filters.
- [x] Select reference card.
- [x] Review right detail panel.
- [ ] Open source link.
- [x] Open and close add-reference form.
- [ ] Save with missing required data.
- [x] Confirm delete prompt includes reference title.

## Layout QA

- [x] Desktop: three-pane layout readable.
- [x] Desktop: no visible overlap or clipped controls.
- [ ] Desktop: long title does not break cards.
- [x] Mobile: no horizontal scrolling.
- [x] Mobile: form controls fit.
- [x] Mobile: detail panel remains readable.

## Findings

| ID | Area | Finding | Severity | Fix Commit | Status |
| --- | --- | --- | --- | --- | --- |
| QA-UI-1 | Filtered empty state | A filter/search state with zero results needed a clear empty-state path so the detail panel would not imply an unrelated selected result. | Medium | `efeac5f` | Fixed and locally verified |
| QA-LOCAL-D1-1 | Local D1 validation | Local Miniflare D1 initially had no `references` table; applied existing migration to `.wrangler/state` before CRUD smoke testing. | Medium | N/A | Local environment fixed |
| QA-PROD-ACCESS-1 | Production access | Direct unauthenticated production page/API requests return `403 Forbidden` because Sites access is `custom`; no authenticated browser control tool is exposed in this session. | Blocker | N/A | Open |

## Automated Baseline Result

- `npm test`: passed, 3 test files / 6 tests.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm run build`: passed. Routes include `/`, `/api/metadata/preview`, `/api/references`, and `/api/references/:id`.

## Local Runtime Validation

- Local dev server: `http://localhost:3000`, page returned `200`.
- Local D1 migration: applied existing `drizzle/0000_melodic_colleen_wing.sql` to `.wrangler/state`.
- Local reference CRUD:
  - `GET /api/references`: `200`, empty array before test.
  - `POST /api/references`: `201`, created `Codex local validation reference 1`.
  - `GET /api/references`: `200`, created record present.
  - `DELETE /api/references/:id`: `200`, `{ "deleted": true }`.
  - Final `GET /api/references`: `200`, created record absent.
- Local metadata preview:
  - Success case `https://example.com/`: `200`, title `Example Domain`, site `example.com`.
  - Failure case `not-a-url`: `400`, message `Invalid URL string.`
- Local browser smoke:
  - Temporary Playwright environment under `%TEMP%`.
  - Passed add, preview metadata, save, reload persistence, empty search state, clear filters, delete, desktop layout, and mobile no-horizontal-overflow checks.
  - Screenshots were generated at `%TEMP%/game-ref-forge-desktop.png` and `%TEMP%/game-ref-forge-mobile.png`.

## Production Access Probe

- `GET https://game-ref-forge.yeep-6613.chatgpt-team.site`: `403 Forbidden`.
- `GET https://game-ref-forge.yeep-6613.chatgpt-team.site/api/references`: `403 Forbidden`.
- Sites project lookup confirms `access_mode: custom` with an allowlist user.
- Production create/refresh/delete remains unverified until an authenticated browser session or temporary access-policy change is available.

## Final Result

- Status: `partial-blocked`
- Production version: current deployed version remains production version 1 at time of this note.
- Deployment URL: `https://game-ref-forge.yeep-6613.chatgpt-team.site`
- Notes: local runtime and browser smoke passed; production live data validation is blocked by Sites custom access in the current unauthenticated tool path.
