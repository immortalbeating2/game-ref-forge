# Production Interaction Hardening QA

Date: 2026-06-18
Branch: `codex/round-4-production-hardening` -> merged to `main`

## Automated Validation

- `npm test`: passed, 5 files / 18 tests.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm run build`: passed.

## Local Browser QA

Target: `http://localhost:3000`

QA reference:

- Created title: `Round 4 Browser QA e4b7f1ea`
- Updated title: `Round 4 Browser QA e4b7f1ea Updated`

Result:

```json
{
  "previewState": {
    "failure": true,
    "success": false
  },
  "afterCreate": {
    "visible": true
  },
  "afterCreateReload": {
    "visible": true
  },
  "afterEditReload": {
    "visible": true,
    "uiHud": true,
    "review": true,
    "sourceLinkOnly": true
  },
  "afterDeleteRequest": {
    "confirmation": true,
    "named": true
  },
  "afterCancel": {
    "stillVisible": true,
    "confirmationGone": true
  },
  "afterConfirmDelete": {
    "deletedMessage": true,
    "absent": true
  },
  "afterDeleteReload": {
    "absent": true
  }
}
```

Notes:

- Metadata preview showed the stable failure path in this run.
- Save remained possible after preview failure.
- App-owned delete confirmation appeared and named the reference.
- Cancel did not delete the reference.
- Confirm delete removed the reference, showed `Reference deleted.`, and reload confirmed absence.

## Production Browser QA

- Production URL: `https://game-ref-forge.yeep-6613.chatgpt-team.site`
- Access mode: `custom`
- Sites version: `5`
- Source commit: `bcb743c285416e5025bd38bdad8a3a481713d275`
- Deployment id: `appgdep_6a33036c877081918ff03d2ac837f505`
- Deployment status: `succeeded`
- Unauthenticated command-line probe:
  - `GET /api/references`: `401 Unauthorized`, matching the configured `custom` access policy.
- Authenticated in-app browser status:
  - Production page opened successfully and showed the fourth-round UI state, including `+ Add reference`, starter examples messaging, and app-owned `Delete reference`.
  - The add form opened in the authenticated production page and exposed `Preview metadata` plus `Save private reference`.
- Final production CRUD result: passed.

Production CRUD evidence:

- Created a production reference from `https://example.com/`.
- Metadata preview returned the stable success feedback: `Metadata preview ready. Review the fields before saving.`
- Saved reference and saw `Reference saved privately by default.`
- Reload after create kept the production D1 record visible.
- Edited the record to:
  - title: `Round 4 Production Edit 20260618`
  - asset category: `UI/HUD`
  - license status: `source link only`
- Saw `Reference changes saved.`
- Reload after edit kept the updated title, category, and license visible.
- App-owned delete confirmation appeared with `Cancel`, confirm `Delete reference`, and the record title in the confirmation copy.
- Confirm delete showed `Reference deleted.`
- Reload after delete removed `Round 4 Production Edit 20260618` and restored the starter examples fallback.

Browser automation note:

- The in-app browser control channel still intermittently timed out during coordinate actions, reloads, and screenshots.
- Each timed-out action was followed by a fresh authenticated browser-state check before proceeding.

## Issues Found

- No local automated, build, or browser QA blocker remains.
- Production deployment succeeded.
- Authenticated production CRUD passed on Sites version 5.

