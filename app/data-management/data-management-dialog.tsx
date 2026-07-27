"use client";

import { DatabaseBackup, Download, Upload, X } from "lucide-react";
import {
  type ChangeEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useId,
  useReducer,
  useRef,
  useState,
} from "react";

import {
  MAX_BACKUP_BYTES,
  canonicalBackupJson,
  createBackupFilename,
  parseRefForgeBackup,
  withBackupPreferences,
  type BackupDevicePreferences,
  type RefForgeBackupV1,
} from "../../lib/backup";
import type { BackupPreview } from "../../lib/backup-db";
import { backupErrorMessage, type Language, uiCopy } from "../../lib/localization";
import {
  getDialogKeyboardAction,
  tryAcquireOperationGuard,
} from "../synthesis/synthesis-workspace-state";
import {
  canSubmitRestore,
  createDataManagementState,
  dataManagementReducer,
  getDataManagementDialogLayer,
  type DataManagementIssue,
} from "./data-management-state";

export type DataManagementDialogProps = {
  open: boolean;
  language: Language;
  devicePreferences: BackupDevicePreferences;
  hasUnsavedDraft: boolean;
  businessMutationBusy: boolean;
  onClose: () => void;
  onRestoreCommitted: (
    preferences: BackupDevicePreferences | null,
  ) => Promise<"applied" | "failed" | "not_requested">;
};

type BackupApiError = { code?: unknown };

const BACKUP_ERROR_CODES = new Set([
  "invalid_json",
  "unsupported_format",
  "unsupported_version",
  "backup_too_large",
  "validation_failed",
  "backup_changed",
  "preview_stale",
  "overwrite_confirmation_required",
  "restore_failed",
  "database_unavailable",
  "backup_operation_failed",
]);

function readErrorCode(value: unknown, fallback: string) {
  if (value && typeof value === "object" && "code" in value) {
    const code = (value as BackupApiError).code;
    if (typeof code === "string") return code;
  }
  return fallback;
}

function errorCodeFromUnknown(error: unknown, fallback: string) {
  return error instanceof Error && BACKUP_ERROR_CODES.has(error.message) ? error.message : fallback;
}

async function readResponseJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function readIssues(value: unknown): DataManagementIssue[] {
  if (!value || typeof value !== "object" || !("issues" in value) || !Array.isArray(value.issues)) return [];
  return value.issues.flatMap((issue) => {
    if (!issue || typeof issue !== "object" || !("path" in issue) || !("message" in issue)) return [];
    return typeof issue.path === "string" && typeof issue.message === "string"
      ? [{ path: issue.path, message: issue.message }]
      : [];
  }).slice(0, 3);
}

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isBackupPreview(value: unknown): value is BackupPreview {
  if (!value || typeof value !== "object") return false;
  const preview = value as Record<string, unknown>;
  const references = preview.references as Record<string, unknown> | undefined;
  const syntheses = preview.syntheses as Record<string, unknown> | undefined;
  const relations = preview.relations as Record<string, unknown> | undefined;
  return Boolean(
    references && syntheses && relations
    && isCount(references.create) && isCount(references.overwrite) && isCount(references.preserve)
    && isCount(syntheses.create) && isCount(syntheses.overwrite) && isCount(syntheses.preserve)
    && isCount(relations.restore) && isCount(relations.historical)
    && typeof preview.contains_preferences === "boolean"
    && typeof preview.backup_digest === "string"
    && typeof preview.state_digest === "string",
  );
}

function statusCopy(
  status: ReturnType<typeof createDataManagementState>["status"],
  errorCode: string | null,
  preferenceResult: ReturnType<typeof createDataManagementState>["preferenceResult"],
  language: Language,
) {
  const copy = uiCopy(language);
  if (errorCode) return backupErrorMessage(errorCode, language);
  if (status === "previewing") return copy.previewingBackup;
  if (status === "restoring") return copy.restoringBackup;
  if (status === "success") {
    return preferenceResult === "failed"
      ? `${copy.restoreSucceeded} ${copy.preferencesRestoreFailed}`
      : preferenceResult === "applied"
        ? `${copy.restoreSucceeded} ${copy.preferencesRestoreApplied}`
        : copy.restoreSucceeded;
  }
  return null;
}

