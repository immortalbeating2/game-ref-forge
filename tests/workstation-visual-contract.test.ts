import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(
  new URL("../app/globals.css", import.meta.url),
  "utf8",
);
const page = readFileSync(
  new URL("../app/page.tsx", import.meta.url),
  "utf8",
);

function cssRuleFrom(source: string, selector: string) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return source.match(
    new RegExp(`(?:^|[{}]\\s*)(${escapedSelector}\\s*\\{[^}]*\\})`),
  )?.[1] ?? "";
}

function cssRule(selector: string) {
  return cssRuleFrom(css, selector);
}

function cssGroupedRuleFrom(source: string, selectors: string[]) {
  const escapedSelectors = selectors.map((selector) =>
    selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  );
  return source.match(
    new RegExp(`(?:^|[{}]\\s*)(${escapedSelectors.join("\\s*,\\s*")}\\s*\\{[^}]*\\})`),
  )?.[1] ?? "";
}

function lastMediaBlock(query: string) {
  const start = css.lastIndexOf(`@media (${query})`);
  if (start < 0) return "";
  const end = css.indexOf("@media", start + 1);
  return css.slice(start, end < 0 ? undefined : end);
}

describe("protected-A workstation shell", () => {
  it("defines the protected-A material tokens and visible graphite layers", () => {
    expect(css).toContain("--canvas-graphite: #090d0f");
    expect(css).toContain("--surface-rail: rgba(14, 20, 21, 0.9)");
    expect(css).toMatch(/body[\s\S]*workbench-graphite\.webp/);
    expect(cssRule(".gallery-pane")).toMatch(
      /background:\s*var\(--surface-canvas\)/,
    );
  });

  it("preserves image-wall tracks when the seed set has fewer cards", () => {
    expect(cssRule(".workspace--density-compact .reference-grid")).toMatch(
      /grid-template-columns:\s*repeat\(auto-fill, minmax\(204px, 1fr\)\)/,
    );
    expect(cssRule(".workspace--density-comfortable .reference-grid")).toMatch(
      /grid-template-columns:\s*repeat\(auto-fill, minmax\(272px, 1fr\)\)/,
    );
  });

  it("derives every card preview from its width at a fixed 16:9 ratio", () => {
    const selectRule = cssRule(".reference-card__select");
    const previewRule = cssRule(".reference-card__preview");
    const desktopCases = [
      { viewport: 1480, density: "compact", cardWidth: 205, previewHeight: 115.3125 },
      { viewport: 1600, density: "compact", cardWidth: 235, previewHeight: 132.1875 },
      { viewport: 1480, density: "comfortable", cardWidth: 274, previewHeight: 154.125 },
      { viewport: 1600, density: "comfortable", cardWidth: 314, previewHeight: 176.625 },
    ];

    expect(previewRule).toMatch(/aspect-ratio:\s*16\s*\/\s*9/);
    expect(selectRule).toMatch(/align-content:\s*start/);
    expect(selectRule).toMatch(
      /grid-template-rows:\s*auto minmax\(0,\s*1fr\)/,
    );
    expect(selectRule).not.toMatch(/overflow:\s*hidden/);
    expect(cssRule(".card-body")).not.toMatch(/overflow:\s*hidden/);
    expect(cssRule(".reference-card--compact")).not.toMatch(/(?:^|[;{])\s*height:/);
    expect(cssRule(".reference-card--comfortable")).not.toMatch(/(?:^|[;{])\s*height:/);
    for (const desktopCase of desktopCases) {
      expect(desktopCase.cardWidth * 9 / 16).toBe(desktopCase.previewHeight);
    }
  });

  it("reserves two title lines without clipping the natural card body", () => {
    expect(cssRule(".reference-card__title")).toMatch(/-webkit-line-clamp:\s*2/);
    expect(cssRule(".reference-card__title")).toMatch(/overflow-wrap:\s*anywhere/);
    expect(cssRule(".card-meta > span:last-child")).toMatch(/overflow-wrap:\s*anywhere/);
  });

  it("uses the center-first desktop tracks", () => {
    expect(css).toMatch(
      /grid-template-columns:[^;]*--workspace-left-width[^;]*--workspace-right-width/,
    );
    expect(css).toMatch(/@media \(min-width: 1281px\)/);
  });

  it("keeps the graphite and light layers visible in the mobile stack", () => {
    const mobileRules = css.slice(css.indexOf("@media (max-width: 820px)"));

    expect(mobileRules).toMatch(
      /body\s*\{[\s\S]*background-image:\s*radial-gradient\([\s\S]*url\("\/art\/workbench-graphite\.webp"\)/,
    );
  });

  it("keeps recovered responsive panels on the compact shell padding", () => {
    const responsiveStart = css.indexOf("@media (max-width: 1280px)");
    const responsiveRules = css.slice(
      responsiveStart,
      css.indexOf("@media", responsiveStart + 1),
    );

    expect(responsiveRules).toMatch(
      /\.workspace--left-collapsed \.sidebar,[\s\S]*\.workspace--right-collapsed \.detail-panel[\s\S]*padding:\s*16px/,
    );
  });

  it("names the three continuous workstation surfaces without changing landmarks", () => {
    expect(page).toContain('<aside className="sidebar research-rail"');
    expect(page).toContain('<section className="gallery-pane reference-canvas"');
    expect(page).toContain('<aside className="detail-panel reference-inspector"');
    expect(page.match(/<WorkspaceSeparator/g)).toHaveLength(2);
  });

  it("overrides legacy detail cards with one continuous inspector surface", () => {
    const continuousRow = cssRule(
      ".detail-panel .reference-detail > :where(.detail-section)",
    );

    expect(continuousRow).toMatch(/border:\s*0/);
    expect(continuousRow).toMatch(/border-radius:\s*0/);
    expect(continuousRow).toMatch(/background:\s*transparent/);
    expect(continuousRow).toMatch(/padding:\s*0/);
    expect(continuousRow).toMatch(/gap:\s*0/);
    expect(cssRule(".detail-section + .detail-section")).toMatch(
      /border-top:\s*1px solid var\(--line-subtle\)/,
    );
    expect(cssRule(".reference-inspector .detail-section--fixed")).not.toMatch(
      /background:/,
    );
    expect(cssRule(".detail-section--fixed")).not.toMatch(/background:/);
  });

  it("unifies secondary workflows with the protected-A material layers", () => {
    expect(cssRule(".reference-form")).toMatch(
      /background:\s*var\(--surface-command\)/,
    );
    expect(cssRule(".detail-edit-form")).toMatch(
      /border-bottom:\s*1px solid var\(--line-subtle\)/,
    );
    expect(cssRule(".data-management-dialog")).toMatch(
      /background:\s*var\(--surface-inspector\)/,
    );
    expect(cssRule(".synthesis-workspace")).toMatch(
      /background:\s*var\(--canvas-graphite\)/,
    );
  });

  it("keeps secondary workflow controls touch-safe in the mobile fallback", () => {
    const mobileRules = lastMediaBlock("max-width: 820px");
    const secondaryControls = cssRuleFrom(
      mobileRules,
      ".reference-form button, .detail-edit-form button, .data-management-dialog button, .data-management-file-picker",
    );

    expect(secondaryControls).toMatch(/min-width:\s*44px/);
    expect(secondaryControls).toMatch(/min-height:\s*44px/);
  });

  it("raises the workspace view switch above its 40px base size on mobile", () => {
    const mobileRules = lastMediaBlock("max-width: 820px");
    const effectiveMobileRules = [
      cssRule(".workspace-view-switch button"),
      cssRuleFrom(mobileRules, ".workspace-view-switch button"),
    ].join("\n");

    expect(effectiveMobileRules).toMatch(/min-height:\s*44px/);
  });

  it("keeps the mobile research rail controls at the 44px touch target", () => {
    const mobileRules = lastMediaBlock("max-width: 820px");
    const railControls = cssGroupedRuleFrom(mobileRules, [
      ".language-switcher select",
      ".sidebar select",
      ".sidebar .ghost-button",
    ]);

    expect(railControls).toMatch(/min-height:\s*44px/);
  });

  it("stacks the mobile command rail without a clipped flex-wrap column", () => {
    const mobileRules = css.slice(css.indexOf("@media (max-width: 820px)"));
    const finalMobileRules = lastMediaBlock("max-width: 820px");
    const commandRail = cssGroupedRuleFrom(mobileRules, [
      ".reference-command-rail",
      ".toolbar-actions",
    ]);

    expect(commandRail).toMatch(/flex-direction:\s*column/);
    expect(commandRail).toMatch(/flex-wrap:\s*nowrap/);
    expect(cssRuleFrom(finalMobileRules, ".toolbar-actions")).toMatch(
      /flex:\s*0 0 auto/,
    );
    expect(
      cssGroupedRuleFrom(finalMobileRules, [".search-label", ".sort-label"]),
    ).toMatch(/flex:\s*0 0 auto/);
  });

  it("raises comparison dock icon controls above their 32px base size on mobile", () => {
    const mobileRules = lastMediaBlock("max-width: 820px");
    const selectors = [".comparison-dock__toggle", ".comparison-dock__remove"];
    const effectiveMobileRules = [
      cssGroupedRuleFrom(css, selectors),
      cssGroupedRuleFrom(mobileRules, selectors),
    ].join("\n");

    expect(effectiveMobileRules).toMatch(/(?:^|[\s{;])width:\s*44px/);
    expect(effectiveMobileRules).toMatch(/min-width:\s*44px/);
    expect(effectiveMobileRules).toMatch(/(?:^|[\s{;])height:\s*44px/);
    expect(effectiveMobileRules).toMatch(/min-height:\s*44px/);
  });

  it("keeps dock action buttons at 44px through the narrow mobile cascade", () => {
    const mobileRules = lastMediaBlock("max-width: 820px");
    const effectiveMobileRules = [
      cssRule(".comparison-dock__actions button"),
      cssRuleFrom(mobileRules, ".comparison-dock__actions button"),
    ].join("\n");

    expect(effectiveMobileRules).toMatch(/min-height:\s*44px/);
    expect(css.lastIndexOf("@media (max-width: 820px)")).toBeGreaterThan(
      css.lastIndexOf("@media (max-width: 720px)"),
    );
  });
});
