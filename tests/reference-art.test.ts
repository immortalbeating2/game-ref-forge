import { describe, expect, it } from "vitest";
import { ASSET_CATEGORIES } from "../lib/reference";
import {
  REFERENCE_ART_BY_CATEGORY,
  referenceArtFor,
} from "../lib/reference-art";

describe("reference category art", () => {
  it("maps every asset category to a local SVG", () => {
    expect(Object.keys(REFERENCE_ART_BY_CATEGORY).sort()).toEqual(
      [...ASSET_CATEGORIES].sort(),
    );

    for (const category of ASSET_CATEGORIES) {
      expect(referenceArtFor(category)).toMatch(
        /^\/art\/reference-[a-z-]+\.svg$/,
      );
    }
  });

  it("uses the generic local art for an unexpected runtime value", () => {
    expect(referenceArtFor("unexpected")).toBe(
      "/art/reference-generic.svg",
    );
  });
});
