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

  it("is owned once by the page and opened from both workspace views", () => {
    const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");

    expect(page).toContain('import { DataManagementDialog } from "./data-management/data-management-dialog"');
    expect(page.match(/<DataManagementDialog/g)).toHaveLength(1);
    expect(page).toContain("setIsDataManagementOpen(true)");
    expect(page).toContain("onOpenDataManagement={openDataManagement}");
    expect(page).toContain("onWorkspaceStatusChange={setSynthesisWorkspaceStatus}");
    expect(page).toContain("restoreEpoch={restoreEpoch}");
    expect(page).not.toContain("createReferenceJsonExport");
    expect(page).not.toContain("exportLibraryJson");
  });

  it("coordinates dirty and busy gates with restored library and device preferences", () => {
    const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");

    expect(page).toContain("const hasUnsavedDraft");
    expect(page).toContain("const businessMutationBusy");
    expect(page).toContain("reloadReferenceLibrary");
    expect(page).toContain("applyPreferences");
    expect(page).toContain("persistedReferenceIds.has(id)");
    expect(page).toContain("PINNED_REFERENCES_STORAGE_KEY");
    expect(page).toContain('return "failed"');
    expect(page).toContain('return "applied"');
    expect(page).toContain('return "not_requested"');
  });

  it("keeps data-management icons and labels aligned at desktop and mobile widths", () => {
    const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

    expect(css).toMatch(
      /\.data-management-tabs button,[\s\S]*?\.data-management-actions button\s*\{[\s\S]*?display:\s*inline-flex;[\s\S]*?align-items:\s*center;[\s\S]*?justify-content:\s*center;[\s\S]*?gap:\s*6px;/,
    );
  });

  it("uses the three Backup v1 endpoints without rendering the parsed JSON", () => {
    const source = readFileSync(dialogPath, "utf8");

    expect(source).toContain('fetch("/api/backup", { signal: controller.signal })');
    expect(source).toContain('fetch("/api/backup/preview"');
    expect(source).toContain('fetch("/api/backup/restore"');
    expect(source).not.toMatch(/JSON\.stringify\(parsedBackup\)/);
    expect(source).toContain("state.issues");
    expect(source).toContain("slice(0, 3)");
  });

  it("keeps business operations guarded and download URLs cleaned up", () => {
    const source = readFileSync(dialogPath, "utf8");

    expect(source).toContain("isRestoring");
    expect(source).toContain("const isBusy = isRestoring || isPreviewing || isExporting || businessMutationBusy");
    expect(source).toMatch(/onClick=\{handleClose\}[\s\S]{0,120}disabled=\{isBusy\}/);
    expect(source).toContain("exportAbort.current?.abort()");
    expect(source).toContain("URL.revokeObjectURL");
    expect(source).toContain("tryAcquireOperationGuard");
  });

  it("isolates the dirty discard alertdialog from the inert background dialog", () => {
    const source = readFileSync(dialogPath, "utf8");

    expect(source).toContain('aria-hidden={confirmDiscardDraft || undefined}');
    expect(source).toContain('inert={confirmDiscardDraft || undefined}');
    expect(source).toContain("handleDiscardDialogKeyDown");
    expect(source).toContain("discardDialogRef");
    expect(source).toContain("event.stopPropagation()");
    expect(source).toContain("triggerIsFocusable");
  });
});
