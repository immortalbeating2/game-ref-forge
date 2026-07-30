import { readFileSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";

const asset = new URL("../public/art/workbench-graphite.webp", import.meta.url);
const stylesheet = new URL("../app/globals.css", import.meta.url);

describe("Round 14 visual assets", () => {
  it("ships an optimized WebP workstation texture", () => {
    expect(readFileSync(asset).subarray(8, 12).toString("ascii")).toBe("WEBP");
    expect(statSync(asset).size).toBeLessThanOrEqual(300 * 1024);
  });

  it("forces comfortable card spacing and touch targets on mobile", () => {
    const css = readFileSync(stylesheet, "utf8");
    const mobileRules = css.slice(css.indexOf("@media (max-width: 820px)"));

    expect(mobileRules).toMatch(
      /\.reference-card--compact\s*\{[^}]*min-height:\s*370px/,
    );
    expect(mobileRules).toMatch(
      /\.reference-card--compact \.thumbnail\s*\{[^}]*min-height:\s*142px/,
    );
    expect(mobileRules).toMatch(
      /\.reference-card__pin\s*\{[^}]*min-width:\s*44px[^}]*min-height:\s*44px/,
    );
  });
});
