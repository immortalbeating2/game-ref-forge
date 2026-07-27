// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DataManagementDialog, type DataManagementDialogProps } from "../app/data-management/data-management-dialog";
import type { BackupPreview } from "../lib/backup-db";
import { makeBackupFixture } from "./fixtures/backup";

const devicePreferences = {
  pinned_reference_ids: [],
  workspace_layout: {
    version: 1 as const,
    leftWidth: 260,
    rightWidth: 420,
    leftCollapsed: false,
    rightCollapsed: false,
  },
};

function makePreview(create = 1): BackupPreview {
  return {
    references: { create, overwrite: 0, preserve: 0 },
    syntheses: { create: 0, overwrite: 0, preserve: 0 },
    relations: { restore: 0, historical: 0 },
    contains_preferences: false,
    backup_digest: `backup-${create}`,
    state_digest: `state-${create}`,
  };
}

function response(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

function unreadableResponse(status = 500): Response {
  return {
    ok: false,
    status,
    json: async () => { throw new SyntaxError("Unexpected token '<'"); },
  } as unknown as Response;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => { resolve = next; });
  return { promise, resolve };
}

function backupFile(name: string) {
  const file = new File([JSON.stringify(makeBackupFixture())], name, { type: "application/json" });
  Object.defineProperty(file, "text", { value: async () => JSON.stringify(makeBackupFixture()) });
  return file;
}

function props(overrides: Partial<DataManagementDialogProps> = {}): DataManagementDialogProps {
  return {
    open: true,
    language: "en",
    devicePreferences,
    hasUnsavedDraft: false,
    businessMutationBusy: false,
    onClose: vi.fn(),
    onRestoreCommitted: vi.fn(async (): Promise<"not_requested"> => "not_requested"),
    ...overrides,
  };
}

async function chooseBackup(user: ReturnType<typeof userEvent.setup>, file = backupFile("library.json")) {
  await user.click(screen.getByRole("tab", { name: "Restore" }));
  const input = document.querySelector<HTMLInputElement>('input[type="file"]');
  if (!input) throw new Error("backup file input is missing");
  await user.upload(input, file);
}

