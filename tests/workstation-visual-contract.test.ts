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
    new RegExp(`(?:^|}\\s*)(${escapedSelector}\\s*\\{[^}]*\\})`),
  )?.[1] ?? "";
}

function cssRule(selector: string) {
  return cssRuleFrom(css, selector);
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

  it("uses the image-wall grid targets for both density modes", () => {
    expect(cssRule(".workspace--density-compact .reference-grid")).toMatch(
      /grid-template-columns:\s*repeat\(auto-fit, minmax\(214px, 1fr\)\)/,
    );
    expect(cssRule(".workspace--density-comfortable .reference-grid")).toMatch(
      /grid-template-columns:\s*repeat\(auto-fit, minmax\(282px, 1fr\)\)/,
    );
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
});
