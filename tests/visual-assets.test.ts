import { readFileSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";

const asset = new URL("../public/art/workbench-graphite.webp", import.meta.url);

describe("Round 14 visual assets", () => {
  it("ships an optimized WebP workstation texture", () => {
    expect(readFileSync(asset).subarray(8, 12).toString("ascii")).toBe("WEBP");
    expect(statSync(asset).size).toBeLessThanOrEqual(300 * 1024);
  });
});