function summaryValue(create: number) {
  return screen.getByText((_, element) => (
    element?.tagName === "DD" && element.textContent?.includes(`Create ${create}`) === true
  ));
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("DataManagementDialog interactions", () => {
  it("ignores deferred preview A after replacement B wins", async () => {
    const user = userEvent.setup();
    const previewA = deferred<Response>();
    const previewB = deferred<Response>();
    const fetchMock = vi.fn()
      .mockReturnValueOnce(previewA.promise)
      .mockReturnValueOnce(previewB.promise);
    vi.stubGlobal("fetch", fetchMock);
    render(<DataManagementDialog {...props()} />);

    await chooseBackup(user, backupFile("a.json"));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await chooseBackup(user, backupFile("b.json"));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    previewB.resolve(response({ preview: makePreview(2) }));
    await waitFor(() => expect(summaryValue(2)).toBeTruthy());
    previewA.resolve(response({ preview: makePreview(1) }));

    await waitFor(() => expect(summaryValue(2)).toBeTruthy());
  });

  it("invalidates a late preview when the dialog closes and reopens", async () => {
    const user = userEvent.setup();
    const preview = deferred<Response>();
    vi.stubGlobal("fetch", vi.fn(() => preview.promise));
    const view = render(<DataManagementDialog {...props()} />);

    await chooseBackup(user);
    view.rerender(<DataManagementDialog {...props({ open: false })} />);
    view.rerender(<DataManagementDialog {...props({ open: true })} />);
    preview.resolve(response({ preview: makePreview(7) }));

    await waitFor(() => expect(screen.queryByText(/Create 7/)).toBeNull());
  });

  it("keeps export single-flight and does not replace an active restore preview", async () => {
    const user = userEvent.setup();
    const exportRequest = deferred<Response>();
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const fetchMock = vi.fn()
      .mockReturnValueOnce(exportRequest.promise)
      .mockResolvedValueOnce(response({ preview: makePreview(9) }));
    vi.stubGlobal("fetch", fetchMock);
    render(<DataManagementDialog {...props()} />);

    await user.dblClick(screen.getByRole("button", { name: "Export full backup" }));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await chooseBackup(user);
    await waitFor(() => expect(summaryValue(9)).toBeTruthy());
    exportRequest.resolve(response(makeBackupFixture()));
    await waitFor(() => expect(summaryValue(9)).toBeTruthy());
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("clears stale digests and automatically previews the retained parsed file again", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({ preview: makePreview(1) }))
      .mockResolvedValueOnce(response({ code: "preview_stale" }, 409))
      .mockResolvedValueOnce(response({ preview: makePreview(3) }));
    vi.stubGlobal("fetch", fetchMock);
    render(<DataManagementDialog {...props()} />);

    await chooseBackup(user);
    await waitFor(() => expect(summaryValue(1)).toBeTruthy());
    await user.click(screen.getByRole("button", { name: "Restore data" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    await waitFor(() => expect(summaryValue(3)).toBeTruthy());
    expect(screen.getByRole("button", { name: "Restore data" })).toBeTruthy();
  });

  it("locks both dirty-confirmation actions when business work becomes busy and restores focus after success", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({ preview: makePreview(1) }))
      .mockResolvedValueOnce(response({ restored: true }));
    vi.stubGlobal("fetch", fetchMock);
    const initial = props({ hasUnsavedDraft: true });
    const view = render(<DataManagementDialog {...initial} />);

    await chooseBackup(user);
    await waitFor(() => expect(summaryValue(1)).toBeTruthy());
    await user.click(screen.getByRole("button", { name: "Restore data" }));
    const confirmation = await screen.findByRole("alertdialog");
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Discard draft and restore" }));

    view.rerender(<DataManagementDialog {...props({ hasUnsavedDraft: true, businessMutationBusy: true })} />);
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveProperty("disabled", true);
    expect(screen.getByRole("button", { name: "Discard draft and restore" })).toHaveProperty("disabled", true);
    expect(confirmation).toBeTruthy();

    view.rerender(<DataManagementDialog {...initial} />);
    await user.click(screen.getByRole("button", { name: "Discard draft and restore" }));
    await screen.findByText("Research data restored.");
    expect(document.activeElement).toBe(screen.getByText("Research data restored."));
  });

  it("traps focus in the dirty alertdialog and restores it after Escape", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(response({ preview: makePreview(1) }))));
    render(<DataManagementDialog {...props({ hasUnsavedDraft: true })} />);

    await chooseBackup(user);
    await waitFor(() => expect(summaryValue(1)).toBeTruthy());
    const restoreButton = screen.getByRole("button", { name: "Restore data" });
    await user.click(restoreButton);
    await screen.findByRole("alertdialog");
    const background = document.querySelector<HTMLElement>(".data-management-dialog__background");
    expect(background?.getAttribute("aria-hidden")).toBe("true");
    expect(background?.hasAttribute("inert")).toBe(true);
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Discard draft and restore" }));

    await user.keyboard("{Tab}");
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Cancel" }));
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(restoreButton));
  });

  it("uses roving tabs and closes with Escape from the active dialog layer", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<DataManagementDialog {...props({ onClose })} />);

    const backupTab = screen.getByRole("tab", { name: "Backup" });
    const restoreTab = screen.getByRole("tab", { name: "Restore" });
    backupTab.focus();
    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(restoreTab);
    expect(restoreTab.getAttribute("aria-selected")).toBe("true");
    await user.keyboard("{Home}");
    expect(document.activeElement).toBe(backupTab);
    expect(backupTab.getAttribute("tabindex")).toBe("0");

    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("uses a safe endpoint fallback when an export response is not JSON", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(unreadableResponse())));
    render(<DataManagementDialog {...props()} />);

    await user.click(screen.getByRole("button", { name: "Export full backup" }));
    await screen.findByText("The backup operation did not complete. Try again shortly.");
  });
});
