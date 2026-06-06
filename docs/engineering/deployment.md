# Deployment Notes

## Target

Use the Codex App Sites workflow for implementation and deployment.

The app should be built as a Sites-compatible Worker app with:

- Frontend and backend in one project.
- D1 binding named `DB`.
- No R2 binding for v1.

## Hosting Config Direction

Expected first-version hosting intent:

```json
{
  "d1": "DB"
}
```

Confirm the exact `.openai/hosting.json` shape against the current Sites documentation before deployment, because plugin behavior can change.

## Local Validation

Before saving or deploying a Sites version:

- Install dependencies.
- Run type checks.
- Run tests.
- Run the production build.
- Apply or verify D1 migrations.
- Exercise API CRUD locally.
- Check desktop and mobile layouts in the browser.

## Sites Version Flow

Recommended flow:

1. Build locally.
2. Save a Sites version.
3. Review the generated preview/version.
4. Deploy only after the version is verified.

If the user wants review before public production, save a version without deploying.

## Access Notes

The first version is private/review-only by product policy.

Before any public sharing:

- Verify source-policy behavior.
- Verify public-safety filters.
- Keep unknown-license references private.
- Test mainland China accessibility if Cloudflare availability matters for the target users.

## Deployment Risks

- Sites/plugin behavior may change, so verify current plugin docs at implementation time.
- D1 schema migrations need careful review before production changes.
- Metadata preview may be blocked by source websites.
- Public display of media has copyright risk unless license or ownership is clear.

