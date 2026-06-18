# Round 5 Localization Implementation Plan

Date: 2026-06-18
Branch: `codex/round-5-localization`

## Objective

Implement Chinese-first bilingual UI for RefForge without changing persistence, API contracts, or internal enum values.

## Tasks

1. Add localization helpers.
   - Create a small typed locale module.
   - Define supported languages: `zh`, `en`.
   - Provide label helpers for enums and common UI copy.
   - Add tests for Chinese default copy and English fallback copy.

2. Localize interaction-state copy.
   - Metadata preview messages.
   - Delete confirmation copy.
   - Starter examples message.
   - Keep existing states and behavior.

3. Wire language state into the workspace.
   - Default to `zh`.
   - Add a sidebar language switcher.
   - Replace visible hard-coded workspace copy with localized strings.
   - Replace enum display labels with localized labels.

4. Validate behavior.
   - Run automated tests.
   - Run typecheck, lint, and build.
   - Smoke-check the local UI for Chinese default, English switch, and no obvious layout regression.

5. Update trace documents.
   - `docs/progress/status.md`
   - `docs/progress/timeline.md`
   - `docs/progress/2026-06-18.md`
   - Add or update QA notes if browser validation is run.

## Verification Commands

```powershell
npm test
npm run typecheck
npm run lint
npm run build
```

## Risks

- `app/page.tsx` is large, so broad copy replacement can accidentally touch behavior.
- Chinese labels are longer in some controls; layout needs a visual smoke check.
- Tests should assert helpers rather than brittle full-page text.
