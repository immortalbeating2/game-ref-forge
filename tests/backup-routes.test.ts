import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BackupPreview } from "../lib/backup-db";
import {
  MAX_BACKUP_REQUEST_BYTES,
  readBoundedJson,
} from "../app/api/backup/request";
import { makeBackupFixture } from "./fixtures/backup";

vi.mock("../lib/backup-db", () => ({
  createFullBackup: vi.fn(),
  previewBackup: vi.fn(),
  restoreBackup: vi.fn(),
}));

import {
  createFullBackup,
  previewBackup,
  restoreBackup,
} from "../lib/backup-db";

type ExportRoute = typeof import("../app/api/backup/route");
type PreviewRoute = typeof import("../app/api/backup/preview/route");
type RestoreRoute = typeof import("../app/api/backup/restore/route");

const preview: BackupPreview = {
  references: { create: 1, overwrite: 1, preserve: 2 },
  syntheses: { create: 0, overwrite: 1, preserve: 1 },
  relations: { restore: 2, historical: 1 },
  contains_preferences: false,
  backup_digest: "backup-digest",
  state_digest: "state-digest",
};

let exportRoute: ExportRoute;
let previewRoute: PreviewRoute;
let restoreRoute: RestoreRoute;

function jsonRequest(body: unknown) {
  return new Request("http://local/api/backup", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function oversizedJsonRequest() {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array(MAX_BACKUP_REQUEST_BYTES + 1));
    },
  });
  return new Request("http://local/api/backup/preview", {
    method: "POST",
    body: stream as unknown as BodyInit,
    duplex: "half",
  } as RequestInit & { duplex: "half" });
}

function streamingRequest(stream: ReadableStream<Uint8Array>) {
  return new Request("http://local/api/backup/preview", {
    method: "POST",
    body: stream as unknown as BodyInit,
    duplex: "half",
  } as RequestInit & { duplex: "half" });
}

beforeEach(async () => {
  vi.resetAllMocks();
  [exportRoute, previewRoute, restoreRoute] = await Promise.all([
    import("../app/api/backup/route"),
    import("../app/api/backup/preview/route"),
    import("../app/api/backup/restore/route"),
  ]);
});

