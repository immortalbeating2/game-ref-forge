import type { RefForgeBackupV1 } from "../../lib/backup";
import type { BackupPreview } from "../../lib/backup-db";

export type DataManagementStatus =
  | "idle"
  | "previewing"
  | "ready"
  | "restoring"
  | "success"
  | "error";

export type DataManagementExportStatus = "idle" | "exporting";

export type DataManagementIssue = {
  path: string;
  message: string;
};

export function getDataManagementDialogLayer(confirmingDiscard: boolean) {
  return confirmingDiscard ? "discard_confirmation" : "dialog";
}

export type DataManagementState = {
  tab: "backup" | "restore";
  includePreferences: boolean;
  restorePreferences: boolean;
  selectedFile: { name: string; size: number } | null;
  parsedBackup: RefForgeBackupV1 | null;
  preview: BackupPreview | null;
  overwriteConfirmed: boolean;
  status: DataManagementStatus;
  errorCode: string | null;
  exportStatus: DataManagementExportStatus;
  exportErrorCode: string | null;
  issues: DataManagementIssue[];
  preferenceResult: "not_requested" | "applied" | "failed";
};

export type DataManagementAction =
  | { type: "open" }
  | { type: "close" }
  | { type: "tab_changed"; tab: DataManagementState["tab"] }
  | { type: "include_preferences_changed"; value: boolean }
  | { type: "file_selection_started" }
  | { type: "file_selected"; file: NonNullable<DataManagementState["selectedFile"]>; backup: RefForgeBackupV1 }
  | { type: "preview_started" }
  | { type: "preview_succeeded"; preview: BackupPreview; noticeCode?: string }
  | { type: "preview_failed"; errorCode: string; issues?: DataManagementIssue[] }
  | { type: "overwrite_confirmation_changed"; value: boolean }
  | { type: "restore_preferences_changed"; value: boolean }
  | { type: "export_started" }
  | { type: "export_finished" }
  | { type: "export_failed"; errorCode: string }
  | { type: "restore_started" }
  | { type: "restore_succeeded"; preferenceResult: DataManagementState["preferenceResult"] }
  | { type: "restore_failed"; errorCode: string };

export function createDataManagementState(): DataManagementState {
  return {
    tab: "backup",
    includePreferences: false,
    restorePreferences: false,
    selectedFile: null,
    parsedBackup: null,
    preview: null,
    overwriteConfirmed: false,
    status: "idle",
    errorCode: null,
    exportStatus: "idle",
    exportErrorCode: null,
    issues: [],
    preferenceResult: "not_requested",
  };
}

function hasOverwrites(preview: BackupPreview) {
  return preview.references.overwrite + preview.syntheses.overwrite > 0;
}

export function canSubmitRestore(state: DataManagementState) {
  if (!state.parsedBackup || !state.preview) return false;
  if (state.status !== "ready" && state.status !== "error") return false;
  return !hasOverwrites(state.preview) || state.overwriteConfirmed;
}

export function dataManagementReducer(
  state: DataManagementState,
  action: DataManagementAction,
): DataManagementState {
  switch (action.type) {
    case "open":
      return createDataManagementState();
    case "close":
      return state.status === "restoring" ? state : createDataManagementState();
    case "tab_changed":
      return { ...state, tab: action.tab };
    case "include_preferences_changed":
      return { ...state, includePreferences: action.value };
    case "file_selection_started":
      return {
        ...state,
        tab: "restore",
        selectedFile: null,
        parsedBackup: null,
        preview: null,
        overwriteConfirmed: false,
        restorePreferences: false,
        status: "idle",
        errorCode: null,
        issues: [],
        preferenceResult: "not_requested",
      };
    case "file_selected":
      return {
        ...state,
        tab: "restore",
        selectedFile: action.file,
        parsedBackup: action.backup,
        preview: null,
        overwriteConfirmed: false,
        restorePreferences: false,
        status: "idle",
        errorCode: null,
        issues: [],
        preferenceResult: "not_requested",
      };
    case "preview_started":
      return state.parsedBackup ? { ...state, status: "previewing", errorCode: null, issues: [] } : state;
    case "preview_succeeded":
      return state.parsedBackup
        ? {
            ...state,
            preview: action.preview,
            status: "ready",
            errorCode: action.noticeCode ?? null,
            issues: [],
          }
        : state;
    case "preview_failed":
      return {
        ...state,
        preview: null,
        status: "error",
        errorCode: action.errorCode,
        issues: (action.issues ?? []).slice(0, 3),
      };
    case "overwrite_confirmation_changed":
      return { ...state, overwriteConfirmed: action.value };
    case "restore_preferences_changed":
      return { ...state, restorePreferences: action.value };
    case "export_started":
      return { ...state, exportStatus: "exporting", exportErrorCode: null };
    case "export_finished":
      return { ...state, exportStatus: "idle", exportErrorCode: null };
    case "export_failed":
      return { ...state, exportStatus: "idle", exportErrorCode: action.errorCode };
    case "restore_started":
      return canSubmitRestore(state) ? { ...state, status: "restoring", errorCode: null } : state;
    case "restore_succeeded":
      return { ...state, status: "success", errorCode: null, preferenceResult: action.preferenceResult };
    case "restore_failed":
      if (action.errorCode === "preview_stale") {
        return {
          ...state,
          preview: null,
          overwriteConfirmed: false,
          status: "error",
          errorCode: action.errorCode,
          issues: [],
        };
      }
      return { ...state, status: "error", errorCode: action.errorCode };
  }
}
