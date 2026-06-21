# Production E2E QA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a controlled production CRUD and metadata smoke-test path that can be reused after each Sites deployment.

**Architecture:** Add a small token-checking helper used by mutating API routes, then add a Node-based production QA runner that creates, reads, updates, previews metadata, deletes, and verifies cleanup. The runner classifies Sites sign-in interception separately from application failures.

**Tech Stack:** TypeScript, Next/Vinext app routes, Cloudflare Workers env binding, Vitest, Node 22 fetch.

---

## File Structure

- Create: `lib/e2e-auth.ts`
  - Pure helper for validating the `x-ref-forge-e2e-token` header against an environment secret.
- Modify: `app/api/references/route.ts`
  - Allow `POST` requests with a valid e2e token and return a clear `401` for invalid provided tokens.
- Modify: `app/api/references/[id]/route.ts`
  - Apply the same token check to `PUT` and `DELETE`.
- Modify: `app/api/metadata/preview/route.ts`
  - Apply the same token check to scripted metadata preview requests.
- Create: `scripts/production-crud-smoke.mjs`
  - Production smoke runner with create, read, update, metadata success/failure, delete, and cleanup.
- Create: `tests/e2e-auth.test.ts`
  - Tests token helper behavior.
- Create: `tests/production-crud-smoke.test.ts`
  - Tests script error classification and summary helpers.
- Modify: `package.json`
  - Add `qa:production-crud`.
- Modify: `docs/engineering/deployment.md`
  - Document `REF_FORGE_E2E_TOKEN` and the production smoke command.
- Modify: `docs/qa/2026-06-21-production-e2e-qa.md`
  - Add validation checklist and known Sites access limitation.
- Modify: `docs/progress/status.md`, `docs/progress/timeline.md`, `docs/progress/2026-06-21.md`
  - Record the round-six QA infrastructure work.

## Task 1: Token Helper

**Files:**
- Create: `lib/e2e-auth.ts`
- Test: `tests/e2e-auth.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { E2E_TOKEN_HEADER, validateE2eToken } from "../lib/e2e-auth";

describe("validateE2eToken", () => {
  it("keeps e2e access disabled when no secret is configured", () => {
    const headers = new Headers({ [E2E_TOKEN_HEADER]: "secret" });

    expect(validateE2eToken(headers, undefined)).toEqual({
      provided: true,
      authorized: false,
      reason: "missing-secret",
    });
  });

  it("authorizes the configured token", () => {
    const headers = new Headers({ [E2E_TOKEN_HEADER]: "secret" });

    expect(validateE2eToken(headers, "secret")).toEqual({
      provided: true,
      authorized: true,
      reason: null,
    });
  });

  it("rejects a wrong token without exposing the secret", () => {
    const headers = new Headers({ [E2E_TOKEN_HEADER]: "wrong" });

    expect(validateE2eToken(headers, "secret")).toEqual({
      provided: true,
      authorized: false,
      reason: "invalid-token",
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/e2e-auth.test.ts`

Expected: FAIL because `../lib/e2e-auth` does not exist.

- [ ] **Step 3: Implement the helper**

```ts
export const E2E_TOKEN_HEADER = "x-ref-forge-e2e-token";

export type E2eTokenValidation =
  | { provided: false; authorized: false; reason: "missing-token" }
  | { provided: true; authorized: true; reason: null }
  | {
      provided: true;
      authorized: false;
      reason: "missing-secret" | "invalid-token";
    };

export function validateE2eToken(
  headers: Headers,
  configuredSecret: string | undefined,
): E2eTokenValidation {
  const providedToken = headers.get(E2E_TOKEN_HEADER)?.trim();

  if (!providedToken) {
    return { provided: false, authorized: false, reason: "missing-token" };
  }

  const secret = configuredSecret?.trim();
  if (!secret) {
    return { provided: true, authorized: false, reason: "missing-secret" };
  }

  if (providedToken !== secret) {
    return { provided: true, authorized: false, reason: "invalid-token" };
  }

  return { provided: true, authorized: true, reason: null };
}

export function e2eUnauthorizedResponse(reason: string) {
  return Response.json(
    { error: "e2e token is invalid", reason },
    { status: 401 },
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/e2e-auth.test.ts`

