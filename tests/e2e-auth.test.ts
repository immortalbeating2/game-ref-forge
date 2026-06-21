import { describe, expect, it } from "vitest";
import {
  E2E_TOKEN_HEADER,
  requireValidE2eToken,
  validateE2eToken,
} from "../lib/e2e-auth";

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

describe("requireValidE2eToken", () => {
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
});
