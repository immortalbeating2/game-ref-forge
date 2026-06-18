# Round 5 Localization QA

Date: 2026-06-18
Branch: `codex/round-5-localization`

## Scope

Chinese-first bilingual interface for RefForge.

## Automated Validation

- `npm test`: passed, 6 files / 25 tests.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm run build`: passed.

## Local Browser Smoke

Target: `http://localhost:3000`

Result:

- Default language is Chinese.
- Sidebar copy, filters, search, add action, card badges, seed fallback message, detail labels, and enum labels render in Chinese.
- Language selector offers `中文` and `English`.
- Switching to English updates the same UI to English without losing references, selection, or visible layout.
- No obvious desktop layout overlap was observed in the in-app browser viewport.

## Notes

- Stored reference data and seed titles remain in their original language.
- Internal enum values and API payloads are unchanged.
- Production deployment remains pending until the branch is merged and saved as a Sites version.