describe("backup API routes", () => {
  it("copies a received request chunk before waiting for the next chunk", async () => {
    const encoder = new TextEncoder();
    const first = encoder.encode('{"title":');
    const second = encoder.encode('"backup"}');
    let releaseSecondChunk: (() => void) | undefined;
    let pullStarted: (() => void) | undefined;
    const pullStartedPromise = new Promise<void>((resolve) => {
      pullStarted = resolve;
    });
    const request = streamingRequest(new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(first);
      },
      pull(controller) {
        pullStarted?.();
        return new Promise<void>((resolve) => {
          releaseSecondChunk = () => {
            controller.enqueue(second);
            controller.close();
            resolve();
          };
        });
      },
    }));
    const set = vi.spyOn(Uint8Array.prototype, "set");

    const resultPromise = readBoundedJson(request);
    await pullStartedPromise;

    expect(set).toHaveBeenCalledWith(first, 0);
    releaseSecondChunk?.();
    await expect(resultPromise).resolves.toEqual({ ok: true, value: { title: "backup" } });
    expect(request.body?.locked).toBe(false);
    set.mockRestore();
  });

  it("reads a valid JSON body delivered in many small chunks", async () => {
    const bytes = new TextEncoder().encode(JSON.stringify({ note: "x".repeat(250_000) }));
    let offset = 0;
    const request = streamingRequest(new ReadableStream<Uint8Array>({
      pull(controller) {
        if (offset === bytes.byteLength) {
          controller.close();
          return;
        }
        const end = Math.min(offset + 5, bytes.byteLength);
        controller.enqueue(bytes.subarray(offset, end));
        offset = end;
      },
    }));

    await expect(readBoundedJson(request)).resolves.toEqual({
      ok: true,
      value: { note: "x".repeat(250_000) },
    });
    expect(request.body?.locked).toBe(false);
  });

  it("cancels and unlocks an oversized request stream", async () => {
    let cancelled = false;
    const request = streamingRequest(new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(MAX_BACKUP_REQUEST_BYTES + 1));
      },
      cancel() {
        cancelled = true;
      },
    }));

    await expect(readBoundedJson(request)).resolves.toEqual({ ok: false, code: "backup_too_large" });
    expect(cancelled).toBe(true);
    expect(request.body?.locked).toBe(false);
  });

  it("exports a complete Backup v1 as a non-cacheable download", async () => {
    const backup = makeBackupFixture();
    vi.mocked(createFullBackup).mockResolvedValue(backup);

    const response = await exportRoute.GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("content-disposition")).toBe(
      "attachment; filename=\"ref-forge-backup-v1-2026-07-27.json\"",
    );
    await expect(response.json()).resolves.toEqual(backup);
  });

  it("does not leak database details when export storage is unavailable", async () => {
    vi.mocked(createFullBackup).mockRejectedValue(new Error("no such table: references; secret=do-not-leak"));

    const response = await exportRoute.GET();
    const body = await response.json() as { code: string; message: string };

    expect(response.status).toBe(503);
    expect(body.code).toBe("database_unavailable");
    expect(body.message).not.toContain("do-not-leak");
  });

  it("previews a valid backup without calling restore", async () => {
    const backup = makeBackupFixture();
    vi.mocked(previewBackup).mockResolvedValue(preview);

    const response = await previewRoute.POST(jsonRequest({ backup }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ preview });
    expect(previewBackup).toHaveBeenCalledWith(backup);
    expect(restoreBackup).not.toHaveBeenCalled();
  });

  it.each([
    ["malformed JSON", new Request("http://local/api/backup/preview", { method: "POST", body: "{" }), "invalid_json", 400],
    ["missing backup", jsonRequest({}), "validation_failed", 400],
    ["unknown backup version", jsonRequest({ backup: { ...makeBackupFixture(), schema_version: 2 } }), "unsupported_version", 400],
    ["invalid backup field", jsonRequest({
      backup: {
        ...makeBackupFixture(),
        data: { ...makeBackupFixture().data, references: [{ ...makeBackupFixture().data.references[0], source_url: "not-a-url" }, makeBackupFixture().data.references[1] ] },
      },
    }), "validation_failed", 400],
  ])("rejects preview %s before accessing the database", async (_case, request, code, status) => {
    const response = await previewRoute.POST(request);

    expect(response.status).toBe(status);
    expect(await response.json()).toMatchObject({ code });
    expect(previewBackup).not.toHaveBeenCalled();
  });

  it("rejects oversized preview bodies from the stream before JSON parsing", async () => {
    const response = await previewRoute.POST(oversizedJsonRequest());

    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toEqual({
      code: "backup_too_large",
      path: "",
      message: "backup request exceeds the 5 MB limit",
    });
    expect(previewBackup).not.toHaveBeenCalled();
  });

  it("rejects preview envelopes with unknown fields", async () => {
    const response = await previewRoute.POST(jsonRequest({ backup: makeBackupFixture(), unexpected: true }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      code: "validation_failed",
      path: "",
      message: "request must be a closed object containing backup",
    });
    expect(previewBackup).not.toHaveBeenCalled();
  });

  it("does not leak database details when preview storage is unavailable", async () => {
    vi.mocked(previewBackup).mockRejectedValue(new Error("D1 binding unavailable: secret=do-not-leak"));

    const response = await previewRoute.POST(jsonRequest({ backup: makeBackupFixture() }));
    const body = await response.json() as { code: string; message: string };

    expect(response.status).toBe(503);
    expect(body.code).toBe("database_unavailable");
    expect(body.message).not.toContain("do-not-leak");
  });

  it("restores only after a parsed closed restore request succeeds", async () => {
    const backup = makeBackupFixture();
    vi.mocked(restoreBackup).mockResolvedValue({ ok: true, preview });

    const response = await restoreRoute.POST(jsonRequest({
      backup,
      backup_digest: preview.backup_digest,
      state_digest: preview.state_digest,
      confirm_overwrite: true,
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ restored: true, preview });
    expect(restoreBackup).toHaveBeenCalledWith({
      backup,
      backup_digest: preview.backup_digest,
      state_digest: preview.state_digest,
      confirm_overwrite: true,
    });
  });

  it.each([
    ["backup changed", "backup_changed"],
    ["preview stale", "preview_stale"],
    ["overwrite confirmation is required", "overwrite_confirmation_required"],
  ] as const)("maps restore %s to conflict", async (_case, code) => {
    vi.mocked(restoreBackup).mockResolvedValue({ ok: false, code });

    const response = await restoreRoute.POST(jsonRequest({
      backup: makeBackupFixture(),
      backup_digest: preview.backup_digest,
      state_digest: preview.state_digest,
      confirm_overwrite: false,
    }));

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({ code, path: "", message: "backup restore conflict" });
  });

  it("maps a rollback-safe restore failure without leaking database details", async () => {
    vi.mocked(restoreBackup).mockResolvedValue({ ok: false, code: "restore_failed" });

    const response = await restoreRoute.POST(jsonRequest({
      backup: makeBackupFixture(),
      backup_digest: preview.backup_digest,
      state_digest: preview.state_digest,
      confirm_overwrite: true,
    }));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      code: "restore_failed",
      path: "",
      message: "backup restore failed",
    });
  });

  it("rejects malformed restore envelopes before calling restore", async () => {
    const response = await restoreRoute.POST(jsonRequest({
      backup: makeBackupFixture(),
      backup_digest: preview.backup_digest,
      state_digest: preview.state_digest,
      confirm_overwrite: "yes",
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      code: "validation_failed",
      path: "confirm_overwrite",
      message: "confirm_overwrite must be a boolean",
    });
    expect(restoreBackup).not.toHaveBeenCalled();
  });

  it("does not leak missing-table errors from restore", async () => {
    vi.mocked(restoreBackup).mockRejectedValue(new Error("no such table: syntheses; secret=do-not-leak"));

    const response = await restoreRoute.POST(jsonRequest({
      backup: makeBackupFixture(),
      backup_digest: preview.backup_digest,
      state_digest: preview.state_digest,
      confirm_overwrite: true,
    }));
    const body = await response.json() as { code: string; message: string };

    expect(response.status).toBe(503);
    expect(body.code).toBe("database_unavailable");
    expect(body.message).not.toContain("do-not-leak");
  });
});