export function DataManagementDialog({
  open,
  language,
  devicePreferences,
  hasUnsavedDraft,
  businessMutationBusy,
  onClose,
  onRestoreCommitted,
}: DataManagementDialogProps) {
  const copy = uiCopy(language);
  const [state, dispatch] = useReducer(dataManagementReducer, undefined, createDataManagementState);
  const [confirmDiscardDraft, setConfirmDiscardDraft] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const statusRef = useRef<HTMLParagraphElement>(null);
  const discardDialogRef = useRef<HTMLDivElement>(null);
  const discardRestoreRef = useRef<HTMLButtonElement>(null);
  const backupTabRef = useRef<HTMLButtonElement>(null);
  const restoreTabRef = useRef<HTMLButtonElement>(null);
  const restoreGuard = useRef(false);
  const exportGuard = useRef(false);
  const fileReadToken = useRef(0);
  const previewToken = useRef(0);
  const exportToken = useRef(0);
  const restoreToken = useRef(0);
  const previewAbort = useRef<AbortController | null>(null);
  const exportAbort = useRef<AbortController | null>(null);
  const titleId = useId();
  const statusId = useId();
  const backupTabId = useId();
  const restoreTabId = useId();
  const backupPanelId = useId();
  const restorePanelId = useId();
  const isRestoring = state.status === "restoring";
  const isPreviewing = state.status === "previewing";
  const isExporting = state.exportStatus === "exporting";
  const isBusy = isRestoring || isPreviewing || isExporting || businessMutationBusy;
  const isFileSelectionBlocked = isRestoring || isExporting || businessMutationBusy;
  const activeDialogLayer = getDataManagementDialogLayer(confirmDiscardDraft);
  const message = state.exportErrorCode
    ? backupErrorMessage(state.exportErrorCode, language)
    : state.exportStatus === "exporting"
      ? copy.exportingBackup
      : statusCopy(state.status, state.errorCode, state.preferenceResult, language);

  const invalidateAsyncWork = useCallback(() => {
    fileReadToken.current += 1;
    previewToken.current += 1;
    exportToken.current += 1;
    restoreToken.current += 1;
    previewAbort.current?.abort();
    previewAbort.current = null;
    exportAbort.current?.abort();
    exportAbort.current = null;
    restoreGuard.current = false;
    exportGuard.current = false;
  }, []);

  useEffect(() => {
    invalidateAsyncWork();
    if (!open) {
      dispatch({ type: "close" });
      return;
    }

    dispatch({ type: "open" });
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    titleRef.current?.focus({ preventScroll: true });
    return () => {
      trigger?.focus({ preventScroll: true });
    };
  }, [open, invalidateAsyncWork]);

  useEffect(() => () => invalidateAsyncWork(), [invalidateAsyncWork]);

  useEffect(() => {
    if (state.status !== "success") return;
    statusRef.current?.focus({ preventScroll: true });
  }, [state.status]);

  useEffect(() => {
    if (!confirmDiscardDraft) return;
    const discardTrigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const fallbackTitle = titleRef.current;
    const fallbackStatus = statusRef.current;
    discardRestoreRef.current?.focus({ preventScroll: true });
    return () => {
      window.requestAnimationFrame(() => {
        const triggerIsFocusable = discardTrigger?.isConnected
          && (!(discardTrigger instanceof HTMLButtonElement) || !discardTrigger.disabled);
        if (triggerIsFocusable) {
          discardTrigger.focus({ preventScroll: true });
        } else if (fallbackStatus) {
          fallbackStatus.focus({ preventScroll: true });
        } else {
          fallbackTitle?.focus({ preventScroll: true });
        }
      });
    };
  }, [confirmDiscardDraft]);

  function handleClose() {
    if (isBusy) return;
    invalidateAsyncWork();
    setConfirmDiscardDraft(false);
    onClose();
  }

  function selectTab(tab: "backup" | "restore") {
    dispatch({ type: "tab_changed", tab });
    (tab === "backup" ? backupTabRef.current : restoreTabRef.current)?.focus();
  }

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    let nextTab: "backup" | "restore" | null = null;
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      nextTab = state.tab === "backup" ? "restore" : "backup";
    } else if (event.key === "Home") {
      nextTab = "backup";
    } else if (event.key === "End") {
      nextTab = "restore";
    }
    if (nextTab) {
      event.preventDefault();
      selectTab(nextTab);
    }
  }

  function handleDialogKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const focusableSelector = "button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex='-1'])";
    const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector));
    const activeIndex = focusable.indexOf(document.activeElement as HTMLElement);
    const action = getDialogKeyboardAction(event.key, event.shiftKey, activeIndex, focusable.length);
    if (action?.kind === "cancel") {
      if (!isBusy) {
        event.preventDefault();
        handleClose();
      }
    } else if (action?.kind === "focus") {
      event.preventDefault();
      if (action.index < 0) dialog.focus();
      else focusable[action.index]?.focus();
    }
  }

  function handleDiscardDialogKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    event.stopPropagation();
    const dialog = discardDialogRef.current;
    if (!dialog) return;
    const focusableSelector = "button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex='-1'])";
    const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector));
    const activeIndex = focusable.indexOf(document.activeElement as HTMLElement);
    const action = getDialogKeyboardAction(event.key, event.shiftKey, activeIndex, focusable.length);
    if (action?.kind === "cancel") {
      if (!isBusy) {
        event.preventDefault();
        setConfirmDiscardDraft(false);
      }
    } else if (action?.kind === "focus") {
      event.preventDefault();
      if (action.index < 0) dialog.focus();
      else focusable[action.index]?.focus();
    }
  }

  async function handleBackup() {
    if (isBusy || exportGuard.current) return;
    const token = ++exportToken.current;
    const controller = new AbortController();
    const isCurrentExport = () => exportToken.current === token && !controller.signal.aborted;
    exportGuard.current = true;
    exportAbort.current = controller;
    dispatch({ type: "export_started" });
    try {
      const response = await fetch("/api/backup", { signal: controller.signal });
      const payload = await readResponseJson(response);
      if (!isCurrentExport()) return;
      if (!response.ok) throw new Error(readErrorCode(payload, "backup_operation_failed"));
      const parsed = parseRefForgeBackup(payload);
      if (!parsed.ok) throw new Error("backup_operation_failed");
      const backup = withBackupPreferences(
        parsed.backup,
        state.includePreferences ? devicePreferences : null,
      );
      if (!isCurrentExport()) return;
      const objectUrl = URL.createObjectURL(new Blob([canonicalBackupJson(backup)], { type: "application/json" }));
      try {
        if (!isCurrentExport()) return;
        const download = document.createElement("a");
        download.href = objectUrl;
        download.download = createBackupFilename(backup.exported_at);
        if (!isCurrentExport()) return;
        document.body.append(download);
        if (!isCurrentExport()) {
          download.remove();
          return;
        }
        download.click();
        download.remove();
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
      if (isCurrentExport()) dispatch({ type: "export_finished" });
    } catch (error) {
      if (isCurrentExport()) {
        dispatch({ type: "export_failed", errorCode: errorCodeFromUnknown(error, "backup_operation_failed") });
      }
    } finally {
      if (exportToken.current === token) exportGuard.current = false;
      if (exportToken.current === token) exportAbort.current = null;
    }
  }

  async function previewBackupFile(file: NonNullable<typeof state.selectedFile>, backup: RefForgeBackupV1) {
    const token = ++previewToken.current;
    previewAbort.current?.abort();
    const controller = new AbortController();
    previewAbort.current = controller;
    dispatch({ type: "file_selected", file, backup });
    dispatch({ type: "preview_started" });
    try {
      const response = await fetch("/api/backup/preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ backup }),
        signal: controller.signal,
      });
      const payload = await readResponseJson(response);
      if (previewToken.current !== token) return;
      if (!response.ok) {
        dispatch({
          type: "preview_failed",
          errorCode: readErrorCode(payload, "backup_operation_failed"),
          issues: readIssues(payload),
        });
        return;
      }
      if (!payload || typeof payload !== "object" || !("preview" in payload) || !isBackupPreview(payload.preview)) {
        throw new Error("backup_operation_failed");
      }
      dispatch({ type: "preview_succeeded", preview: payload.preview });
    } catch (error) {
      if (previewToken.current !== token || controller.signal.aborted) return;
      dispatch({ type: "preview_failed", errorCode: errorCodeFromUnknown(error, "backup_operation_failed") });
    } finally {
      if (previewToken.current === token) previewAbort.current = null;
    }
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file || isFileSelectionBlocked) return;
    const token = ++fileReadToken.current;
    previewToken.current += 1;
    previewAbort.current?.abort();
    previewAbort.current = null;
    dispatch({ type: "file_selection_started" });
    if (file.size > MAX_BACKUP_BYTES) {
      if (fileReadToken.current === token) dispatch({ type: "preview_failed", errorCode: "backup_too_large" });
      return;
    }
    try {
      const parsed = parseRefForgeBackup(JSON.parse(await file.text()));
      if (fileReadToken.current !== token) return;
      if (!parsed.ok) {
        dispatch({
          type: "preview_failed",
          errorCode: parsed.issues[0]?.code ?? "validation_failed",
          issues: parsed.issues.map(({ path, message }) => ({ path, message })),
        });
        return;
      }
      await previewBackupFile({ name: file.name, size: file.size }, parsed.backup);
    } catch (error) {
      if (fileReadToken.current === token) {
        dispatch({ type: "preview_failed", errorCode: errorCodeFromUnknown(error, "invalid_json") });
      }
    }
  }

  async function submitRestore() {
    if (businessMutationBusy || isBusy || !canSubmitRestore(state) || !state.parsedBackup || !state.preview || !tryAcquireOperationGuard(restoreGuard)) return;
    const token = ++restoreToken.current;
    const backup = state.parsedBackup;
    const preview = state.preview;
    const file = state.selectedFile;
    dispatch({ type: "restore_started" });
    try {
      const response = await fetch("/api/backup/restore", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          backup,
          backup_digest: preview.backup_digest,
          state_digest: preview.state_digest,
          confirm_overwrite: state.overwriteConfirmed,
        }),
      });
      const payload = await readResponseJson(response);
      if (restoreToken.current !== token) return;
      if (!response.ok) {
        const errorCode = readErrorCode(payload, "backup_operation_failed");
        dispatch({ type: "restore_failed", errorCode });
        if (errorCode === "preview_stale" && file) void previewBackupFile(file, backup);
        return;
      }
      const preferences = state.restorePreferences ? backup.preferences : null;
      let preferenceResult: "applied" | "failed" | "not_requested" = "not_requested";
      try {
        preferenceResult = await onRestoreCommitted(preferences);
      } catch {
        preferenceResult = "failed";
      }
      if (restoreToken.current !== token) return;
      dispatch({ type: "restore_succeeded", preferenceResult });
      setConfirmDiscardDraft(false);
    } catch (error) {
      if (restoreToken.current === token) {
        dispatch({ type: "restore_failed", errorCode: errorCodeFromUnknown(error, "backup_operation_failed") });
      }
    } finally {
      if (restoreToken.current === token) restoreGuard.current = false;
    }
  }

  function handleRestoreRequest() {
    if (businessMutationBusy || isBusy || !canSubmitRestore(state)) return;
    if (hasUnsavedDraft) {
      setConfirmDiscardDraft(true);
      return;
    }
    void submitRestore();
  }

  if (!open) return null;

  return (
    <div className="data-management-overlay">
      <div className="data-management-dialog">
        <div
        ref={dialogRef}
        className="data-management-dialog__background"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={statusId}
        aria-hidden={confirmDiscardDraft || undefined}
        inert={confirmDiscardDraft || undefined}
        tabIndex={-1}
        onKeyDown={activeDialogLayer === "dialog" ? handleDialogKeyDown : undefined}
      >
        <header className="data-management-dialog__header">
          <div>
            <p className="data-management-dialog__eyebrow"><DatabaseBackup aria-hidden="true" size={18} /> {copy.dataManagement}</p>
            <h2 ref={titleRef} id={titleId} tabIndex={-1}>{copy.dataManagement}</h2>
          </div>
          <button type="button" className="ghost-button data-management-dialog__close" onClick={handleClose} disabled={isBusy} aria-label={copy.closeDataManagement}>
            <X aria-hidden="true" size={18} />
          </button>
        </header>

        <div className="data-management-tabs" role="tablist" aria-label={copy.dataManagement}>
          <button ref={backupTabRef} id={backupTabId} type="button" role="tab" aria-selected={state.tab === "backup"} aria-controls={backupPanelId} tabIndex={state.tab === "backup" ? 0 : -1} onClick={() => selectTab("backup")} onKeyDown={handleTabKeyDown} disabled={isFileSelectionBlocked}>
            <Download aria-hidden="true" size={16} /> {copy.backupTab}
          </button>
          <button ref={restoreTabRef} id={restoreTabId} type="button" role="tab" aria-selected={state.tab === "restore"} aria-controls={restorePanelId} tabIndex={state.tab === "restore" ? 0 : -1} onClick={() => selectTab("restore")} onKeyDown={handleTabKeyDown} disabled={isFileSelectionBlocked}>
            <Upload aria-hidden="true" size={16} /> {copy.restoreTab}
          </button>
        </div>

        <p ref={statusRef} id={statusId} tabIndex={-1} className={`data-management-status${state.status === "error" || state.exportErrorCode ? " data-management-status--error" : ""}`} aria-live="polite">
          {message}
        </p>

        {state.issues.length > 0 ? (
          <section className="data-management-issues" aria-label={copy.backupIssues}>
            <h3>{copy.backupIssues}</h3>
            <ul>{state.issues.slice(0, 3).map((issue) => <li key={`${issue.path}:${issue.message}`}><strong>{issue.path}</strong> {issue.message}</li>)}</ul>
          </section>
        ) : null}

        {state.tab === "backup" ? (
          <section id={backupPanelId} role="tabpanel" aria-labelledby={backupTabId} className="data-management-content">
            <label className="data-management-check">
              <input type="checkbox" checked={state.includePreferences} disabled={isBusy} onChange={(event) => dispatch({ type: "include_preferences_changed", value: event.target.checked })} />
              <span>{copy.includeDevicePreferences}</span>
            </label>
            <p className="data-management-note">{copy.transparentJsonWarning}</p>
            <div className="data-management-actions">
              <button type="button" onClick={() => void handleBackup()} disabled={isBusy}>
                <Download aria-hidden="true" size={16} /> {state.exportStatus === "exporting" ? copy.exportingBackup : copy.fullBackup}
              </button>
            </div>
          </section>
        ) : (
          <section id={restorePanelId} role="tabpanel" aria-labelledby={restoreTabId} className="data-management-content">
            <label className="data-management-file-picker">
              <Upload aria-hidden="true" size={16} />
              <span>{state.selectedFile ? copy.changeBackupFile : copy.chooseBackupFile}</span>
              <input type="file" accept=".json,application/json" onChange={(event) => void handleFileChange(event)} disabled={isFileSelectionBlocked} />
            </label>

            {state.selectedFile ? <p className="data-management-file-name"><strong>{copy.backupFileDetails}</strong> {state.selectedFile.name} ({Math.ceil(state.selectedFile.size / 1024)} KB)</p> : null}

            {state.preview ? (
              <>
                <dl className="data-management-summary">
                  <div><dt>{copy.backupReferences}</dt><dd>{copy.backupCreate} {state.preview.references.create} · {copy.backupOverwrite} {state.preview.references.overwrite} · {copy.backupPreserve} {state.preview.references.preserve}</dd></div>
                  <div><dt>{copy.backupSyntheses}</dt><dd>{copy.backupCreate} {state.preview.syntheses.create} · {copy.backupOverwrite} {state.preview.syntheses.overwrite} · {copy.backupPreserve} {state.preview.syntheses.preserve}</dd></div>
                  <div><dt>{copy.backupRelations}</dt><dd>{state.preview.relations.restore}</dd></div>
                  <div><dt>{copy.backupHistoricalSnapshots}</dt><dd>{state.preview.relations.historical}</dd></div>
                  <div><dt>{copy.backupVersion}</dt><dd>v1</dd></div>
                </dl>

                {state.preview.contains_preferences ? (
                  <label className="data-management-check">
                    <input type="checkbox" checked={state.restorePreferences} disabled={isBusy} onChange={(event) => dispatch({ type: "restore_preferences_changed", value: event.target.checked })} />
                    <span>{copy.restoreDevicePreferences}</span>
                  </label>
                ) : null}

                {state.preview.references.overwrite + state.preview.syntheses.overwrite > 0 ? (
                  <label className="data-management-check data-management-check--warning">
                    <input type="checkbox" checked={state.overwriteConfirmed} disabled={isBusy} onChange={(event) => dispatch({ type: "overwrite_confirmation_changed", value: event.target.checked })} />
                    <span>{copy.confirmOverwrite}</span>
                  </label>
                ) : null}
              </>
            ) : null}

            <div className="data-management-actions">
              <button type="button" onClick={handleRestoreRequest} disabled={!canSubmitRestore(state) || isBusy}>
                <Upload aria-hidden="true" size={16} /> {state.status === "error" && state.preview ? copy.retryRestore : copy.restoreBackup}
              </button>
            </div>
          </section>
        )}
        </div>

        {confirmDiscardDraft ? (
          <div ref={discardDialogRef} className="data-management-discard" role="alertdialog" aria-modal="true" aria-labelledby={`${titleId}-discard`} tabIndex={-1} onKeyDown={handleDiscardDialogKeyDown}>
            <h3 id={`${titleId}-discard`}>{copy.unsavedDraftRestoreTitle}</h3>
            <p>{copy.unsavedDraftRestoreBody}</p>
            <div>
              <button type="button" className="ghost-button" onClick={() => setConfirmDiscardDraft(false)} disabled={isBusy}>{copy.cancel}</button>
              <button ref={discardRestoreRef} type="button" className="danger-button" onClick={() => void submitRestore()} disabled={isBusy}>{copy.discardDraftAndRestore}</button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
