# Reference Quality Structure QA

Date: 2026-06-18
Branch: `codex/round-5-reference-quality`

## Scope

Validate the fifth-round reference-quality structure:

- Multi-dimensional scores.
- Richer tag axes.
- Structured inspiration entries.
- Quality review status.
- Search coverage and bilingual labels.
- Existing CRUD compatibility.

## Automated Validation

Current branch validation:

- `npm test`: passed, 6 files / 29 tests.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm run build`: passed.

## Local Browser QA

Pending after final local server smoke:

- Create one reference with scores, tag axes, quality status, and structured inspiration.
- Reload and confirm persistence.
- Edit at least one score, one tag, quality status, and one structured inspiration field.
- Reload and confirm edit persistence.
- Search by new tag and structured inspiration text.
- Switch Chinese/English and confirm labels.
- Delete the QA reference and reload to confirm absence.

## Production QA

Pending after Sites deployment:

- Create one production QA reference with the new fields.
- Reload and confirm persistence.
- Edit the new fields.
- Reload and confirm edit persistence.
- Delete the production QA reference.
- Reload and confirm absence.

## Risks / Notes

- Production remains behind authenticated Sites access.
- The in-app browser automation channel may time out; fresh state checks should be used after timeouts.
- The current UI supports multiple structured inspiration entries, but the form remains compact and non-wizard.
