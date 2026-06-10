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

- [ ] `npm test`
- [ ] `npm run typecheck`
- [ ] `npm run lint`
- [ ] `npm run build`

## Production Data Validation

- [ ] Open production URL.
- [ ] Add `QA Test - Kenney UI Pack`.
- [ ] Add `QA Test - Poly Haven Texture`.
- [ ] Refresh page and confirm added references remain visible.
- [ ] Delete one QA reference.
- [ ] Refresh page and confirm deleted reference remains absent.

## Metadata Preview Validation

- [ ] Preview a source expected to succeed.
- [ ] Confirm title/site/canonical/preview fields are filled when metadata exists.
- [ ] Preview a source expected to fail or be blocked.
- [ ] Confirm failure message is understandable.
- [ ] Confirm manually entered fields remain after preview failure.
- [ ] Save manually after preview failure.

## Interaction QA

- [ ] Search by title.
- [ ] Search by source/site.
- [ ] Filter by asset category.
- [ ] Filter by license status.
- [ ] Filter by public status.
- [ ] Clear filters.
- [ ] Select reference card.
- [ ] Review right detail panel.
- [ ] Open source link.
- [ ] Open and close add-reference form.
- [ ] Save with missing required data.
- [ ] Confirm delete prompt includes reference title.

## Layout QA

- [ ] Desktop: three-pane layout readable.
- [ ] Desktop: no visible overlap or clipped controls.
- [ ] Desktop: long title does not break cards.
- [ ] Mobile: no horizontal scrolling.
- [ ] Mobile: form controls fit.
- [ ] Mobile: detail panel remains readable.

## Findings

| ID | Area | Finding | Severity | Fix Commit | Status |
| --- | --- | --- | --- | --- | --- |

## Final Result

- Status: `not-run`
- Production version:
- Deployment URL:
- Notes:

