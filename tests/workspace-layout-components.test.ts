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

  it("renders an accessible separator and a real recovery button", () => {
    const source = readFileSync(new URL("../app/workspace/workspace-separator.tsx", import.meta.url), "utf8");
    expect(source).toContain('role="separator"');
    expect(source).toContain('aria-orientation="vertical"');
    expect(source).toContain("aria-valuemin");
    expect(source).toContain("aria-valuemax");
    expect(source).toContain("aria-valuenow");
    expect(source).toMatch(/collapsed[\s\S]*<button/);
  });
});