Expected: PASS.

## Task 2: Protect Scripted API Writes

**Files:**
- Modify: `app/api/references/route.ts`
- Modify: `app/api/references/[id]/route.ts`
- Modify: `app/api/metadata/preview/route.ts`
- Test: `tests/e2e-auth.test.ts`

- [ ] **Step 1: Add failing test for request helper**

Add to `tests/e2e-auth.test.ts`:

```ts
import { requireValidE2eToken } from "../lib/e2e-auth";

it("returns null for ordinary browser requests without e2e headers", () => {
  const request = new Request("https://example.com/api/references");

  expect(requireValidE2eToken(request, "secret")).toBeNull();
});

it("returns an unauthorized response for an invalid e2e token", async () => {
  const request = new Request("https://example.com/api/references", {
    headers: { [E2E_TOKEN_HEADER]: "wrong" },
  });

  const response = requireValidE2eToken(request, "secret");

  expect(response?.status).toBe(401);
  await expect(response?.json()).resolves.toEqual({
    error: "e2e token is invalid",
    reason: "invalid-token",
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/e2e-auth.test.ts`

Expected: FAIL because `requireValidE2eToken` does not exist.

- [ ] **Step 3: Implement request helper**

Add to `lib/e2e-auth.ts`:

```ts
export function requireValidE2eToken(
  request: Request,
  configuredSecret: string | undefined,
) {
  const result = validateE2eToken(request.headers, configuredSecret);

  if (!result.provided || result.authorized) {
    return null;
  }

  return e2eUnauthorizedResponse(result.reason);
}
```

- [ ] **Step 4: Wire API routes**

Use `env.REF_FORGE_E2E_TOKEN` in routes before mutating or scripted metadata actions.

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- tests/e2e-auth.test.ts`

Expected: PASS.

## Task 3: Production Smoke Runner

**Files:**
- Create: `scripts/production-crud-smoke.mjs`
- Create: `tests/production-crud-smoke.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Write failing tests for summary/error helpers**

```ts
import { describe, expect, it } from "vitest";
import {
  classifyFetchFailure,
  createRunSummary,
} from "../scripts/production-crud-smoke.mjs";

describe("production CRUD smoke helpers", () => {
  it("classifies Sites sign-in interception", () => {
    expect(
      classifyFetchFailure({
        status: 401,
        body: "Sign in required\nYou're almost in",
      }),
    ).toBe("sites-sign-in");
  });

  it("creates a compact success summary", () => {
    expect(
      createRunSummary({
        created: true,
        readAfterCreate: true,
        updated: true,
        metadataSuccess: true,
        metadataFailure: true,
        deleted: true,
        goneAfterDelete: true,
      }).ok,
    ).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/production-crud-smoke.test.ts`

Expected: FAIL because the script does not exist.

- [ ] **Step 3: Implement script exports and CLI**

Implement:

- `classifyFetchFailure`
- `createRunSummary`
- `runProductionCrudSmoke`
- CLI env validation

- [ ] **Step 4: Add npm script**

Add:

```json
"qa:production-crud": "node scripts/production-crud-smoke.mjs"
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- tests/production-crud-smoke.test.ts`

Expected: PASS.

## Task 4: Documentation and Verification

**Files:**
- Modify: `docs/engineering/deployment.md`
- Create: `docs/qa/2026-06-21-production-e2e-qa.md`
- Modify: `docs/progress/status.md`
- Modify: `docs/progress/timeline.md`
- Create or modify: `docs/progress/2026-06-21.md`

- [ ] **Step 1: Document setup**

Record:

- `REF_FORGE_E2E_TOKEN`
- `REF_FORGE_PRODUCTION_URL`
- command `npm run qa:production-crud`
- Sites sign-in interception limitation

- [ ] **Step 2: Run full verification**

Run:

```bash
npm test
npm run typecheck
npm run lint
npm run build
npm run qa:production-crud
```

Expected:

- First four commands pass.
- The smoke command fails gracefully without env vars, or runs if env vars are configured.

- [ ] **Step 3: Commit**

Commit message:

```bash
git commit -m "feat: 增加生产复测基础设施 / add production QA smoke infrastructure"
```
