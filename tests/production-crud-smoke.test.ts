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

  it("classifies application unauthorized responses separately", () => {
    expect(
      classifyFetchFailure({
        status: 401,
        body: '{"error":"e2e token is invalid"}',
      }),
    ).toBe("app-unauthorized");
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
      }),
    ).toEqual({
      ok: true,
      failedSteps: [],
    });
  });

  it("lists failed steps in order", () => {
    expect(
      createRunSummary({
        created: true,
        readAfterCreate: false,
        updated: true,
        metadataSuccess: false,
        metadataFailure: true,
        deleted: true,
        goneAfterDelete: true,
      }),
    ).toEqual({
      ok: false,
      failedSteps: ["readAfterCreate", "metadataSuccess"],
    });
  });
});
