# 2026-06-21 Production E2E QA Infrastructure

## Scope

第六轮新增长期生产复测基础设施，用来降低浏览器自动化点击不稳定对 CRUD 验证的影响。

## Implemented Checks

- `x-ref-forge-e2e-token` token helper.
- API routes recognize invalid scripted e2e token requests and return `401`.
- Production smoke script:
  - create reference
  - read after create
  - update reference
  - metadata preview success path
  - metadata preview failure path
  - delete reference
  - read after delete
- Sites sign-in interception classification.

## Local Validation

- `npm test`: passed, 8 files / 38 tests.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm run build`: passed.
- `npm run qa:production-crud` without env vars: failed safely with missing configuration message.
- `npm run qa:production-crud` with production URL and dummy token: reported `sites-sign-in`, confirming the script can classify Sites access interception before any write reaches the app.

## Production Readiness

The runner is ready to execute once both conditions are true:

- `REF_FORGE_E2E_TOKEN` is configured in the deployment environment.
- Sites access policy allows the token-bearing request to reach the Worker.

Until then, `sites-sign-in` means access policy blocked the test before application code could evaluate the token.

## Production Attempt

2026-06-21 follow-up:

- Sites version 8 was deployed from commit `ba07ccd7351d7e1065275a968026b7f5ddb90323`.
- `REF_FORGE_E2E_TOKEN` was configured as a Sites secret and applied as environment revision 1.
- Attempting to switch access to `public` failed because internet publishing is disabled for the workspace.
- Access mode remained `custom`, limited to the owner allowlist.
- Running `npm run qa:production-crud` against production still returned `sites-sign-in`.

Interpretation:

- The application-side e2e token support is deployed.
- The command-line production CRUD request still does not reach the Worker under the current Sites access layer.
- Real production CRUD automation remains blocked until the workspace allows public access, provides a header/path allowlist, or a separate QA deployment path is created.

## Risk

- This is a QA infrastructure token, not a user identity system.
- The token must remain outside git.
- If a future Sites access policy cannot route token-bearing requests to the Worker, production smoke must continue through authenticated browser/manual validation or a dedicated verification deployment path.
