import { describe, expect, it } from "vitest";
import {
  parsePinnedReferenceIds,
  serializePinnedReferenceIds,
  togglePinnedReferenceId,
} from "../lib/pinned-references";

describe("pinned reference helpers", () => {
  it("parses a stored id list and drops invalid values", () => {
    expect(parsePinnedReferenceIds(JSON.stringify(["a", "", 7, "b", "a"]))).toEqual([
      "a",
      "b",
    ]);
  });

  it("falls back to an empty list for broken storage data", () => {
    expect(parsePinnedReferenceIds("not-json")).toEqual([]);
  });

  it("serializes unique non-empty ids", () => {
    expect(serializePinnedReferenceIds(["a", "", "b", "a"])).toBe(
      JSON.stringify(["a", "b"]),
    );
  });

  it("toggles ids while preserving order", () => {
    expect(togglePinnedReferenceId(["a"], "b")).toEqual(["a", "b"]);
    expect(togglePinnedReferenceId(["a", "b"], "a")).toEqual(["b"]);
  });
});
