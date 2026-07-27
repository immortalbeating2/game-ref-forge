import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const dialogPath = new URL("../app/data-management/data-management-dialog.tsx", import.meta.url);

describe("data management dialog source contracts", () => {
  it("uses approved Lucide icons and accessible dialog controls", () => {
    const source = readFileSync(dialogPath, "utf8");

    expect(source).toMatch(/import\s*\{[\s\S]*DatabaseBackup[\s\S]*Download[\s\S]*Upload[\s\S]*X[\s\S]*\}\s*from\s*["']lucide-react["']/);
    expect(source).toContain('role="dialog"');
    expect(source).toContain('role="tablist"');
    expect(source).toContain('role="tab"');
    expect(source).toContain('aria-live="polite"');
    expect(source).toContain('accept=".json,application/json"');
    expect(source).toContain('type="checkbox"');
  });

  it("uses the three Backup v1 endpoints without rendering the parsed JSON", () => {
    const source = readFileSync(dialogPath, "utf8");

    expect(source).toContain('fetch("/api/backup")');
    expect(source).toContain('fetch("/api/backup/preview"');
    expect(source).toContain('fetch("/api/backup/restore"');
    expect(source).not.toMatch(/JSON\.stringify\(parsedBackup\)/);
    expect(source).toContain("state.issues");
    expect(source).toContain("slice(0, 3)");
  });

  it("keeps restore single-flight and download URLs cleaned up", () => {
    const source = readFileSync(dialogPath, "utf8");

    expect(source).toContain("isRestoring");
    expect(source).toMatch(/onClick=\{handleClose\}[\s\S]{0,120}disabled=\{isRestoring\}/);
    expect(source).toContain("URL.revokeObjectURL");
    expect(source).toContain("tryAcquireOperationGuard");
  });
});
