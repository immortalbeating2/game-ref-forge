import { describe, expect, it } from "vitest";

import type { BackupPreview } from "../lib/backup-db";
import { makeBackupFixture } from "./fixtures/backup";
import {
  canSubmitRestore,
  createDataManagementState,
  dataManagementReducer,
} from "../app/data-management/data-management-state";

const preview: BackupPreview = {
  references: { create: 1, overwrite: 0, preserve: 2 },
  syntheses: { create: 1, overwrite: 0, preserve: 0 },
  relations: { restore: 2, historical: 1 },
  contains_preferences: true,
  backup_digest: "backup-digest",
  state_digest: "state-digest",
};

function previewReadyState() {
  const selected = dataManagementReducer(createDataManagementState(), {
    type: "file_selected",
    file: { name: "library.json", size: 1200 },
    backup: makeBackupFixture(),
  });
  const previewing = dataManagementReducer(selected, { type: "preview_started" });
  return dataManagementReducer(previewing, { type: "preview_succeeded", preview });
}

describe("data management state", () => {
  it("resets the selected file and preview when closed", () => {
    const state = dataManagementReducer(previewReadyState(), { type: "close" });

    expect(state.selectedFile).toBeNull();
    expect(state.parsedBackup).toBeNull();
    expect(state.preview).toBeNull();
    expect(state.status).toBe("idle");
  });

  it("invalidates a previous preview and digests when a new file is selected", () => {
    const state = dataManagementReducer(previewReadyState(), {
      type: "file_selected",
      file: { name: "replacement.json", size: 2200 },
      backup: makeBackupFixture(),
    });

    expect(state.selectedFile).toEqual({ name: "replacement.json", size: 2200 });
    expect(state.preview).toBeNull();
    expect(state.status).toBe("idle");
    expect(canSubmitRestore(state)).toBe(false);
  });

  it("disables restore while preview is loading", () => {
    const selected = dataManagementReducer(createDataManagementState(), {
      type: "file_selected",
      file: { name: "library.json", size: 1200 },
      backup: makeBackupFixture(),
    });
    const state = dataManagementReducer(selected, { type: "preview_started" });

    expect(state.status).toBe("previewing");
    expect(canSubmitRestore(state)).toBe(false);
  });

  it("requires overwrite confirmation when the preview would overwrite records", () => {
    const state = previewReadyState();
    const overwritePreview = {
      ...state,
      preview: { ...preview, references: { create: 0, overwrite: 1, preserve: 0 } },
      overwriteConfirmed: false,
    };

    expect(canSubmitRestore(overwritePreview)).toBe(false);
    expect(canSubmitRestore({ ...overwritePreview, overwriteConfirmed: true })).toBe(true);
  });

  it("does not require the overwrite checkbox when the preview has no overwrite", () => {
    expect(canSubmitRestore({ ...previewReadyState(), overwriteConfirmed: false })).toBe(true);
  });

  it("keeps device preference restore disabled by default even when the file contains it", () => {
    expect(previewReadyState().preview?.contains_preferences).toBe(true);
    expect(previewReadyState().restorePreferences).toBe(false);
  });

  it("disables close and duplicate restore while a restore is busy", () => {
    const state = dataManagementReducer(previewReadyState(), { type: "restore_started" });

    expect(state.status).toBe("restoring");
    expect(canSubmitRestore(state)).toBe(false);
    expect(dataManagementReducer(state, { type: "close" })).toBe(state);
    expect(dataManagementReducer(state, { type: "restore_started" })).toBe(state);
  });

  it("keeps the preview and file after a failed restore so it can be retried", () => {
    const state = dataManagementReducer(
      dataManagementReducer(previewReadyState(), { type: "restore_started" }),
      { type: "restore_failed", errorCode: "preview_stale" },
    );

    expect(state.status).toBe("error");
    expect(state.selectedFile).toEqual({ name: "library.json", size: 1200 });
    expect(state.preview).toEqual(preview);
    expect(canSubmitRestore(state)).toBe(true);
  });

  it("keeps a bounded preview issue list separate from its safe error code", () => {
    const state = dataManagementReducer(
      dataManagementReducer(createDataManagementState(), {
        type: "file_selected",
        file: { name: "invalid.json", size: 1200 },
        backup: makeBackupFixture(),
      }),
      {
        type: "preview_failed",
        errorCode: "validation_failed",
        issues: [
          { path: "data.references[0].source_url", message: "source_url must be an absolute URL" },
          { path: "data.references[1].title", message: "title is required" },
          { path: "data.references[2].id", message: "duplicate id" },
          { path: "data.references[3].id", message: "duplicate id" },
        ],
      },
    );

    expect(state.errorCode).toBe("validation_failed");
    expect(state.issues).toHaveLength(3);
    expect(state.issues[0]).toEqual({ path: "data.references[0].source_url", message: "source_url must be an absolute URL" });
  });

  it("records separate research data and device preference outcomes after restore", () => {
    const state = dataManagementReducer(
      dataManagementReducer(previewReadyState(), { type: "restore_started" }),
      { type: "restore_succeeded", preferenceResult: "failed" },
    );

    expect(state.status).toBe("success");
    expect(state.preferenceResult).toBe("failed");
    expect(state.errorCode).toBeNull();
  });
});
