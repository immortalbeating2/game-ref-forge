import { describe, expect, it } from "vitest";
import {
  DEFAULT_WORKSPACE_VIEW_PREFERENCES,
  parseWorkspaceViewPreferences,
  serializeWorkspaceViewPreferences,
} from "../lib/workspace-view-preferences";

describe("workspace view preferences", () => {
  it("defaults to compact density", () => {
    expect(parseWorkspaceViewPreferences(null)).toEqual(
      DEFAULT_WORKSPACE_VIEW_PREFERENCES,
    );
  });

  it("round-trips version 1", () => {
    const value = { version: 1 as const, density: "comfortable" as const };

    expect(
      parseWorkspaceViewPreferences(serializeWorkspaceViewPreferences(value)),
    ).toEqual(value);
  });

  it.each([
    "{}",
    "null",
    "{\"version\":2}",
    "{\"version\":1,\"density\":\"dense\"}",
  ])("falls back for invalid input %s", (raw) => {
    expect(parseWorkspaceViewPreferences(raw)).toEqual(
      DEFAULT_WORKSPACE_VIEW_PREFERENCES,
    );
  });
});
