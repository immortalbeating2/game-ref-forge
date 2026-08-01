import { readFileSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  REFERENCE_ART_BY_CATEGORY,
  referenceArtFor,
} from "../lib/reference-art";

const asset = new URL("../public/art/workbench-graphite.webp", import.meta.url);
const stylesheet = new URL("../app/globals.css", import.meta.url);

describe("Round 14-15 visual assets", () => {
  it("ships an optimized WebP workstation texture and composes it below the light field", () => {
    expect(readFileSync(asset).subarray(8, 12).toString("ascii")).toBe("WEBP");
    expect(statSync(asset).size).toBeLessThanOrEqual(300 * 1024);

    const css = readFileSync(stylesheet, "utf8");
    expect(css).toMatch(
      /body\s*\{[\s\S]*background-image:\s*radial-gradient\([\s\S]*url\("\/art\/workbench-graphite\.webp"\)/,
    );
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

  it("keeps card preview tracks aligned when body content has different heights", () => {
    const css = readFileSync(stylesheet, "utf8");

    expect(css).toMatch(
      /\.reference-card__select\s*\{[^}]*grid-template-rows:\s*max-content 1fr/,
    );
  });

  it("uses secondary tag visibility to distinguish compact and comfortable density", () => {
    const css = readFileSync(stylesheet, "utf8");

    expect(css).toMatch(
      /\.reference-card--compact \.tag-preview\s*\{[^}]*display:\s*none/,
    );
    expect(css).toMatch(
      /\.reference-card--comfortable \.tag-preview\s*\{[^}]*display:\s*block/,
    );
    expect(css).toMatch(
      /@media \(max-width: 820px\)[\s\S]*\.reference-card--compact \.tag-preview\s*\{[^}]*display:\s*block/,
    );
  });
});

describe("Round 15 reference category art", () => {
  it("ships complete, text-free SVG art within the asset budget", () => {
    const artPaths = [
      ...Object.values(REFERENCE_ART_BY_CATEGORY),
      referenceArtFor("unexpected"),
    ];
    let totalSize = 0;

    for (const artPath of artPaths) {
      const art = new URL(`../public${artPath}`, import.meta.url);
      const source = readFileSync(art, "utf8");
      const size = statSync(art).size;

      expect(source).toContain("<svg");
      expect(source).toContain('viewBox="0 0 1600 900"');
      expect(source).not.toMatch(/<text\b/i);
      expect(size).toBeLessThanOrEqual(120 * 1024);
      totalSize += size;
    }

    expect(totalSize).toBeLessThanOrEqual(700 * 1024);
  });
});
