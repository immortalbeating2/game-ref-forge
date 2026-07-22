import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("workspace layout interaction source", () => {
  it("keeps resize observation, storage, pointer capture, and blur cleanup in the hook", () => {
    const source = readFileSync(new URL("../app/workspace/use-workspace-layout.ts", import.meta.url), "utf8");
    expect(source).toContain("ResizeObserver");
    expect(source).toContain("WORKSPACE_LAYOUT_STORAGE_KEY");
    expect(source).toContain("setPointerCapture");
    expect(source).toContain("releasePointerCapture");
    expect(source).toContain('window.addEventListener("blur"');
  });

  it("does not mirror workspace preferences into an event ref", () => {
    const source = readFileSync(new URL("../app/workspace/use-workspace-layout.ts", import.meta.url), "utf8");
    expect(source).not.toContain("preferencesRef");
  });

  it("starts pointer resizing from the current resolved panel track", () => {
    const source = readFileSync(new URL("../app/workspace/use-workspace-layout.ts", import.meta.url), "utf8");
    expect(source).toMatch(
      /const beginDrag[\s\S]*?startWidth\s*=\s*side === "left"\s*\?\s*metrics\.leftWidth\s*:\s*metrics\.rightWidth/,
    );
  });

  it("derives keyboard resizing from the functional preference update", () => {
    const source = readFileSync(new URL("../app/workspace/use-workspace-layout.ts", import.meta.url), "utf8");
    expect(source).toMatch(/const handleKeyboard[\s\S]*?setPreferences\(\(current\) => \{/);
    expect(source).toMatch(
      /setPreferences\(\(current\) => \{[\s\S]*?resolveWorkspaceLayout\(current, containerWidth, view\)[\s\S]*?side === "left"\s*\?\s*currentMetrics\.leftWidth\s*:\s*currentMetrics\.rightWidth/,
    );
    expect(source).toMatch(
      /const handleKeyboard[\s\S]*?return resizeWorkspacePanel\(current, side, targetWidth, containerWidth, view\)/,
    );
  });

  it("renders an accessible separator and a real recovery button", () => {
    const source = readFileSync(new URL("../app/workspace/workspace-separator.tsx", import.meta.url), "utf8");
    expect(source).toContain('role="separator"');
    expect(source).toContain('aria-orientation="vertical"');
    expect(source).toContain("aria-valuemin");
    expect(source).toContain("aria-valuemax");
    expect(source).toContain("aria-valuenow");
    expect(source).toMatch(/collapsed[\s\S]*<button/);
  });

  it("wires reference and synthesis grid modes without leaking splitters to responsive layouts", () => {
    const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
    const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

    expect(page).toContain("useWorkspaceLayout");
    expect(page).toContain("workspace--references");
    expect(page).toContain("workspace--syntheses");
    expect(page.match(/<WorkspaceSeparator/g)).toHaveLength(2);
    expect(page).toContain("collapseFiltersPanel");
    expect(page).toContain("collapseDetailsPanel");
    expect(css).toContain("var(--workspace-left-width)");
    expect(css).toContain("var(--workspace-right-width)");
    expect(css).toMatch(/@media \(max-width: 1280px\)[\s\S]*\.workspace-separator[\s\S]*display:\s*none/);
    expect(css).toMatch(/@media \(max-width: 820px\)[\s\S]*grid-template-columns:\s*1fr/);
  });

  it("stacks toolbar tracks before they can overflow medium viewports", () => {
    const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

    expect(css).toMatch(
      /@media \(max-width: 1280px\) \{(?:(?!@media)[\s\S])*?\.toolbar\s*\{[\s\S]*?grid-template-columns:\s*1fr;/,
    );
  });
});
